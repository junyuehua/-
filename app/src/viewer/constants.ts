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
export const MIN_VIEWPORT_W = 980
export const MIN_VIEWPORT_H = 520

/* —— 移动端（移动端规格 md + Figma 218:1545/219:1674，2026-07-13）—— */
/** 移动端画布 padding：卷首页面 / 浮层（modal、底部五段栏）统一 24（2026-07-13 用户拍板） */
export const MOBILE_CANVAS_PAD = 24
/**
 * 移动端最小缩放 = 画高的一半入画（桌面"整卷 fit"在竖屏上是 18px 高的细条，无意义）：
 * 保留一点总览能力，寻路交给底部五段栏。数值待实测调整。
 */
export const MOBILE_MIN_HEIGHT_FRACTION = 0.5
export function mobileMinZoom(_vw: number, vh: number): number {
  return (vh * MOBILE_MIN_HEIGHT_FRACTION) / CONTENT_H
}
/**
 * 移动端底部预留（同桌面 NAVBAR_HEIGHT 的角色，给底部五段栏让位）：
 * 栏距底 24 + 栏高 38 + 缓冲 8 = 70（safe-area 由栏自己往上抬，画面钳制不追）
 */
export const MOBILE_BOTTOM_RESERVE = () => 70
/**
 * 移动端开卷初始缩放 = 实物比例 × 此系数（**手动调这里**，只影响移动端）：
 * 1 = 与桌面同为实物 100%；>1 更近（如 1.3 = 实物 130%），<1 更远。
 * 位置维度不分平台（都停卷首最右端）。规格 §5"保证视野 1–2 个标识点"待标注密度实测后再定值
 */
export const MOBILE_INITIAL_SCALE = 0.8
/** 移动端 marker 点击热区基准（规格 §6：触摸目标最小 44pt） */
export const MOBILE_MARKER_HIT_SIZE = 44
/** 信息 modal：遮罩色（Figma 219:1681）与卡片最大宽（横屏/iPad/折叠屏防摊宽，361 设计稿宽的放宽值） */
export const MODAL_SCRIM = 'rgba(36, 22, 7, 0.5)'
export const MODAL_MAX_W = 420

/** 听画朗读时背景音乐压低到的音量（不暂停，只降；2026-07-13） */
export const BGM_DUCK_VOLUME = 0.2

/** 神游模式：顶部/底部唤醒热区高度 与 离开热区的隐藏缓冲 */
export const EDGE_ZONE_TOP_PX = 120
export const EDGE_ZONE_BOTTOM_PX = 160
export const UI_LEAVE_DELAY_MS = 200

/**
 * 底部导览条高度（NavBar：`height: 4.4vw`，与 NavBar.module.css 保持同步）。
 * 垂直平移钳制为它预留空间，让画面底边能拉到导览条上沿之上（否则底部内容永远被这条不透明金条压住，
 * 见修复：中等缩放下画高略大于视口时底部细节看不全）。为保持"切模式镜头不动"，此预留与模式无关、常驻——
 * 代价：神游/卧游 UI 隐藏时把画面拉到最底会露出约这么高的一条背景（仅极限位置可见）。
 */
export const NAVBAR_HEIGHT = (vw: number) => vw * 0.044

/* —— 卧游/神游共用的自动平移引擎（PRD §3.2，数值全部待实测调参）—— */
/** 平移锁屏幕速度恒定（非内容速度）：放大后卷上推进自然变慢，视觉节奏一致 */
export const AUTO_PAN_SPEED_PX_S = 50
/** 悬停缓停的时间常数（速度乘子指数逼近 0，非硬刹；刹车距离 ≈ speed×tau ≈ 16px） */
export const AUTO_PAN_STOP_TAU_MS = 220
/** 缓起的时间常数（悬停移开/scrub 松手/切入模式后从 0 缓起） */
export const AUTO_PAN_RESUME_TAU_MS = 380

/* —— 标注 marker：朱笔圈点（实物 100% 以内为固定屏幕像素；超过后随缩放温和放大，见 markerGrowth）—— */
/** 圈的大小＝层级：地标大圈 / 场景中圈 / 细节小圈，三档离散、档间留足间距 */
export const MARKER_SIZE: Record<string, number> = { 地标: 28, 场景: 20, 细节: 16 }
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

/* 【已废弃 2026-07-13】分层显隐门槛（TIER_REVEAL，场景 40%/细节 80% 才浮现）整个机制删除：
   全 tier 任何缩放常显、密度全交给聚合（先在移动端验证，后经用户拍板推广到桌面统一）——
   聚合标记只说"这里有东西"，绕开了旧规则"缩太小元素看不清，圈是多余信息"的隐藏理由。
   tier 仍管：圈大小、内容深度、地标不聚合。详见 decisions-log 同日条目 */

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
