import { useCallback, useEffect, useRef, useState } from 'react'
import { AppBackground } from './components/AppBackground/AppBackground'
import { IconButton } from './components/IconButton/IconButton'
import { InfoModal } from './components/InfoModal/InfoModal'
import { ScrollIntro } from './components/ScrollIntro/ScrollIntro'
import { WidescreenHint } from './components/WidescreenHint/WidescreenHint'
import { SegmentNav } from './components/SegmentNav/SegmentNav'
import { InfoIIcon, MusicNoteIcon, MusicOffIcon } from './components/icons'
import { THEME_COLOR_CANVAS, THEME_COLOR_PAPER } from './platform'
import { useBgm, useIntroState } from './shellHooks'
import annotationsData from '../annotations.json'
import segmentsData from '../segments.json'
import type { Annotation } from './viewer/annotations'
import { segmentAtX, type Segment } from './viewer/segments'
import { MarkerLayer } from './viewer/MarkerLayer'
import { ScrollCanvas } from './viewer/ScrollCanvas'
import { useViewer } from './viewer/useViewer'
import {
  MOBILE_BOTTOM_RESERVE,
  MOBILE_INITIAL_SCALE,
  mobileMinZoom,
  PHYSICAL_1_ZOOM,
} from './viewer/constants'
import styles from './MobileViewer.module.css'

const annotations = annotationsData as unknown as Annotation[]
const segments = segmentsData as Segment[]


/**
 * 移动壳层（移动端规格 md + Figma 218:1545/219:1674，2026-07-13）：
 * - 单模式锁死（= 桌面读画）：标记常驻，无模式切换入口，无卧游/神游/自动平移
 * - 主交互：tap 标识点 → 居中 InfoModal（遮罩变暗、点遮罩或系统返回键关闭）
 * - 寻路只靠底部五段栏（地图导览条/缩放簇/比例 toast 都不上移动端）：
 *   两端遵守画布 padding 24，内容超宽时横向滚动、滚到尽头仍停在 padding 线上
 * - 缩放/平移共用桌面 viewer 引擎：加了双指捏合，tap 空白画布不再放大
 */
export function MobileViewer() {
  const { canvasRef, view, size, dragging, handlers, zoomAtPoint, flyToContent } = useViewer({
    minZoom: mobileMinZoom,
    bottomReserve: MOBILE_BOTTOM_RESERVE,
    clickZoom: false,
    initialZoom: PHYSICAL_1_ZOOM * MOBILE_INITIAL_SCALE,
  })

  const [clarity, setClarity] = useState(1)
  const handleClarity = useCallback((ratio: number) => setClarity(ratio), [])

  const { introState, firstVisit, introVariant, closeIntro, reopenIntro } = useIntroState()
  const { musicOn, toggleMusic } = useBgm()

  // 状态栏随场景换色（theme-color 是唯一旋钮，状态栏不属于视口；两支色与初始预置见 platform.ts）：
  // 卷首可见（open）即纸色；点「展阅/关闭」开始淡出（closing）就切回深棕，与纸页 400ms 淡出方向一致。
  // 只在移动壳层切——桌面卷首是居中纸页、四周仍是深棕底，保持深棕本来就对
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', introState === 'open' ? THEME_COLOR_PAPER : THEME_COLOR_CANVAS)
  }, [introState])

  // tap 出卡（规格 §2：单步、同时只有一张）；卡片打开期间遮罩拦掉画布交互
  const [selected, setSelected] = useState<Annotation | null>(null)
  const closeModal = useCallback(() => setSelected(null), [])

  // 「长卷宜宽屏」提醒（Figma 221:1715）：首次点「展阅」时弹出（重开卷首的「关闭」不触发），
  // 会话内只出一次、无持久化；在卷首 400ms 淡出下方浮现
  const [hintOpen, setHintOpen] = useState(false)
  const closeHint = useCallback(() => setHintOpen(false), [])
  const handleIntroClose = useCallback(() => {
    if (introVariant.current === 'first') setHintOpen(true)
    closeIntro()
  }, [closeIntro, introVariant])

  // 当前段实时高亮（与桌面同一逻辑：视口中心 x 落段）
  const centerContentX = (size.w / 2 - view.tx) / view.zoom
  const activeSegment = segmentAtX(segments, centerContentX)

  // 段间跳转与桌面保持一致（规格 §4）：视口右缘对齐段右界，framing 存宽不存倍数
  const handleSegmentSelect = useCallback(
    (seg: Segment) => {
      const cw = seg.focal_w ?? seg.x_end - seg.x_start
      flyToContent(seg.x_end - cw / 2, cw)
    },
    [flyToContent],
  )

  // 底部五段栏可横向滚动 → 当前段高亮可能在视野外；段切换/转屏时把它带回来（不打断用户
  // 正在滑的手势这一层先不做，段切换频率低）。首帧 instant，之后 smooth；
  // 注意 webfont 迟到会把 tab 撑宽（回退字体下可能根本不溢出）——字体就绪后重校一次初始定位
  const segScrollRef = useRef<HTMLDivElement>(null)
  const segMounted = useRef(false)
  useEffect(() => {
    const scrollActive = (behavior: ScrollBehavior) => {
      const el = segScrollRef.current?.querySelector('[aria-current="true"]')
      el?.scrollIntoView({ behavior, inline: 'nearest', block: 'nearest' })
    }
    scrollActive(segMounted.current ? 'smooth' : 'auto')
    if (!segMounted.current) {
      segMounted.current = true
      document.fonts?.ready.then(() => scrollActive('auto'))
    }
  }, [activeSegment?.id, size.w])

  const shellHidden = firstVisit

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
        <MarkerLayer
          annotations={annotations}
          view={view}
          size={size}
          visible
          zoomAtPoint={zoomAtPoint}
          onTapAnnotation={setSelected}
        />
      </ScrollCanvas>

      <div
        className={`${styles.clarityBar} ${clarity < 1 && !firstVisit ? styles.clarityBarVisible : ''}`}
        style={{ width: `${clarity * 100}%` }}
      />

      {/* 顶部右上角（Figma 219:1674）：音乐 + 卷首重开；顶部其余留给不可点信息（规格 §7） */}
      <div className={`${styles.topButtons} ${shellHidden ? styles.shellHidden : ''}`}>
        <IconButton icon={<InfoIIcon />} label="卷首" onClick={reopenIntro} />
        <IconButton
          icon={musicOn ? <MusicNoteIcon /> : <MusicOffIcon />}
          label={musicOn ? '暂停背景音乐' : '播放背景音乐'}
          onClick={toggleMusic}
        />
      </div>

      {/* 底部五段栏（规格 §4）：两端 padding 24；超宽时 segScroll 横向滚动，
          segInner 的 margin-inline:auto 在内容不超宽时居中（不能用 justify-content:center——
          overflow 下会裁掉起始端滚不回来） */}
      <div
        ref={segScrollRef}
        className={`${styles.segScroll} ${shellHidden ? styles.shellHidden : ''}`}
      >
        <div className={styles.segInner}>
          <SegmentNav segments={segments} activeId={activeSegment?.id} onSelect={handleSegmentSelect} />
        </div>
      </div>

      <InfoModal annotation={selected} onClose={closeModal} />
      <WidescreenHint open={hintOpen} onClose={closeHint} />

      {introState !== 'closed' && (
        <ScrollIntro
          variant={introVariant.current}
          visible={introState === 'open'}
          onClose={handleIntroClose}
        />
      )}
    </div>
  )
}
