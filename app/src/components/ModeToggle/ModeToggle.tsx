import styles from './ModeToggle.module.css'

export type ViewMode = 'learn' | 'immerse'

const TABS: { value: ViewMode; label: string }[] = [
  { value: 'learn', label: '学习模式' },
  { value: 'immerse', label: '沉浸模式' },
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
