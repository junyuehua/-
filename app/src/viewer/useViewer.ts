import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CLICK_ZOOM_FACTOR,
  CLICK_ZOOM_MS,
  CONTENT_H,
  CONTENT_W,
  DRAG_THRESHOLD_PX,
  fitZoom,
  JUMP_MS,
  MAX_ZOOM,
  NAVBAR_HEIGHT,
  PHYSICAL_1_ZOOM,
  WHEEL_ZOOM_SENSITIVITY,
} from './constants'

/**
 * 视图状态：screen = content × zoom + (tx, ty)。
 * content 坐标 = 真实完整卷轴分辨率像素（160348×7435），marker 锚点未来共用这套变换。
 */
export interface ViewState {
  zoom: number
  tx: number
  ty: number
}

/** 平台差异注入点（移动端壳层传入；缺省 = 桌面既有行为，一切不变） */
export interface ViewerOptions {
  /** 最小缩放（桌面 = 整卷 fit；移动 = 画高一半入画，竖屏整卷 fit 是无意义细条） */
  minZoom?: (vw: number, vh: number) => number
  /** 底部 UI 预留高度（桌面 = 导览条 4.4vw；移动 = 底部五段栏 70px） */
  bottomReserve?: (vw: number) => number
  /** 单击/tap 空白画布 = ×1.5 放大（桌面惯例）；移动端关掉——tap 语义留给标识点，缩放交给捏合 */
  clickZoom?: boolean
  /** 开卷初始缩放（缺省 = 实物 100%；移动端 = 实物 × MOBILE_INITIAL_SCALE） */
  initialZoom?: number
}

interface Geometry {
  minZoom: (vw: number, vh: number) => number
  bottomReserve: (vw: number) => number
  initialZoom: number
}

function clampView(v: ViewState, vw: number, vh: number, geo: Geometry): ViewState {
  const zoom = Math.min(Math.max(v.zoom, geo.minZoom(vw, vh)), MAX_ZOOM)
  const w = CONTENT_W * zoom
  const h = CONTENT_H * zoom
  const tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, v.tx))
  // 底部为导览条/五段栏预留空间：可视区下界抬到 vh - 预留高，画面底边才能拉到底部 UI 上沿之上
  const vhUsable = vh - geo.bottomReserve(vw)
  const ty = h <= vhUsable ? (vhUsable - h) / 2 : Math.min(0, Math.max(vhUsable - h, v.ty))
  return { zoom, tx, ty }
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** 滚轮 deltaY 归一化到"像素当量"——WHEEL_ZOOM_SENSITIVITY 是按像素模式（每格≈100）校准的，
    传统鼠标在部分浏览器报行模式（deltaY≈3）会导致每格只缩放 0.4% ≈ 没反应（2026-07-13 修）。
    像素模式原样透传（保留触控板精度）；行模式按标准行高换算；页模式给一个固定大步长再夹住。 */
function wheelDeltaToPx(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) return deltaY * 16 // DOM_DELTA_LINE：一行 ≈ 16px
  if (deltaMode === 2) return Math.sign(deltaY) * 120 // DOM_DELTA_PAGE：一页给固定一大步
  return deltaY // DOM_DELTA_PIXEL
}

/** 画卷阅读方向右→左：初始视图停在卷首（内容最右端），缺省实物比例 100%，垂直居中——如同站在真迹前 */
function initialView(vw: number, vh: number, geo: Geometry): ViewState {
  const z = geo.initialZoom
  return clampView({ zoom: z, tx: vw - CONTENT_W * z, ty: (vh - CONTENT_H * z) / 2 }, vw, vh, geo)
}

