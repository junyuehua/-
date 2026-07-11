import styles from './AppBackground.module.css'

/** 全屏背景（Figma mockup 68:597）：棕色垂直渐变 + subtle 莲花纹平铺 */
export function AppBackground() {
  return (
    <div className={styles.background} aria-hidden="true">
      <div className={styles.pattern} />
    </div>
  )
}
