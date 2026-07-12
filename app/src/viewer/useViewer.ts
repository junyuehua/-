import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CLICK_ZOOM_FACTOR,
  CLICK_ZOOM_MS,
  CONTENT_H,
  CONTENT_W,
  DRAG_THRESHOLD_PX,
  fitZoom,
  JUMP_MS,
  MAX_ZOOM,
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

function clampView(v: ViewState, vw: number, vh: number): ViewState {
  const zoom = Math.min(Math.max(v.zoom, fitZoom(vw, vh)), MAX_ZOOM)
  const w = CONTENT_W * zoom
  const h = CONTENT_H * zoom
  const tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, v.tx))
  const ty = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, v.ty))
  return { zoom, tx, ty }
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** 画卷阅读方向右→左：初始视图停在卷首（内容最右端），实物比例 100%，垂直居中——如同站在真迹前 */
function initialView(vw: number, vh: number): ViewState {
  const z = PHYSICAL_1_ZOOM
  return clampView({ zoom: z, tx: vw - CONTENT_W * z, ty: (vh - CONTENT_H * z) / 2 }, vw, vh)
}

export function useViewer() {
  // 画布固定全屏挂在 (0,0)，因此 clientX/Y 可直接当作画布内坐标使用
  const canvasRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: window.innerWidth, h: window.innerHeight })
  const [size, setSize] = useState(sizeRef.current)
  const [view, setView] = useState<ViewState>(() => initialView(sizeRef.current.w, sizeRef.current.h))
  const viewRef = useRef(view)
  const animRef = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const apply = useCallback((v: ViewState) => {
    const c = clampView(v, sizeRef.current.w, sizeRef.current.h)
    viewRef.current = c
    setView(c)
  }, [])

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
      const z = Math.min(Math.max(zoom, fitZoom(sizeRef.current.w, sizeRef.current.h)), MAX_ZOOM)
      const k = z / v.zoom
      const target = clampView(
        { zoom: z, tx: ax - (ax - v.tx) * k, ty: ay - (ay - v.ty) * k },
        sizeRef.current.w,
        sizeRef.current.h,
      )
      if (animate) {
        animateTo(target, CLICK_ZOOM_MS)
      } else {
        stopAnim()
        apply(target)
      }
    },
    [animateTo, apply, stopAnim],
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
      )
      animateTo(target, JUMP_MS)
    },
    [animateTo],
  )

  /** 分段导览跳转：横向对准 content x=cx、视口框住 cw 宽（zoom 现算不存倍数，PRD §3.11），纵向居中 */
  const flyToContent = useCallback(
    (cx: number, cw: number) => {
      const zoom = sizeRef.current.w / cw
      const target = clampView(
        {
          zoom,
          tx: sizeRef.current.w / 2 - cx * zoom,
          ty: (sizeRef.current.h - CONTENT_H * zoom) / 2,
        },
        sizeRef.current.w,
        sizeRef.current.h,
      )
      animateTo(target, JUMP_MS)
    },
    [animateTo],
  )

  // —— 拖拽平移 / 单击放大 ——
  const gesture = useRef<{
    id: number
    startX: number
    startY: number
    tx: number
    ty: number
    moved: boolean
  } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      stopAnim()
      const v = viewRef.current
      gesture.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, tx: v.tx, ty: v.ty, moved: false }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [stopAnim],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
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

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current
      if (!g || e.pointerId !== g.id) return
      gesture.current = null
      setDragging(false)
      // 未构成拖拽 = 单击：×1.3 放大，缩放中心锚定点击像素（PRD §3.5，无双击档所以立即触发）
      if (!g.moved) zoomAtPoint(e.clientX, e.clientY, viewRef.current.zoom * CLICK_ZOOM_FACTOR, true)
    },
    [zoomAtPoint],
  )

  const onPointerCancel = useCallback(() => {
    gesture.current = null
    setDragging(false)
  }, [])

  // —— 滚轮缩放（需 passive:false 才能 preventDefault，故不走 React 合成事件）——
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY)
      zoomAtPoint(e.clientX, e.clientY, viewRef.current.zoom * factor, false)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAtPoint])

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
    resetToActual,
    jumpToFraction,
    flyToContent,
  }
}
