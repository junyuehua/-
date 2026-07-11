import workingImg from '../assets/qingming-scroll-working.jpg'
import { CONTENT_H, CONTENT_W, WORKING_H, WORKING_W } from './constants'
import type { ViewState } from './useViewer'
import styles from './ScrollCanvas.module.css'

interface ScrollCanvasProps {
  view: ViewState
  dragging: boolean
  canvasRef: React.RefObject<HTMLDivElement | null>
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

/** 主画布：工作副本图按 content 坐标系（160348×7595）缩放摆放，等瓦片架构替换底图时变换矩阵不变 */
export function ScrollCanvas({ view, dragging, canvasRef, handlers }: ScrollCanvasProps) {
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
    </div>
  )
}
