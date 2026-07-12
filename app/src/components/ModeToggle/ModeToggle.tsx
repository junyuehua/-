import styles from './ModeToggle.module.css'

export type ViewMode = 'learn' | 'immerse'

/** UI 文案 2026-07-11 定稿：读画（原"学习"）/ 卧游（原"沉浸"，取宗炳"卧以游之"典故）；内部代号 learn/immerse 不变 */
const TABS: { value: ViewMode; label: string }[] = [
  { value: 'learn', label: '读画模式' },
  { value: 'immerse', label: '卧游模式' },
]

interface ModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className={styles.toggle} role="tablist" aria-label="观看模式">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={`${styles.tab} ${value === tab.value ? styles.selected : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
