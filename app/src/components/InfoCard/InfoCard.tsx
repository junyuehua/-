import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CategorySeal, type Category } from '../CategorySeal/CategorySeal'
import styles from './InfoCard.module.css'

interface Block {
  type: 'text' | 'quote'
  text: string
}

/**
 * 正文 Markdown 约定（PRD §3.8 / §4）：以 > 开头的行 = 金色引用块，空行分段，
 * 可多段、可与正文穿插——与 prototypes/annotator-tool.html 的 parseBlocks 保持同构。
 */
function parseBlocks(src: string): Block[] {
  const blocks: Block[] = []
  let cur: Block | null = null
  for (const line of (src || '').split('\n')) {
    if (line.trim() === '') {
      cur = null
      continue
    }
    const isQuote = /^\s*>\s?/.test(line)
    const text = isQuote ? line.replace(/^\s*>\s?/, '') : line
    const type = isQuote ? 'quote' : 'text'
    if (cur && cur.type === type) {
      cur.text += '\n' + text
    } else {
      cur = { type, text }
      blocks.push(cur)
    }
  }
  return blocks
}

/** 行内 markdown 链接 [文字](url) → <a>（链接色固定 UI红，不随分类变化，PRD §10） */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer">
        {m[1]}
      </a>,
    )
    last = m.index + m[0].length
  }
  if (parts.length === 0) return text
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

interface InfoCardProps {
  category: Category
  title: string
  /**
   * 正文。传字符串时按 Markdown 约定解析（> 引用块 / [文字](url) 链接）；
   * 传 JSX 时原样渲染。为空时不渲染正文区（标题上下留白保持对称）
   */
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
