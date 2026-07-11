import { useCallback, useMemo, useRef, useState } from 'react'
import { InfoCard } from '../components/InfoCard/InfoCard'
import { ListCard } from '../components/ListCard/ListCard'
import {
  CARD_OFFSET_PX,
  CLICK_ZOOM_FACTOR,
  CLUSTER_MARKER_SIZE,
  CLUSTER_THRESHOLD_PX,
  HOVER_LEAVE_MS,
  MARKER_CULL_MARGIN_PX,
  MARKER_OFFSET,
  MARKER_SIZE,
  MAX_ZOOM,
} from './constants'
import { CATEGORY_COLOR, categoryOf, type Annotation } from './annotations'
import type { ViewState } from './useViewer'
import styles from './MarkerLayer.module.css'

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

type Hovered = { type: 'marker'; id: number } | { type: 'cluster'; key: string } | null

interface MarkerLayerProps {
  annotations: Annotation[]
  view: ViewState
  size: { w: number; h: number }
  /** 学习模式可见；沉浸模式整层淡出（交互一并禁用） */
  visible: boolean
  /** 以屏幕点为锚缩放（复用 useViewer 的锚定数学） */
  zoomAtPoint: (ax: number, ay: number, zoom: number, animate: boolean) => void
}

const INFO_CARD_W = 280
const LIST_CARD_W = 185

