/** 官方坐标系：真实完整卷轴分辨率（已切金色画，见 PRD §5），所有锚点/变换都以此为基准 */
export const CONTENT_W = 160348
export const CONTENT_H = 7595

/** 渲染用工作副本（瓦片架构落地前的过渡素材）的像素尺寸 */
export const WORKING_W = 16000
export const WORKING_H = 758

/** 最大缩放 = 扫描分辨率 200%（2026-07-10 拍板，后续可调）；超过 100% 即纯像素放大 */
export const MAX_ZOOM = 2

/* —— 深度缩放瓦片（DZI，由 app/scripts/generate-tiles.sh 生成到 public/tiles/）—— */
export const TILE_SIZE = 512
export const TILE_OVERLAP = 1
/** DZI 金字塔最高层级 = ceil(log2(160348)) = 18；层级 L 的缩放 = 2^(L-18) */
export const TILE_MAX_LEVEL = Math.ceil(Math.log2(CONTENT_W))
/** 低于该层级没必要渲染（整卷不足一屏，交给常驻的工作副本底图） */
export const TILE_MIN_LEVEL = 11
export const tileUrl = (level: number, x: number, y: number) =>
  `/tiles/qingming_files/${level}/${x}_${y}.jpg`

/** 最小缩放 = 整幅画完整入画（fit 全卷，随视口尺寸动态计算） */
export function fitZoom(vw: number, vh: number): number {
  return Math.min(vw / CONTENT_W, vh / CONTENT_H)
}

/** 画心实际高度（故宫官方数据：纵 24.8cm；宽度不用 528cm——当前图含隔水/拖尾，高度口径更准） */
export const PAINTING_HEIGHT_CM = 24.8
/** 扫描精度：≈306 px/cm（≈778 DPI） */
export const SCAN_PX_PER_CM = CONTENT_H / PAINTING_HEIGHT_CM
/** CSS 标准：1 英寸 = 96px（实际物理精度取决于系统缩放设置的诚实程度） */
export const CSS_PX_PER_CM = 96 / 2.54
/**
 * 实物比例 100% 对应的内部 zoom（≈0.1234）：此时画在屏幕上呈现真实物理大小（画高 24.8cm），
 * 比例 toast 读数与"1:1 恢复实际大小"都以它为基准
 */
export const PHYSICAL_1_ZOOM = CSS_PX_PER_CM / SCAN_PX_PER_CM

/** 单击放大倍率与缓动时长（PRD §3.5：在当前比例上放大 50%，200-300ms） */
export const CLICK_ZOOM_FACTOR = 1.5
export const CLICK_ZOOM_MS = 250
/** 导航条跳转的运镜时长 */
export const JUMP_MS = 350

/** 单击 vs 拖拽的移动容差（PRD §3.5：5-8px，偏向判定为拖拽） */
export const DRAG_THRESHOLD_PX = 6
/** 滚轮缩放灵敏度 */
export const WHEEL_ZOOM_SENSITIVITY = 0.0015

/** 比例 toast 停留时长——待实测调整（用户拍板先 1s 左右） */
export const TOAST_HIDE_MS = 1200

/** 沉浸模式：顶部/底部唤醒热区高度 与 离开热区的隐藏缓冲 */
export const EDGE_ZONE_TOP_PX = 120
export const EDGE_ZONE_BOTTOM_PX = 160
export const UI_LEAVE_DELAY_MS = 200
