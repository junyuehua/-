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
  PHYSICAL_1_ZOOM,
  TIER_REVEAL,
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

/** 分层显隐：返回 0-1 的可见度（淡入区间内线性过渡），0 = 不渲染也不参与聚合 */
function tierFactor(tier: Annotation['tier'], zoom: number): number {
  const reveal = TIER_REVEAL[tier]
  if (!reveal) return 1
  const ratio = zoom / PHYSICAL_1_ZOOM
  return Math.min(1, Math.max(0, (ratio - reveal.start) / (reveal.end - reveal.start)))
}

interface Placed {
  a: Annotation
  /** 锚点屏幕坐标（含 pan/zoom 变换，不含 marker 偏移） */
  sx: number
  sy: number
  /** 分层显隐可见度（透明度乘子） */
  factor: number
}

interface ClusterGroup {
  key: string
  cx: number
  cy: number
  members: Placed[]
  factor: number
}

interface MarkerLayerProps {
  annotations: Annotation[]
  view: ViewState
  size: { w: number; h: number }
  /** 读画/卧游可见；神游整层淡出（交互一并禁用） */
  visible: boolean
  /** 以屏幕点为锚缩放（复用 useViewer 的锚定数学） */
  zoomAtPoint: (ax: number, ay: number, zoom: number, animate: boolean) => void
  /** 上报"悬停/信息卡是否存活"——卧游自动平移的缓停/缓起信号（PRD §3.2） */
  onHoverActiveChange?: (active: boolean) => void
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
  onHoverActiveChange,
}: MarkerLayerProps) {
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

  // —— 投影到屏幕 + 分层显隐过滤 + 视口裁剪 + 聚合 ——
  const { singles, clusters } = useMemo(() => {
    const placed: Placed[] = []
    for (const a of annotations) {
      const factor = tierFactor(a.tier, view.zoom)
      if (factor <= 0.01) continue
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
      placed.push({ a, sx, sy, factor })
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
        best.factor = Math.max(best.factor, p.factor)
      } else {
        groups.push({ key: '', cx: p.sx, cy: p.sy, members: [p], factor: p.factor })
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

  // —— 失效悬停清理（防卧游平移死锁）：被悬停的点位因缩放/分层显隐/并入聚合从 singles 消失，
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

  return (
    <>
      <div className={`${styles.layer} ${visible ? '' : styles.layerHidden}`}>
        {singles.map((p) => {
          const d = (MARKER_SIZE[p.a.tier] ?? MARKER_SIZE.场景) * growth
          const isHovered = hoveredId === p.a.id
          // 悬停态热区加倍（粘性滞回）：卧游缓停期间锚点还会随刹车滑行 ~speed×tau≈16px，
          // 若热区不加大，标记会从静止的光标下滑走→误判 mouseleave→卡片闪退、平移又缓起
          const hitSize = MARKER_HIT_SIZE * growth * (isHovered ? 2 : 1)
          const variant = CIRCLE_VARIANTS[p.a.id % CIRCLE_VARIANTS.length]
          // 墨量浓淡：Knuth 乘法哈希（与 id%3 的笔触选择去相关），multiply 下淡=印得浅
          const inkHash = ((p.a.id * 2654435761) >>> 16) % 1024
          const ink = MARKER_INK_MIN + (MARKER_INK_MAX - MARKER_INK_MIN) * (inkHash / 1023)
          return (
            <div
              key={p.a.id}
              className={styles.hit}
              style={{ left: p.sx, top: p.sy, width: hitSize, height: hitSize }}
              onMouseEnter={() => hoverEnter(p.a.id)}
              onMouseLeave={hoverLeave}
              onPointerDown={stop}
              onPointerUp={stop}
              onClick={(e) => {
                e.stopPropagation()
                zoomToAnchor(p.a)
              }}
            >
              <span
                className={`${styles.circle} ${p.a.tier === '细节' ? styles.circleThick : ''} ${isHovered ? styles.markerHidden : ''}`}
                style={{ height: d, width: d * variant.aspect, opacity: p.factor * ink }}
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
                opacity: g.factor,
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

      {/* 卡片 portal 到 body：独立于画布 stacking context，z 高于顶部 UI（允许压过） */}
      {visible &&
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
              onWheel={stop}
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
