import styles from './NarrationToggle.module.css'

interface NarrationToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** 停用（Figma 233:1835）：整体 50% 透明 + 不可点。神游模式下听画一律停用（保留 checked 态） */
  disabled?: boolean
}

/**
 * 听画总开关（Figma 233:1820）：checkbox 药丸「☐ 听画」，默认关。开启后悬停标识唤出信息卡即自动朗读。
 * 整个组件可点（不只 checkbox）——本身就是个 <button>。桌面放模式切换右侧；神游模式停用（半透明）。
 */
export function NarrationToggle({ checked, onChange, disabled = false }: NarrationToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      aria-label="听画：开启后悬停标识自动朗读"
      className={`${styles.toggle} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.box} aria-hidden="true">
        {checked && (
          <svg viewBox="0 0 14 14" className={styles.check}>
            <path
              d="M3 7.4 L5.8 10.2 L11 4.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className={styles.label}>听画</span>
    </button>
  )
}
