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
          <h1 className={styles.title}>卧游·清明上河图</h1>
          <p className={styles.hint}>请将窗口拉宽，或换到更大的屏幕观看。</p>
        </div>
      </div>
    </div>
  )
}
