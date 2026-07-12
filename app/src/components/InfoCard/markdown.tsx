import type { ReactNode } from 'react'

export interface Block {
  type: 'text' | 'quote'
  text: string
}

/**
 * 正文 Markdown 约定（PRD §3.8 / §4）：以 > 开头的行 = 金色引用块，空行分段，
 * 可多段、可与正文穿插——与 prototypes/annotator-tool.html 的 parseBlocks 保持同构。
 * 信息卡与卷首正文共用这一套解析。
 */
export function parseBlocks(src: string): Block[] {
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
export function renderInline(text: string): ReactNode {
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
