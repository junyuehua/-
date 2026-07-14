import styles from './ViewportGate.module.css'

/**
 * 视口过小遮蔽层（PRD §3.10：低于 MIN_VIEWPORT_W/H 停止渲染画布，整屏提示）。
 * 视觉按 Figma 166:427 定稿（2026-07-13）：纸面卡片 + 金描边内容框，标题刻本宋 + 正文思源宋。
 */
export function ViewportGate() {
  return (
    <div className={styles.gate}>
      <div className={styles.card}>
        <div className={styles.content}>
          <h1 className={styles.title}>请拉宽视窗</h1>
          <p className={styles.hint}>长卷需要更宽的画面，拉宽浏览器窗口即可展开。</p>
        </div>
      </div>
    </div>
  )
}
