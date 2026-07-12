import styles from './ViewportGate.module.css'

/**
 * 视口过小遮蔽层（PRD §3.10：低于 MIN_VIEWPORT_W/H 停止渲染画布，整屏提示）。
 * 当前为 placeholder 视觉，最终设计稿待用户提供后替换。
 */
export function ViewportGate() {
  return (
    <div className={styles.gate}>
      <div className={styles.card}>
        <h1 className={styles.title}>请用更大的屏幕欣赏此卷</h1>
        <p className={styles.hint}>《清明上河图》为大幅长卷，请将窗口拉宽，或换到更大的屏幕观看。</p>
      </div>
    </div>
  )
}
