import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CategorySeal, type Category } from '../CategorySeal/CategorySeal'
import styles from './InfoCard.module.css'

interface InfoCardProps {
  category: Category
  title: string
  /** 正文；行内链接直接用 <a>，颜色固定 UI红。为空时不渲染正文区（标题上下留白保持对称） */
  children?: ReactNode
}

export function InfoCard({ category, title, children }: InfoCardProps) {
  const hasBody = children != null && (typeof children !== 'string' || children.trim() !== '')
  const bodyRef = useRef<HTMLDivElement>(null)
  // 滚动边缘渐隐：顶部/底部各自只在"该方向还有内容滚出可读范围"时出现
  const [fade, setFade] = useState({ top: false, bottom: false })

  const updateFade = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }))
  }, [])

  useEffect(() => {
    updateFade()
  }, [children, updateFade])

  return (
    <div className={styles.card}>
      <div className={styles.inner}>
        <div className={styles.titleRow}>
          <CategorySeal category={category} />
          <h2 className={styles.title}>{title}</h2>
        </div>
        {hasBody && (
          <div
            ref={bodyRef}
            onScroll={updateFade}
            className={`${styles.body} ${fade.top ? styles.fadeTop : ''} ${fade.bottom ? styles.fadeBottom : ''}`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
