import { CategorySeal, type Category } from '../CategorySeal/CategorySeal'
import styles from './ListCard.module.css'

export interface ListCardItem {
  category: Category
  label: string
  onClick?: () => void
}

interface ListCardProps {
  items: ListCardItem[]
}

export function ListCard({ items }: ListCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.inner}>
        {items.map((item, i) => (
          <button key={i} type="button" className={styles.item} onClick={item.onClick}>
            <CategorySeal category={item.category} />
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
