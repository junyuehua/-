import { useCallback, useEffect, useRef, useState } from 'react'
import { AppBackground } from './components/AppBackground/AppBackground'
import { IconButton } from './components/IconButton/IconButton'
import { ModeToggle, type ViewMode } from './components/ModeToggle/ModeToggle'
import { NavBar } from './components/NavBar/NavBar'
import { ScaleToast } from './components/ScaleControl/ScaleControl'
import { MusicNoteIcon, TranslateIcon, ViewRealSizeIcon } from './components/icons'
import { Showcase } from './showcase/Showcase'
import { ScrollCanvas } from './viewer/ScrollCanvas'
import { useViewer } from './viewer/useViewer'
import {
  CONTENT_H,
  CONTENT_W,
  EDGE_ZONE_BOTTOM_PX,
  EDGE_ZONE_TOP_PX,
  PHYSICAL_1_ZOOM,
  TOAST_HIDE_MS,
  UI_LEAVE_DELAY_MS,
} from './viewer/constants'
import styles from './App.module.css'

export default function App() {
  if (new URLSearchParams(window.location.search).has('showcase')) {
    return <Showcase />
  }
  return <Viewer />
}

function Viewer() {
  const [mode, setMode] = useState<ViewMode>('learn')
  const { canvasRef, view, size, dragging, handlers, resetToActual, jumpToFraction } = useViewer()

  // 视口清晰度（视口内高清瓦片加载比例），驱动顶部细进度条；指示条视觉为占位方案（ui-backlog #7 同类）
  const [clarity, setClarity] = useState(1)
  const handleClarity = useCallback((ratio: number) => setClarity(ratio), [])

  // —— 比例 toast：缩放变化时出现，停留 TOAST_HIDE_MS 后消失（时长待实测调整）——
  const [toastVisible, setToastVisible] = useState(false)
  const zoomTouched = useRef(false)
  useEffect(() => {
    if (!zoomTouched.current) {
      zoomTouched.current = true
      return
    }
    setToastVisible(true)
    const t = window.setTimeout(() => setToastVisible(false), TOAST_HIDE_MS)
    return () => window.clearTimeout(t)
  }, [view.zoom])

  // —— 沉浸模式：UI 退场；鼠标进入顶部/底部热区唤醒对应 UI（PRD §3.6：热区触发，非任意移动）——
  const [topHover, setTopHover] = useState(false)
  const [bottomHover, setBottomHover] = useState(false)
  useEffect(() => {
    if (mode !== 'immerse') return
    setTopHover(false)
    setBottomHover(false)
    let topTimer: number | undefined
    let bottomTimer: number | undefined
    // 热区"武装"机制：刚切入沉浸模式时鼠标往往就停在切换按钮所在的热区里，
    // 若立即响应会让 UI 马上弹回来、像个 bug——必须先观察到鼠标离开过热区一次，热区才生效
    let topArmed = false
    let bottomArmed = false
    const onMove = (e: MouseEvent) => {
      const inTop = e.clientY <= EDGE_ZONE_TOP_PX
      const inBottom = e.clientY >= window.innerHeight - EDGE_ZONE_BOTTOM_PX
      if (!inTop) topArmed = true
      if (!inBottom) bottomArmed = true
      if (inTop && topArmed) {
        window.clearTimeout(topTimer)
        topTimer = undefined
        setTopHover(true)
      } else if (topTimer === undefined) {
        topTimer = window.setTimeout(() => {
          setTopHover(false)
          topTimer = undefined
        }, UI_LEAVE_DELAY_MS)
      }
      if (inBottom && bottomArmed) {
        window.clearTimeout(bottomTimer)
        bottomTimer = undefined
        setBottomHover(true)
      } else if (bottomTimer === undefined) {
        bottomTimer = window.setTimeout(() => {
          setBottomHover(false)
          bottomTimer = undefined
        }, UI_LEAVE_DELAY_MS)
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.clearTimeout(topTimer)
      window.clearTimeout(bottomTimer)
    }
  }, [mode])

  const topVisible = mode === 'learn' || topHover
  const bottomVisible = mode === 'learn' || bottomHover

  // 实物比例：100% = 画在屏幕上呈现真实物理大小（画高 24.8cm）
  const physicalRatio = view.zoom / PHYSICAL_1_ZOOM
  const percent = Math.round(physicalRatio * 100)
  const isActualSize = Math.abs(physicalRatio - 1) < 0.005
  // 1:1 按钮不常驻：只随比例 toast 一起出现（且当前不是实物 100% 时）；悬停期间保持可见，移开才消失
  const [resetHover, setResetHover] = useState(false)
  const showResetButton = !isActualSize && (toastVisible || resetHover)

  const viewport = {
    x: -view.tx / view.zoom / CONTENT_W,
    y: -view.ty / view.zoom / CONTENT_H,
    w: size.w / view.zoom / CONTENT_W,
    h: size.h / view.zoom / CONTENT_H,
  }

  return (
    <div>
      <AppBackground />
      <ScrollCanvas
        view={view}
        size={size}
        dragging={dragging}
        canvasRef={canvasRef}
        handlers={handlers}
        onClarity={handleClarity}
      />

      <div
        className={`${styles.clarityBar} ${clarity < 1 ? styles.clarityBarVisible : ''}`}
        style={{ width: `${clarity * 100}%` }}
      />

      <header className={`${styles.topBar} ${topVisible ? '' : styles.topHidden}`}>
        <ModeToggle value={mode} onChange={setMode} />
        <div className={styles.topRight}>
          <IconButton icon={<MusicNoteIcon />} label="背景音乐" />
          <IconButton icon={<TranslateIcon />} label="切换语言" />
        </div>
      </header>

      <div
        className={`${styles.scaleCluster} ${bottomVisible ? '' : styles.scaleClusterLow}`}
      >
        <div className={`${styles.fadeItem} ${toastVisible ? styles.fadeVisible : ''}`}>
          <ScaleToast percent={percent} />
        </div>
        <div
          className={`${styles.fadeItem} ${showResetButton ? styles.fadeVisible : ''}`}
          onMouseEnter={() => setResetHover(true)}
          onMouseLeave={() => setResetHover(false)}
        >
          <IconButton icon={<ViewRealSizeIcon />} label="恢复实际大小" onClick={resetToActual} />
        </div>
      </div>

      <div className={`${styles.bottomBar} ${bottomVisible ? '' : styles.bottomHidden}`}>
        <NavBar viewport={viewport} onJump={jumpToFraction} />
      </div>
    </div>
  )
}
