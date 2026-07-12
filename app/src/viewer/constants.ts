/** 官方坐标系：真实完整卷轴分辨率（已切金色画 + 上下裁边 顶100/底60，见 PRD §5），所有锚点/变换都以此为基准 */
export const CONTENT_W = 160348
export const CONTENT_H = 7435

/** 渲染用工作副本（瓦片架构落地前的过渡素材）的像素尺寸 */
export const WORKING_W = 16000
export const WORKING_H = 742

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

/**
 * 最小可用视口（2026-07-11 拍板 1024×640）：低于任一维度即停止渲染画布（也停掉瓦片请求），
 * 整屏显示"请用更大屏幕"提示卡；resize 实时进出，恢复时不丢当前视图状态。
 * 1024 = 顶栏三簇（模式切换/分段导览/音乐）无重叠的自然下限之上，且保留笔记本分屏场景；
 * 640 = 再矮画面可视高度不足 450px。与"移动端 UA 检测提示"互补，是两道独立检查。
 */
export const MIN_VIEWPORT_W = 1024
export const MIN_VIEWPORT_H = 640

/** 沉浸模式：顶部/底部唤醒热区高度 与 离开热区的隐藏缓冲 */
export const EDGE_ZONE_TOP_PX = 120
export const EDGE_ZONE_BOTTOM_PX = 160
export const UI_LEAVE_DELAY_MS = 200

/* —— 标注 marker：朱笔圈点（实物 100% 以内为固定屏幕像素；超过后随缩放温和放大，见 markerGrowth）—— */
/** 圈的大小＝层级：地标大圈 / 场景中圈 / 细节小圈，三档离散、档间留足间距 */
export const MARKER_SIZE: Record<string, number> = { 地标: 28, 场景: 18, 细节: 14 }
/** marker 点击热区基准尺寸（比可见圈大一圈，随 markerGrowth 同步放大） */
export const MARKER_HIT_SIZE = 36
/** 高倍缩放下 marker 的放大上限 */
export const MARKER_GROWTH_MAX = 3
/**
 * 高倍缩放 marker 放大系数（2026-07-11：修"放大后朱圈异常小又细"）：
 * 实物 100% 以内保持固定屏幕像素（growth=1）；超过后按 √(实物比例) 增长——
 * 增速慢于画面本身（不喧宾夺主，保留"越放大存在感越弱"的方向），但不再小到看不清；封顶 3×。
 * 笔触厚度随 SVG 整体缩放自然同步变粗，无需单独处理。
 */
export function markerGrowth(zoom: number): number {
  return Math.min(MARKER_GROWTH_MAX, Math.max(1, Math.sqrt(zoom / PHYSICAL_1_ZOOM)))
}
/** marker 相对锚点的偏移（屏幕像素）。PRD 要求偏移避让被标注元素本身；标点调试期先设 0 便于校准坐标 */
export const MARKER_OFFSET = { x: 0, y: 0 }
/** 聚合标记：单一固定尺寸（不参与"大小=层级"，数量交给中间的汉字；不比地标大圈抢眼），Figma 标记 106:3907 */
export const CLUSTER_MARKER_SIZE = 27
/** 聚合计数字：一…九，超过九显示"众"（PRD §3.8） */
export const CLUSTER_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
/** 朱圈"墨量"浓淡区间（按点位 id 稳定哈希取值；multiply 下低透明度=印得淡，模拟手书朱墨自然浓淡） */
export const MARKER_INK_MIN = 0.68
export const MARKER_INK_MAX = 1

/**
 * 分层显隐门槛（PRD §3.8，绑 tier；数值 = 相对实物比例，全部待实测可调）：
 * 地标任何缩放可见（当全卷导航锚点）；场景中等缩放浮现；细节到实物 100% 附近才出现。
 * [start, end] 为淡入区间——避免在门槛那一帧硬弹出。
 */
export const TIER_REVEAL: Record<string, { start: number; end: number } | null> = {
  地标: null, // 始终可见
  场景: { start: 0.4, end: 0.5 },
  细节: { start: 0.8, end: 1.0 },
}
/** 聚合阈值（屏幕像素距离，单阈值起步；双阈值防抖动留到真实内容实测再定，PRD §8） */
export const CLUSTER_THRESHOLD_PX = 48
/** marker/卡片共享悬停态的离开缓冲（PRD §3.8：250-300ms） */
export const HOVER_LEAVE_MS = 280
/** 信息卡与锚点的间距（保护区具体算法待定，先用固定侧向偏移保证不遮锚点） */
export const CARD_OFFSET_PX = 24
/** 卡片距视口边缘的最小留白；底部另加导航栏高度（避开底部 UI，顶部允许压过 UI） */
export const CARD_VIEWPORT_MARGIN_PX = 12
/** 视口外多渲染的余量，避免边缘 marker 拖入时闪现 */
export const MARKER_CULL_MARGIN_PX = 120
