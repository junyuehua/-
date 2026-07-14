import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { InfoCard } from '../components/InfoCard/InfoCard'
import circle1Raw from '../assets/markers/circle-1.svg?raw'
import circle2Raw from '../assets/markers/circle-2.svg?raw'
import circle3Raw from '../assets/markers/circle-3.svg?raw'
import clusterBlob from '../assets/markers/cluster-blob.svg'
import {
  CARD_OFFSET_PX,
  CARD_VIEWPORT_MARGIN_PX,
  CLICK_ZOOM_FACTOR,
  CLUSTER_MARKER_SIZE,
  CLUSTER_NUMERALS,
  CLUSTER_THRESHOLD_PX,
  HOVER_LEAVE_MS,
  MARKER_CULL_MARGIN_PX,
  MARKER_HIT_SIZE,
  MARKER_INK_MAX,
  MARKER_INK_MIN,
  MARKER_OFFSET,
  MARKER_SIZE,
  markerGrowth,
  MAX_ZOOM,
  MOBILE_MARKER_HIT_SIZE,
} from './constants'
import { categoryOf, type Annotation } from './annotations'
import type { ViewState } from './useViewer'
import styles from './MarkerLayer.module.css'

/** 三种手绘朱圈（Figma 标记 106:3698），按点位 id 稳定随机分配，让画面笔触有变化不死板。
    用 ?raw 内联渲染（而非 <img>）：细节小圈需要给笔触路径叠同色描边保证粗度，外链图片无法样式化 */
const CIRCLE_VARIANTS = [
  { raw: circle1Raw, aspect: 21.0105 / 19.8224 },
  { raw: circle2Raw, aspect: 17.8501 / 18.037 },
  { raw: circle3Raw, aspect: 17.2631 / 18.2047 },
]

interface Placed {
  a: Annotation
  /** 锚点屏幕坐标（含 pan/zoom 变换，不含 marker 偏移） */
  sx: number
  sy: number
}

interface ClusterGroup {
  key: string
  cx: number
  cy: number
  members: Placed[]
}

interface MarkerLayerProps {
  annotations: Annotation[]
  view: ViewState
  size: { w: number; h: number }
  /** 读画/卧游可见；神游整层淡出（交互一并禁用） */
  visible: boolean
  /** 以屏幕点为锚缩放（复用 useViewer 的锚定数学） */
  zoomAtPoint: (ax: number, ay: number, zoom: number, animate: boolean) => void
  /** 统一滚轮缩放（useViewer 提供）：悬停卡 portal 到 body、滚轮到不了画布，需由卡自己补调 */
  wheelZoom?: (clientX: number, clientY: number, deltaY: number, deltaMode: number) => void
  /** 上报"悬停/信息卡是否存活"——卧游自动平移的缓停/缓起信号（PRD §3.2） */
  onHoverActiveChange?: (active: boolean) => void
  /**
   * 移动端 tap 模式（移动端规格 §2）：传入即整层切换为触摸交互——
   * tap 标识点 = 直接出居中 modal（由挂载方渲染），不做悬停卡也不做"点击=放大"；
   * 热区基准放大到 44pt；聚合点击行为不变（放大裂散）
   */
  onTapAnnotation?: (a: Annotation) => void
}

/**
 * 标注层：朱笔圈点。必须渲染在 ScrollCanvas 内部（与画面同一 stacking context），
 * mix-blend-multiply 的"进绢"质感才能与下方绢本相乘生效；信息卡通过 portal 渲染到
 * body（独立高 z 层，不参与混合、可压过顶部 UI）。
 */
