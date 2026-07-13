import styles from './ModeToggle.module.css'

export type ViewMode = 'learn' | 'travel' | 'immerse'

/** 三模式循环顺序（I 键快捷切换共用，避免两处硬编码） */
export const MODE_ORDER: ViewMode[] = ['learn', 'travel', 'immerse']

/** 三模式 2026-07-11 定稿（PRD §3.2）：读画=learn（主动+信息）/ 卧游=travel（自动展卷+标记，取宗炳
    "卧以游之"典故）/ 神游=immerse（自动展卷+UI 全隐纯欣赏，沿用旧 immerse 代号——其"UI 全淡出"语义
    最接近神游）。文案缩为两字：三 tab 在 1024px 最小视口下不挤 */
const TABS: { value: ViewMode; label: string }[] = [
  { value: 'learn', label: '细览' },
  { value: 'travel', label: '卧游' },
  { value: 'immerse', label: '入境' },
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