export function useViewer(options?: ViewerOptions) {
  const geo = useMemo<Geometry>(
    () => ({
      minZoom: options?.minZoom ?? fitZoom,
      bottomReserve: options?.bottomReserve ?? NAVBAR_HEIGHT,
      initialZoom: options?.initialZoom ?? PHYSICAL_1_ZOOM,
    }),
    // options 期望调用方以字面量一次性给定（平台启动时定死），不做响应式
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const clickZoomEnabled = options?.clickZoom ?? true

  // 画布固定全屏挂在 (0,0)，因此 clientX/Y 可直接当作画布内坐标使用
  const canvasRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: window.innerWidth, h: window.innerHeight })
  const [size, setSize] = useState(sizeRef.current)
  const [view, setView] = useState<ViewState>(() =>
    initialView(sizeRef.current.w, sizeRef.current.h, geo),
  )
  const viewRef = useRef(view)
  const animRef = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const apply = useCallback(
    (v: ViewState) => {
      const c = clampView(v, sizeRef.current.w, sizeRef.current.h, geo)
      viewRef.current = c
      setView(c)
    },
    [geo],
  )

  const stopAnim = useCallback(() => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    animRef.current = null
  }, [])

  const animateTo = useCallback(
    (target: ViewState, ms: number) => {
      stopAnim()
      const from = viewRef.current
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms)
        const e = easeOutCubic(t)
        apply({
          zoom: from.zoom + (target.zoom - from.zoom) * e,
          tx: from.tx + (target.tx - from.tx) * e,
          ty: from.ty + (target.ty - from.ty) * e,
        })
        animRef.current = t < 1 ? requestAnimationFrame(step) : null
      }
      animRef.current = requestAnimationFrame(step)
    },
    [apply, stopAnim],
  )

  /** 以屏幕点 (ax, ay) 为锚缩放——锚点下的画面内容在缩放前后保持不动（PRD §3.5 锚定数学） */
  const zoomAtPoint = useCallback(
    (ax: number, ay: number, zoom: number, animate: boolean) => {
      const v = viewRef.current
      const z = Math.min(Math.max(zoom, geo.minZoom(sizeRef.current.w, sizeRef.current.h)), MAX_ZOOM)
      const k = z / v.zoom
      const target = clampView(
        { zoom: z, tx: ax - (ax - v.tx) * k, ty: ay - (ay - v.ty) * k },
        sizeRef.current.w,
        sizeRef.current.h,
        geo,
      )
      if (animate) {
        animateTo(target, CLICK_ZOOM_MS)
      } else {
        stopAnim()
        apply(target)
      }
    },
    [animateTo, apply, geo, stopAnim],
  )

  /** 统一滚轮缩放入口（画布与悬停信息卡共用）：deltaY 先按 deltaMode 归一，再走锚定缩放。
      信息卡 portal 到 body、不在画布 stacking 里，滚轮打在卡上到不了画布监听器——由卡自己调本函数补上 */
  const wheelZoom = useCallback(
    (clientX: number, clientY: number, deltaY: number, deltaMode: number) => {
      const px = wheelDeltaToPx(deltaY, deltaMode)
      const factor = Math.exp(-px * WHEEL_ZOOM_SENSITIVITY)
      zoomAtPoint(clientX, clientY, viewRef.current.zoom * factor, false)
    },
    [zoomAtPoint],
  )

  /** 恢复实际大小：回到实物比例 100%，以当前视口中心为锚（保持观看位置，不跳回卷首） */
  const resetToActual = useCallback(() => {
    zoomAtPoint(sizeRef.current.w / 2, sizeRef.current.h / 2, PHYSICAL_1_ZOOM, true)
  }, [zoomAtPoint])

  /** 导航条跳转：把内容上 (fx, fy)（0..1 分数坐标）运镜到视口中心，保持当前缩放 */
  const jumpToFraction = useCallback(
    (fx: number, fy: number) => {
      const v = viewRef.current
      const target = clampView(
        {
          zoom: v.zoom,
          tx: sizeRef.current.w / 2 - fx * CONTENT_W * v.zoom,
          ty: sizeRef.current.h / 2 - fy * CONTENT_H * v.zoom,
        },
        sizeRef.current.w,
        sizeRef.current.h,
        geo,
      )
      animateTo(target, JUMP_MS)
    },
    [animateTo, geo],
  )

  /** 分段导览跳转：横向对准 content x=cx、视口框住 cw 宽（zoom 现算不存倍数，PRD §3.11），纵向居中。
      zoom 必须先钳到 [min, MAX] 再算 tx——移动端最小缩放高于 vw/cw 时，若把未钳制 zoom 代入 tx，
      clampView 只矫 zoom 不矫锚点，落点会漂到邻段（2026-07-13 移动端实测修） */
  const flyToContent = useCallback(
    (cx: number, cw: number) => {
      const zoom = Math.min(
        Math.max(sizeRef.current.w / cw, geo.minZoom(sizeRef.current.w, sizeRef.current.h)),
        MAX_ZOOM,
      )
      const target = clampView(
        {
          zoom,
          tx: sizeRef.current.w / 2 - cx * zoom,
          ty: (sizeRef.current.h - CONTENT_H * zoom) / 2,
        },
        sizeRef.current.w,
        sizeRef.current.h,
        geo,
      )
      animateTo(target, JUMP_MS)
    },
    [animateTo, geo],
  )

  /** auto-pan 专用增量平移通道（走 apply 含 clamp）：返回是否已顶到卷尾边界（tx clamp 上界 0） */
  const panBy = useCallback(
    (dxScreen: number): { atEnd: boolean } => {
      const v = viewRef.current
      apply({ zoom: v.zoom, tx: v.tx + dxScreen, ty: v.ty })
      return { atEnd: viewRef.current.tx >= -0.5 }
    },
    [apply],
  )

  /** animateTo 是否在跑——auto-pan 帧内让路用（绝对插值与增量平移同帧并写会互相覆盖） */
  const isAnimating = useCallback(() => animRef.current !== null, [])

  /** 重播用：瞬移回初始视图（卷首、实物 100%、垂直居中），无缓动——配合画布淡切遮罩使用 */
  const resetToStart = useCallback(() => {
    stopAnim()
    apply(initialView(sizeRef.current.w, sizeRef.current.h, geo))
  }, [apply, geo, stopAnim])

  // —— 拖拽平移 / 单击放大 / 双指捏合缩放 ——
  // 所有活动指针都记录在 pointers；第二根手指落下即切入 pinch（拖拽/单击判定作废）
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    id: number
    startX: number
    startY: number
    tx: number
    ty: number
    moved: boolean
  } | null>(null)
  /** pinch 基准：两指落定瞬间的间距/中点/视图——之后每帧相对基准重算（免累积误差） */
  const pinch = useRef<{
    d0: number
    midX0: number
    midY0: number
    zoom0: number
    tx0: number
    ty0: number
  } | null>(null)

  const beginPinch = useCallback(() => {
    const pts = [...pointers.current.values()]
    if (pts.length < 2) return
    const v = viewRef.current
    pinch.current = {
      d0: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
      midX0: (pts[0].x + pts[1].x) / 2,
      midY0: (pts[0].y + pts[1].y) / 2,
      zoom0: v.zoom,
      tx0: v.tx,
      ty0: v.ty,
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      stopAnim()
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      if (pointers.current.size === 2) {
        // 进入捏合：单指拖拽/单击判定作废（抬手不再触发单击放大）
        gesture.current = null
        setDragging(true)
        beginPinch()
        return
      }
      if (pointers.current.size > 2) return // 第三指忽略，维持当前 pinch 基准
      const v = viewRef.current
      gesture.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, tx: v.tx, ty: v.ty, moved: false }
    },
    [beginPinch, stopAnim],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = pointers.current.get(e.pointerId)
      if (p) {
        p.x = e.clientX
        p.y = e.clientY
      }
      // —— 捏合：缩放锚定两指中点（基准中点下的内容跟随当前中点移动 = 缩放+平移一体）——
      if (pinch.current && pointers.current.size >= 2) {
        const pts = [...pointers.current.values()].slice(0, 2)
        const d = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y))
        const midX = (pts[0].x + pts[1].x) / 2
        const midY = (pts[0].y + pts[1].y) / 2
        const b = pinch.current
        const zoom = b.zoom0 * (d / b.d0)
        // 基准中点处的 content 点：c = (mid0 - t0)/zoom0；要求它现在落在 mid：t = mid - c*zoom
        apply({
          zoom,
          tx: midX - ((b.midX0 - b.tx0) / b.zoom0) * zoom,
          ty: midY - ((b.midY0 - b.ty0) / b.zoom0) * zoom,
        })
        return
      }
      const g = gesture.current
      if (!g || e.pointerId !== g.id) return
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      if (!g.moved) {
        g.moved = true
        setDragging(true)
      }
      apply({ zoom: viewRef.current.zoom, tx: g.tx + dx, ty: g.ty + dy })
    },
    [apply],
  )

  const endPointer = useCallback(
    (e: React.PointerEvent, cancelled: boolean) => {
      pointers.current.delete(e.pointerId)
      if (pinch.current) {
        if (pointers.current.size >= 2) {
          beginPinch() // 三指抬到两指：换基准继续捏
          return
        }
        pinch.current = null
        if (pointers.current.size === 1) {
          // 两指抬到一指：无缝接回单指拖拽（moved=true，抬手不算单击）
          const [id, pt] = [...pointers.current.entries()][0]
          const v = viewRef.current
          gesture.current = { id, startX: pt.x, startY: pt.y, tx: v.tx, ty: v.ty, moved: true }
          return
        }
        setDragging(false)
        return
      }
      const g = gesture.current
      if (!g || e.pointerId !== g.id) return
      gesture.current = null
      setDragging(false)
      // 未构成拖拽 = 单击：×1.5 放大，缩放中心锚定点击像素（PRD §3.5）；移动端关闭（clickZoom=false）
      if (!cancelled && !g.moved && clickZoomEnabled) {
        zoomAtPoint(e.clientX, e.clientY, viewRef.current.zoom * CLICK_ZOOM_FACTOR, true)
      }
    },
    [beginPinch, clickZoomEnabled, zoomAtPoint],
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => endPointer(e, false), [endPointer])
  const onPointerCancel = useCallback((e: React.PointerEvent) => endPointer(e, true), [endPointer])

  // —— 滚轮缩放（需 passive:false 才能 preventDefault，故不走 React 合成事件）——
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      wheelZoom(e.clientX, e.clientY, e.deltaY, e.deltaMode)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [wheelZoom])

  // —— 窗口尺寸变化：重新钳制视图 ——
  useEffect(() => {
    const onResize = () => {
      sizeRef.current = { w: window.innerWidth, h: window.innerHeight }
      setSize(sizeRef.current)
      apply(viewRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [apply])

  useEffect(() => stopAnim, [stopAnim])

  return {
    canvasRef,
    view,
    size,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    zoomAtPoint,
    wheelZoom,
    resetToActual,
    jumpToFraction,
    flyToContent,
    panBy,
    isAnimating,
    resetToStart,
  }
}
