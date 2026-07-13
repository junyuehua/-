import { useEffect, type ReactNode } from 'react'
import { CategorySeal, type Category } from '../CategorySeal/CategorySeal'
import { useScrollFade } from '../useScrollFade'
import { parseBlocks, renderInline } from './markdown'
import styles from './InfoCard.module.css'

interface InfoCardProps {
  category: Category
  title: string
  /**
   * 正文。传字符串时按 Markdown 约定解析（> 引用块 / [文字](url) 链接，见 ./markdown）；
   * 传 JSX 时原样渲染。为空时不渲染正文区（标题上下留白保持对称）
   */
  children?: ReactNode
  /** 追加到卡片根节点：挂载方用 --infocard-max-w / --infocard-body-max-h 改尺寸（移动端 modal） */
  className?: string
}

export function InfoCard({ category, title, children, className }: InfoCardProps) {
  const hasBody = children != null && (typeof children !== 'string' || children.trim() !== '')
  // 滚动边缘渐隐：顶部/底部各自只在"该方向还有内容滚出可读范围"时出现
  const { ref: bodyRef, fade, update: updateFade } = useScrollFade()

  useEffect(() => {
    updateFade()
  }, [children, updateFade])

  return (
    <div className={`${styles.card} ${className ?? ''}`}>
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
            {typeof children === 'string' ? (
              parseBlocks(children).map((b, i) =>
                b.type === 'quote' ? (
                  <div key={i} className={styles.citation}>
                    <span className={styles.citationBar} />
                    <p className={styles.citationText}>{renderInline(b.text)}</p>
                  </div>
                ) : (
                  <div key={i} className={styles.bodyText}>
                    {renderInline(b.text)}
                  </div>
                ),
              )
            ) : (
              <div className={styles.bodyText}>{children}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