export function MarkerLayer({
  annotations,
  view,
  size,
  visible,
  zoomAtPoint,
  wheelZoom,
  onHoverActiveChange,
  onTapAnnotation,
}: MarkerLayerProps) {
  const tapMode = onTapAnnotation !== undefined
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const leaveTimer = useRef<number | undefined>(undefined)

  // —— marker 与卡片共享悬停态：进入即取消隐藏计时，离开 280ms 后才判定真正离开（PRD §3.8）——
  const hoverEnter = useCallback((id: number) => {
    window.clearTimeout(leaveTimer.current)
    setHoveredId(id)
  }, [])
  const hoverLeave = useCallback(() => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => setHoveredId(null), HOVER_LEAVE_MS)
  }, [])

  // —— 投影到屏幕 + 视口裁剪 + 聚合 ——
  // 全 tier 任何缩放常显（2026-07-13 拍板，先在移动端验证后推广到桌面，取代原分层显隐门槛）：
  // 密度全交给聚合——聚合标记不指向单个元素、只说"这里有东西"，绕开了旧规则
  // "缩太小元素看不清，圈是多余信息"的隐藏理由；总览时的一串聚合珠正好是内容热力图
  const { singles, clusters } = useMemo(() => {
    const placed: Placed[] = []
    for (const a of annotations) {
      const sx = a.x * view.zoom + view.tx + MARKER_OFFSET.x
      const sy = a.y * view.zoom + view.ty + MARKER_OFFSET.y
      if (
        sx < -MARKER_CULL_MARGIN_PX ||
        sy < -MARKER_CULL_MARGIN_PX ||
        sx > size.w + MARKER_CULL_MARGIN_PX ||
        sy > size.h + MARKER_CULL_MARGIN_PX
      ) {
        continue
      }
      placed.push({ a, sx, sy })
    }

    // 地标层不参与聚合（PRD §3.8）；场景/细节按屏幕像素距离贪心归簇
    const singles: Placed[] = placed.filter((p) => p.a.tier === '地标')
    const rest = placed.filter((p) => p.a.tier !== '地标')
    const groups: ClusterGroup[] = []
    for (const p of rest) {
      let best: ClusterGroup | null = null
      let bestDist = Infinity
      for (const g of groups) {
        const d = Math.hypot(p.sx - g.cx, p.sy - g.cy)
        if (d < CLUSTER_THRESHOLD_PX && d < bestDist) {
          best = g
          bestDist = d
        }
      }
      if (best) {
        best.members.push(p)
        best.cx = best.members.reduce((s, m) => s + m.sx, 0) / best.members.length
        best.cy = best.members.reduce((s, m) => s + m.sy, 0) / best.members.length
      } else {
        groups.push({ key: '', cx: p.sx, cy: p.sy, members: [p] })
      }
    }
    const clusters: ClusterGroup[] = []
    for (const g of groups) {
      if (g.members.length === 1) {
        singles.push(g.members[0])
      } else {
        g.key = g.members.map((m) => m.a.id).join('-')
        clusters.push(g)
      }
    }
    return { singles, clusters }
  }, [annotations, view, size])

  // —— 点击 = 精确凑近锚点（复用画布单击放大的锚定数学，PRD §3.5/§3.8）——
  const zoomToAnchor = useCallback(
    (a: Annotation) => {
      const ax = a.x * view.zoom + view.tx
      const ay = a.y * view.zoom + view.ty
      zoomAtPoint(ax, ay, view.zoom * CLICK_ZOOM_FACTOR, true)
    },
    [view, zoomAtPoint],
  )

  /** 唯一的聚合点击路径：以聚合为中心运镜放大，直到超过裂散阈值自然裂开（PRD §3.8） */
  const zoomIntoCluster = useCallback(
    (g: ClusterGroup) => {
      let maxDist = 0
      for (let i = 0; i < g.members.length; i++) {
        for (let j = i + 1; j < g.members.length; j++) {
          const d = Math.hypot(
            g.members[i].a.x - g.members[j].a.x,
            g.members[i].a.y - g.members[j].a.y,
          )
          if (d > maxDist) maxDist = d
        }
      }
      const needed =
        maxDist === 0 ? view.zoom * CLICK_ZOOM_FACTOR : (CLUSTER_THRESHOLD_PX * 1.25) / maxDist
      const target = Math.min(MAX_ZOOM, Math.max(view.zoom * CLICK_ZOOM_FACTOR, needed))
      zoomAtPoint(g.cx, g.cy, target, true)
    },
    [view.zoom, zoomAtPoint],
  )

  /** UI 元素的事件不冒泡到画布层（PRD §3.5 硬规则）。注意信息卡虽 portal 到 body，
      React 合成事件仍沿组件树冒泡回画布——pointerdown 一旦漏进画布会触发 setPointerCapture
      劫持整个指针序列，click 目标变成画布（链接点不动、还会误触单击放大），所以卡片也必须 stop */
  const stop = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), [])

  const hoveredSingle = hoveredId !== null ? singles.find((p) => p.a.id === hoveredId) : undefined

  // —— 失效悬停清理（防卧游平移死锁）：被悬停的点位因缩放并入聚合从 singles 消失，
  // 或整层隐藏（切神游）时，DOM 卸载不会触发 mouseleave——必须主动清掉悬停态与离开计时器 ——
  useEffect(() => {
    if (hoveredId === null) return
    if (visible && hoveredSingle) return
    window.clearTimeout(leaveTimer.current)
    setHoveredId(null)
  }, [hoveredId, hoveredSingle, visible])

  // —— 上报悬停存活（以 hoveredSingle 是否真实存在为准，而非 hoveredId）：
  // 卧游模式据此缓停/缓起自动平移；"移开→卡片 280ms 缓冲消失→缓起"由 leaveTimer 天然延迟 ——
  const hoverActive = visible && hoveredSingle !== undefined
  useEffect(() => {
    onHoverActiveChange?.(hoverActive)
  }, [hoverActive, onHoverActiveChange])

  // 高倍缩放温和放大（实物 100% 以内 growth=1，即原固定屏幕像素行为）；单圈与聚合统一
  const growth = markerGrowth(view.zoom)

  // —— 卡片摆放：锚点侧向偏移（右侧优先、不够翻左），渲染后按实测尺寸钳制进可视区 ——
  // 垂直钳制：上缘留 12px（必要时允许压过顶部 UI），下缘避开导航栏；侧向偏移保证任何垂直位移都不遮锚点。
  // 锚点"保护区"的精确算法待定（PRD §8）。
  const cardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el || !hoveredSingle) return
    const rect = el.getBoundingClientRect()
    const navH = size.w * 0.044 // 底部导航栏高度（4.4vw）
    let left = hoveredSingle.sx + CARD_OFFSET_PX
    if (left + rect.width + CARD_VIEWPORT_MARGIN_PX > size.w) {
      left = hoveredSingle.sx - CARD_OFFSET_PX - rect.width
    }
    left = Math.max(
      CARD_VIEWPORT_MARGIN_PX,
      Math.min(left, size.w - rect.width - CARD_VIEWPORT_MARGIN_PX),
    )
    let top = hoveredSingle.sy - rect.height / 2
    const maxTop = size.h - navH - CARD_VIEWPORT_MARGIN_PX - rect.height
    top = Math.max(CARD_VIEWPORT_MARGIN_PX, Math.min(top, maxTop))
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }, [hoveredSingle, size])

  // —— 悬停卡上的滚轮也缩放画布（2026-07-13 修"看着卡片滚不动"）——
  // 卡片 portal 到 body、不在画布子树里，滚轮打在卡上到不了画布的 wheel 监听；这里补一个非被动监听：
  // 若卡内有可滚区且本方向还没到头，让它自己滚（长正文）；否则把滚轮转成画布缩放。
  // 用原生监听（非 React onWheel）：React 根上的 wheel 是 passive 的，preventDefault 不生效
  const hoveredCardId = hoveredSingle?.a.id
  useEffect(() => {
    const el = cardRef.current
    if (!el || tapMode || !wheelZoom) return
    const onWheel = (e: WheelEvent) => {
      let node = e.target as HTMLElement | null
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight + 1) {
          const atTop = node.scrollTop <= 0
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1
          if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return // 让卡内正文滚
        }
        node = node.parentElement
      }
      e.preventDefault()
      wheelZoom(e.clientX, e.clientY, e.deltaY, e.deltaMode)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [hoveredCardId, tapMode, wheelZoom])

  return (
    <>
      <div className={`${styles.layer} ${visible ? '' : styles.layerHidden}`}>
        {singles.map((p) => {
          const d = (MARKER_SIZE[p.a.tier] ?? MARKER_SIZE.场景) * growth
          const isHovered = hoveredId === p.a.id
          // 悬停态热区加倍（粘性滞回）：卧游缓停期间锚点还会随刹车滑行 ~speed×tau≈16px，
          // 若热区不加大，标记会从静止的光标下滑走→误判 mouseleave→卡片闪退、平移又缓起
          // tap 模式：基准直接用 44pt（移动端规格 §6），无悬停滞回
          const hitSize = (tapMode ? MOBILE_MARKER_HIT_SIZE : MARKER_HIT_SIZE * (isHovered ? 2 : 1)) * growth
          const variant = CIRCLE_VARIANTS[p.a.id % CIRCLE_VARIANTS.length]
          // 墨量浓淡：Knuth 乘法哈希（与 id%3 的笔触选择去相关），multiply 下淡=印得浅
          const inkHash = ((p.a.id * 2654435761) >>> 16) % 1024
          const ink = MARKER_INK_MIN + (MARKER_INK_MAX - MARKER_INK_MIN) * (inkHash / 1023)
          return (
            <div
              key={p.a.id}
              className={styles.hit}
              style={{ left: p.sx, top: p.sy, width: hitSize, height: hitSize }}
              onMouseEnter={tapMode ? undefined : () => hoverEnter(p.a.id)}
              onMouseLeave={tapMode ? undefined : hoverLeave}
              onPointerDown={stop}
              onPointerUp={stop}
              onClick={(e) => {
                e.stopPropagation()
                if (tapMode) {
                  onTapAnnotation?.(p.a)
                } else {
                  zoomToAnchor(p.a)
                }
              }}
            >
              <span
                className={`${styles.circle} ${p.a.tier === '细节' ? styles.circleThick : ''} ${isHovered ? styles.markerHidden : ''}`}
                style={{ height: d, width: d * variant.aspect, opacity: ink }}
                dangerouslySetInnerHTML={{ __html: variant.raw }}
              />
            </div>
          )
        })}

        {clusters.map((g) => (
          <div
            key={g.key}
            className={`${styles.hit} ${styles.clusterHit}`}
            style={{ left: g.cx, top: g.cy, width: MARKER_HIT_SIZE * growth, height: MARKER_HIT_SIZE * growth }}
            onPointerDown={stop}
            onPointerUp={stop}
            onClick={(e) => {
              e.stopPropagation()
              zoomIntoCluster(g)
            }}
          >
            <span
              className={styles.cluster}
              style={{
                width: CLUSTER_MARKER_SIZE * growth,
                height: CLUSTER_MARKER_SIZE * growth,
              }}
            >
              <img src={clusterBlob} alt="" draggable={false} className={styles.clusterBlob} />
              <span className={styles.clusterCount} style={{ fontSize: 16 * growth }}>
                {g.members.length <= 9 ? CLUSTER_NUMERALS[g.members.length - 1] : '众'}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* 卡片 portal 到 body：独立于画布 stacking context，z 高于顶部 UI（允许压过）；
          tap 模式无悬停卡——信息卡由挂载方以居中 modal 呈现 */}
      {visible &&
        !tapMode &&
        hoveredSingle &&
        createPortal(
          <div className={styles.cardLayer}>
            <div
              ref={cardRef}
              className={styles.card}
              style={{
                left: hoveredSingle.sx + CARD_OFFSET_PX,
                top: Math.max(CARD_VIEWPORT_MARGIN_PX, hoveredSingle.sy - 160),
              }}
              onMouseEnter={() => hoverEnter(hoveredSingle.a.id)}
              onMouseLeave={hoverLeave}
              onClick={stop}
              onPointerDown={stop}
              onPointerUp={stop}
            >
              <InfoCard
                category={categoryOf(hoveredSingle.a)}
                title={hoveredSingle.a.title_zh || '（未命名）'}
              >
                {hoveredSingle.a.body_zh}
              </InfoCard>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
