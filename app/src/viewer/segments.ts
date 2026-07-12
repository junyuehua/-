import { CONTENT_W } from './constants'

/**
 * 分段主题数据（PRD §3.11 / §4，app/segments.json）。
 * 与标注共用 160348×7435 content 坐标系；叙事顺序（卷首→卷尾）在 x 上从右往左，
 * 段1 春郊在最右（x_end=160348）、段5 东京梦华在最左（x_start=0）。
 */
export interface Segment {
  id: number
  title_zh: string
  title_en: string
  /** 该段 content-x 左界（含） */
  x_start: number
  /** 该段 content-x 右界（不含；段1 右界 160348 按含处理） */
  x_end: number
  /** 跳转落点：镜头横向对准的 content x（可空，空则框满整段） */
  focal_x: number | null
  /** 跳转落点：视口横向框住的 content 宽度，决定缩放（可空） */
  focal_w: number | null
}

/** 视口中心 content-x 落在哪段（越界钳到 [0, CONTENT_W]，保证总览/边缘拖拽时也有当前段） */
export function segmentAtX(segments: Segment[], x: number): Segment | undefined {
  const cx = Math.min(Math.max(x, 0), CONTENT_W)
  return segments.find((s) => cx >= s.x_start && (cx < s.x_end || s.x_end >= CONTENT_W))
}
