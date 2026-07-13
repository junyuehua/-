import { createPortal } from 'react-dom'
import { useBackClose } from '../../shellHooks'
import styles from './WidescreenHint.module.css'

interface WidescreenHintProps {
  open: boolean
  onClose: () => void
}

/**
 * 「长卷宜宽屏」提醒（Figma 221:1715，移动端专属，2026-07-13）：首次点「展阅」后弹出，
 * 提示电脑端有更完整的观画体验（三种观看模式等移动端砍掉的能力）。
 * 关闭：点「好的」/ 点遮罩 / Android 返回键；只在首次进入出现一次，会话内不再弹、无持久化。
 */
export function WidescreenHint({ open, onClose }: WidescreenHintProps) {
  useBackClose(open, onClose)

  if (!open) return null

  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inner}>
          <div className={styles.textBlock}>
            <h2 className={styles.title}>长卷宜宽屏</h2>
            <p className={styles.body}>电脑端可解锁更多观画模式。</p>
          </div>
          <button type="button" className={styles.cta} onClick={onClose}>
            好的
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
