import { useCallback, useEffect, useRef, useState } from 'react'
import { AppBackground } from './components/AppBackground/AppBackground'
import { IconButton } from './components/IconButton/IconButton'
import { MODE_ORDER, ModeToggle, type ViewMode } from './components/ModeToggle/ModeToggle'
import { NavBar } from './components/NavBar/NavBar'
import { ScaleToast } from './components/ScaleControl/ScaleControl'
import { ScrollIntro } from './components/ScrollIntro/ScrollIntro'
import { SegmentNav } from './components/SegmentNav/SegmentNav'
import { ViewportGate } from './components/ViewportGate/ViewportGate'
import { InfoIIcon, MusicNoteIcon, MusicOffIcon, ViewRealSizeIcon } from './components/icons'
import { Showcase } from './showcase/Showcase'
import annotationsData from '../annotations.json'
import segmentsData from '../segments.json'
import type { Annotation } from './viewer/annotations'
import { segmentAtX, type Segment } from './viewer/segments'
import { MarkerLayer } from './viewer/MarkerLayer'
import { ScrollCanvas } from './viewer/ScrollCanvas'
import { useViewer } from './viewer/useViewer'
import { useAutoPan } from './viewer/useAutoPan'
import {
  CONTENT_H,
  CONTENT_W,
  EDGE_ZONE_BOTTOM_PX,
  EDGE_ZONE_TOP_PX,
  MIN_VIEWPORT_H,
  MIN_VIEWPORT_W,
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

/** 标注数据：用户仍在持续打点，直接改 app/annotations.json 即可热更新 */
const annotations = annotationsData as unknown as Annotation[]

/** 分段主题数据：标题唯一源（PRD §3.11 禁止 UI 硬编码另一份） */
const segments = segmentsData as Segment[]

function Viewer() {
  const [mode, setMode] = useState<ViewMode>('learn')
  const {
    canvasRef,
    view,
    size,
    dragging,
    handlers,
    zoomAtPoint,
    resetToActual,
    jumpToFraction,
    flyToContent,
    panBy,
    isAnimating,
  } = useViewer()

  // 视口清晰度（视口内高清瓦片加载比例），驱动顶部细进度条；指示条视觉为占位方案（ui-backlog #7 同类）
  const [clarity, setClarity] = useState(1)
  const handleClarity = useCallback((ratio: number) => setClarity(ratio), [])

  // —— 卷首（Figma 108:3836）：每次加载默认打开，无持久化；点「展阅」淡出 400ms 后卸载，顶栏可重开 ——
  // 首次进入 = 'first' variant（opaque 底图盖住画作，壳层 UI 全隐藏、音乐不可达）；
  // firstVisit 在首次关闭"开始"时就置 false——壳层在纸页 400ms 淡出期间同步滑入；
  // variant 用 ref 在整个 open→closing 周期内保持不变，莲花底图随纸页一起淡走、平滑露出画作
  const [introState, setIntroState] = useState<'open' | 'closing' | 'closed'>('open')
  const [firstVisit, setFirstVisit] = useState(true)
  const introVariant = useRef<'first' | 'overlay'>('first')
  const introTimer = useRef<number | undefined>(undefined)
  const closeIntro = useCallback(() => {
    setIntroState('closing')
    setFirstVisit(false)
    window.clearTimeout(introTimer.current)
    introTimer.current = window.setTimeout(() => setIntroState('closed'), 400)
  }, [])
  const reopenIntro = useCallback(() => {
    introVariant.current = 'overlay'
    window.clearTimeout(introTimer.current)
    setIntroState('open')
  }, [])

  // —— 背景音乐：默认不播放；首次点击从头播放，再点暂停，下次点击从暂停处续播（循环）——
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [musicOn, setMusicOn] = useState(false)
  const toggleMusic = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/music/bgm.m4a')
      audioRef.current.loop = true
    }
    const audio = audioRef.current
    if (audio.paused) {
      void audio.play()
      setMusicOn(true)
    } else {
      audio.pause()
      setMusicOn(false)
    }
  }, [])
  useEffect(
    () => () => {
      audioRef.current?.pause()
    },
    [],
  )

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

  // —— 卧游/神游共用的自动平移引擎（PRD §3.2）：卷首页打开期间暂停；悬停缓停只在卧游生效（神游无标记）——
  const [hoverActive, setHoverActive] = useState(false)
  useAutoPan({
    enabled: mode !== 'learn' && introState === 'closed',
    panBy,
    isAnimating,
    dragging,
    hoverPaused: hoverActive && mode === 'travel',
  })

  // —— I 键循环切换三模式（PRD §3.7）：window 级监听，神游 UI 全隐时照常生效；卷首页打开时不响应 ——
  const introOpenRef = useRef(true)
  useEffect(() => {
    introOpenRef.current = introState !== 'closed'
  }, [introState])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'i' && e.key !== 'I') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (introOpenRef.current) return
      // 目前页面无输入控件；将来若加输入框需在此排除 e.target
      setMode((m) => MODE_ORDER[(MODE_ORDER.indexOf(m) + 1) % MODE_ORDER.length])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // —— 卧游/神游：壳层 UI 退场；鼠标进入顶部/底部热区唤醒对应 UI（PRD §3.6：热区触发，非任意移动）——
  const [topHover, setTopHover] = useState(false)
  const [bottomHover, setBottomHover] = useState(false)
  useEffect(() => {
    if (mode === 'learn') return
    setTopHover(false)
    setBottomHover(false)
    let topTimer: number | undefined
    let bottomTimer: number | undefined
    // 热区"武装"机制：刚切入卧游/神游时鼠标往往就停在切换按钮所在的热区里，
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

  // 首次进入期间（点过一次「展阅」之前）壳层 UI 全部隐藏（模式/分段导览/音乐/卷首/导航条）；
  // 只有读画壳层常驻；卧游/神游都走边缘热区唤出（2026-07-12 用户拍板：卧游与神游的区别只在标记显不显示）
  const topVisible = (mode === 'learn' || topHover) && !firstVisit
  const bottomVisible = (mode === 'learn' || bottomHover) && !firstVisit

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

  // 当前段实时高亮：视口中心 x 落在哪段（PRD §3.11，随平移逐帧切换）
  const centerContentX = (size.w / 2 - view.tx) / view.zoom
  const activeSegment = segmentAtX(segments, centerContentX)

  // 点某段 = 运镜到该段开头：视口右缘对齐段右界（手卷右起左收，从段首往左读不漏画面）；
  // focal_w 仍决定框多宽（为空兜底框满整段），focal_x 不再用于跳转
  const handleSegmentSelect = useCallback(
    (seg: Segment) => {
      const cw = seg.focal_w ?? seg.x_end - seg.x_start
      flyToContent(seg.x_end - cw / 2, cw)
    },
    [flyToContent],
  )

  // 视口硬门槛（1024×640）：过小即停止渲染画布（瓦片请求随之停止），整屏提示卡；
  // 拉大实时恢复——view 状态在 useViewer 里未卸载，不丢观看位置
  if (size.w < MIN_VIEWPORT_W || size.h < MIN_VIEWPORT_H) {
    return (
      <div>
        <AppBackground />
        <ViewportGate />
      </div>
    )
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
      >
        {/* 标注层在画布内部：与绢本同 stacking context，朱圈的 multiply 混合才生效 */}
        <MarkerLayer
          annotations={annotations}
          view={view}
          size={size}
          visible={mode !== 'immerse'}
          zoomAtPoint={zoomAtPoint}
          onHoverActiveChange={setHoverActive}
        />
      </ScrollCanvas>

      <div
        className={`${styles.clarityBar} ${clarity < 1 && !firstVisit ? styles.clarityBarVisible : ''}`}
        style={{ width: `${clarity * 100}%` }}
      />

      <header className={`${styles.topBar} ${topVisible ? '' : styles.topHidden}`}>
        <ModeToggle value={mode} onChange={setMode} />
        <div className={styles.topCenter}>
          <SegmentNav segments={segments} activeId={activeSegment?.id} onSelect={handleSegmentSelect} />
        </div>
        {/* 语言切换按钮移出 MVP（英文支持下个版本再做）；音乐 off 态用 Google music_off 图标 */}
        <div className={styles.topRight}>
          <IconButton icon={<InfoIIcon />} label="卷首" onClick={reopenIntro} />
          <IconButton
            icon={musicOn ? <MusicNoteIcon /> : <MusicOffIcon />}
            label={musicOn ? '暂停背景音乐' : '播放背景音乐'}
            onClick={toggleMusic}
          />
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

      {/* 卷首：z 最高，wrapper 拦截画布交互；closed 后卸载 */}
      {introState !== 'closed' && (
        <ScrollIntro
          variant={introVariant.current}
          visible={introState === 'open'}
          onClose={closeIntro}
        />
      )}
    </div>
  )
}
