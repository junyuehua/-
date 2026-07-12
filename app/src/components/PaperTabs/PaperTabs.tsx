import styles from './PaperTabs.module.css'

export interface PaperTabItem {
  id: string | number
  label: string
}

interface PaperTabsProps {
  items: PaperTabItem[]
  activeId?: string | number
  onSelect: (id: string | number) => void
  /** 实心纸面底（卷首 148:1237）；默认 80% 半透明（顶栏分段导览 108:3782） */
  solid?: boolean
  ariaLabel?: string
}

/** 纸签 tab 行（Figma 分段导航组件的通用化）：激活/悬停=透明度提满，仅整条两端圆角 */
export function PaperTabs({ items, activeId, onSelect, solid, ariaLabel }: PaperTabsProps) {
  return (
    <nav className={styles.nav} aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          aria-current={it.id === activeId ? 'true' : undefined}
          className={`${styles.tab} ${solid ? styles.solid : ''} ${it.id === activeId ? styles.active : ''}`}
          onClick={() => onSelect(it.id)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  )
}
