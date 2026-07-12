import { PaperTabs } from '../PaperTabs/PaperTabs'
import type { Segment } from '../../viewer/segments'

interface SegmentNavProps {
  segments: Segment[]
  /** 视口中心所在段，实时高亮（PRD §3.11：既是导航也是"我在哪一章"的定位器） */
  activeId: number | undefined
  onSelect: (segment: Segment) => void
}

/** 顶栏分段导览（Figma 108:3782）：纸签视觉由 PaperTabs 承担，这里只管段序与跳转 */
export function SegmentNav({ segments, activeId, onSelect }: SegmentNavProps) {
  // 左→右 = 段5→段1（东京梦华…春郊），镜像画面空间：x 从右 160348 到左 0
  const ordered = [...segments].sort((a, b) => a.x_start - b.x_start)
  return (
    <PaperTabs
      ariaLabel="分段导览"
      items={ordered.map((s) => ({ id: s.id, label: s.title_zh }))}
      activeId={activeId}
      onSelect={(id) => {
        const seg = segments.find((s) => s.id === id)
        if (seg) onSelect(seg)
      }}
    />
  )
}
