import workingImg from '../assets/qingming-scroll-working.jpg'
import { CONTENT_H, CONTENT_W, WORKING_H, WORKING_W } from './constants'
import { TileLayer } from './TileLayer'
import type { ViewState } from './useViewer'
import styles from './ScrollCanvas.module.css'

interface ScrollCanvasProps {
  view: ViewState
  size: { w: number; h: number }
  dragging: boolean
  canvasRef: React.RefObject<HTMLDivElement | null>
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  onClarity?: (ratio: number) => void
}

/**
 * 主画布：常驻低清工作副本打底 + 高清瓦片层按需淡入（"低清先行、高清渐进"）。
 * 两层共用同一套 content 坐标系（160348×7595）变换矩阵。
 */
export function ScrollCanvas({ view, size, dragging, canvasRef, handlers, onClarity }: ScrollCanvasProps) {
  const sx = (view.zoom * CONTENT_W) / WORKING_W
  const sy = (view.zoom * CONTENT_H) / WORKING_H
  return (
    <div ref={canvasRef} className={`${styles.canvas} ${dragging ? styles.dragging : ''}`} {...handlers}>
      <img
        src={workingImg}
        alt="清明上河图"
        width={WORKING_W}
        height={WORKING_H}
        draggable={false}
        className={styles.content}
        style={{ transform: `translate3d(${view.tx}px, ${view.ty}px, 0) scale(${sx}, ${sy})` }}
      />
      <TileLayer view={view} size={size} onClarity={onClarity} />
    </div>
  )
}
