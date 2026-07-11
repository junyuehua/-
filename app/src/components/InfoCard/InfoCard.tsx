import type { ReactNode } from 'react'
import { CategorySeal, type Category } from '../CategorySeal/CategorySeal'
import styles from './InfoCard.module.css'

interface InfoCardProps {
  category: Category
  title: string
  /** 正文；行内链接直接用 <a>，颜色固定 UI红 */
  children: ReactNode
}

export function InfoCard({ category, title, children }: InfoCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.inner}>
        <div className={styles.titleRow}>
          <CategorySeal category={category} />
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
