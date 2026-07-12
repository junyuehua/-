import type { Segment } from '../../viewer/segments'
import styles from './SegmentNav.module.css'

interface SegmentNavProps {
  segments: Segment[]
  /** 视口中心所在段，实时高亮（PRD §3.11：既是导航也是"我在哪一章"的定位器） */
  activeId: number | undefined
  onSelect: (segment: Segment) => void
}

export function SegmentNav({ segments, activeId, onSelect }: SegmentNavProps) {
  // 左→右 = 段5→段1（东京梦华…春郊），镜像画面空间：x 从右 160348 到左 0
  const ordered = [...segments].sort((a, b) => a.x_start - b.x_start)
  return (
    <nav className={styles.nav} aria-label="分段导览">
      {ordered.map((seg) => (
        <button
          key={seg.id}
          type="button"
          aria-current={seg.id === activeId ? 'true' : undefined}
          className={`${styles.tab} ${seg.id === activeId ? styles.active : ''}`}
          onClick={() => onSelect(seg)}
        >
          {seg.title_zh}
        </button>
      ))}
    </nav>
  )
}
