/**
 * 平台判定（移动端规格 §1）：一次性在启动时判定，会话内不切换——
 * 移动端与桌面端是两套壳层，resize/转屏只在各自壳层内自适应。
 * 移动 = 触屏为主的设备（手机/平板/折叠屏都走移动壳层；iPadOS 报桌面 UA，靠触点数兜住）。
 * URL 覆盖：?mobile 强制移动、?desktop 强制桌面（开发/走查用）。
 */
function detect(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (params.has('mobile')) return true
  if (params.has('desktop')) return false
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const coarseTouch =
    navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches
  return uaMobile || coarseTouch
}

export const IS_MOBILE = detect()

/** 供 CSS 走 `:root[data-platform='mobile']` 覆盖（移动端字号/布局 token 的挂载点） */
document.documentElement.dataset.platform = IS_MOBILE ? 'mobile' : 'desktop'

/**
 * iOS 状态栏背景（theme-color）的两支色：卷首整屏纸面 = 预合成纸色（纸 80% × 底图中值，
 * 与墨染入场同一支）；画面 = 背景渐变深棕（也是 index.html 的静态默认值）。
 * 动态切换绑卷首开合，在 MobileViewer；这里在首帧前先预置初始值——移动端首屏必是卷首，
 * 若等 React 挂载后再改，只在加载时读一次 meta 的环境（部分手机预览/模拟工具）会永远停在深棕。
 */
export const THEME_COLOR_PAPER = '#DED5C7'
export const THEME_COLOR_CANVAS = '#60482e'
if (IS_MOBILE) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR_PAPER)
}