export function MarkerLayer({ annotations, view, size, visible, zoomAtPoint }: MarkerLayerProps) {
  const [hovered, setHovered] = useState<Hovered>(null)
  const leaveTimer = useRef<number | undefined>(undefined)

  // —— marker 与卡片共享悬停态：进入即取消隐藏计时，离开 280ms 后才判定真正离开（PRD §3.8）——
  const hoverEnter = useCallback((h: Exclude<Hovered, null>) => {
    window.clearTimeout(leaveTimer.current)
    setHovered(h)
  }, [])
  const hoverLeave = useCallback(() => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => setHovered(null), HOVER_LEAVE_MS)
  }, [])

  // —— 投影到屏幕 + 视口裁剪 + 聚合 ——
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

  // —— 交互：点击 = 精确凑近锚点（复用画布单击放大的锚定数学，PRD §3.5/§3.8）——
  const zoomToAnchor = useCallback(
    (a: Annotation, targetZoom?: number) => {
      const ax = a.x * view.zoom + view.tx
      const ay = a.y * view.zoom + view.ty
      zoomAtPoint(ax, ay, targetZoom ?? view.zoom * CLICK_ZOOM_FACTOR, true)
    },
    [view, zoomAtPoint],
  )

  /** 聚合列表项点击：目标倍数保证该点会超过拆散阈值独立显示（PRD §3.8） */
  const zoomToClusterMember = useCallback(
    (g: ClusterGroup, m: Placed) => {
      let minDist = Infinity
      for (const other of g.members) {
        if (other.a.id === m.a.id) continue
        const d = Math.hypot(other.a.x - m.a.x, other.a.y - m.a.y)
        if (d < minDist) minDist = d
      }
      const needed = minDist === Infinity ? view.zoom : (CLUSTER_THRESHOLD_PX * 1.3) / minDist
      const target = Math.min(MAX_ZOOM, Math.max(view.zoom * CLICK_ZOOM_FACTOR, needed))
      setHovered(null)
      zoomToAnchor(m.a, target)
    },
    [view.zoom, zoomToAnchor],
  )

  /** 直接点击聚合标记：运镜放大靠近这片区域，直到聚合自然拆开（PRD §3.8） */
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
      const needed = maxDist === 0 ? view.zoom * CLICK_ZOOM_FACTOR : (CLUSTER_THRESHOLD_PX * 1.25) / maxDist
      const target = Math.min(MAX_ZOOM, Math.max(view.zoom * CLICK_ZOOM_FACTOR, needed))
      setHovered(null)
      zoomAtPoint(g.cx, g.cy, target, true)
    },
    [view.zoom, zoomAtPoint],
  )

  // —— 卡片摆放：锚点侧向偏移，屏幕右缘不够就翻到左侧；保护区精确算法待定（PRD §8）——
  const cardPos = (sx: number, sy: number, cardW: number) => {
    const flip = sx + CARD_OFFSET_PX + cardW + 16 > size.w
    return {
      left: flip ? sx - CARD_OFFSET_PX - cardW : sx + CARD_OFFSET_PX,
      top: sy,
    }
  }

  const hoveredSingle =
    hovered?.type === 'marker' ? singles.find((p) => p.a.id === hovered.id) : undefined
  const hoveredCluster =
    hovered?.type === 'cluster' ? clusters.find((g) => g.key === hovered.key) : undefined

  return (
    <div className={`${styles.layer} ${visible ? '' : styles.layerHidden}`}>
      {singles.map((p) => {
        const d = MARKER_SIZE[p.a.tier] ?? MARKER_SIZE.场景
        const isHovered = hovered?.type === 'marker' && hovered.id === p.a.id
        return (
          <div
            key={p.a.id}
            className={styles.hit}
            style={{ left: p.sx, top: p.sy }}
            onMouseEnter={() => hoverEnter({ type: 'marker', id: p.a.id })}
            onMouseLeave={hoverLeave}
            onClick={() => zoomToAnchor(p.a)}
          >
            <span
              className={`${styles.dot} ${isHovered ? styles.dotHidden : ''}`}
              style={{
                width: d,
                height: d,
                backgroundColor: CATEGORY_COLOR[categoryOf(p.a)],
              }}
            />
          </div>
        )
      })}

      {clusters.map((g) => {
        const cats = new Set(g.members.map((m) => categoryOf(m.a)))
        // 聚合标记默认中性纸面色；恰好全员同分类才用分类色（PRD §3.8）
        const fill = cats.size === 1 ? CATEGORY_COLOR[[...cats][0]] : 'var(--paper)'
        const isHovered = hovered?.type === 'cluster' && hovered.key === g.key
        return (
          <div
            key={g.key}
            className={styles.hit}
            style={{ left: g.cx, top: g.cy }}
            onMouseEnter={() => hoverEnter({ type: 'cluster', key: g.key })}
            onMouseLeave={hoverLeave}
            onClick={() => zoomIntoCluster(g)}
          >
            <svg
              className={`${styles.clusterIcon} ${isHovered ? styles.dotHidden : ''}`}
              width={CLUSTER_MARKER_SIZE}
              height={CLUSTER_MARKER_SIZE * (21 / 22)}
              viewBox="0 0 22 21"
            >
              <circle cx="5" cy="16" r="5" fill={fill} />
              <circle cx="17" cy="16" r="5" fill={fill} />
              <circle cx="11" cy="5" r="5" fill={fill} />
            </svg>
          </div>
        )
      })}

      {hoveredSingle && (
        <div
          className={styles.card}
          style={cardPos(hoveredSingle.sx, hoveredSingle.sy, INFO_CARD_W)}
          onMouseEnter={() => hoverEnter({ type: 'marker', id: hoveredSingle.a.id })}
          onMouseLeave={hoverLeave}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <InfoCard
            category={categoryOf(hoveredSingle.a)}
            title={hoveredSingle.a.title_zh || '（未命名）'}
          >
            {hoveredSingle.a.body_zh}
          </InfoCard>
        </div>
      )}

      {hoveredCluster && (
        <div
          className={styles.card}
          style={cardPos(hoveredCluster.cx, hoveredCluster.cy, LIST_CARD_W)}
          onMouseEnter={() => hoverEnter({ type: 'cluster', key: hoveredCluster.key })}
          onMouseLeave={hoverLeave}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <ListCard
            items={hoveredCluster.members.map((m) => ({
              category: categoryOf(m.a),
              label: m.a.title_zh || '（未命名）',
              onClick: () => zoomToClusterMember(hoveredCluster, m),
            }))}
          />
        </div>
      )}
    </div>
  )
}
