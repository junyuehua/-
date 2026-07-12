import type { Category } from '../components/CategorySeal/CategorySeal'

/** 标注点位 schema（PRD §4；坐标 = 真实完整卷轴分辨率 160348×7435 的 content-space 像素） */
export interface Annotation {
  id: number
  x: number
  y: number
  tags: string[]
  tier: '地标' | '场景' | '细节'
  title_zh: string
  title_en: string
  /** 正文；Markdown 约定：以 > 开头的行 = 金色引用块（空行分段），[文字](url) = 行内链接（PRD §4） */
  body_zh: string
  body_en: string
}

const TAG_TO_CATEGORY: Record<string, Category> = {
  建筑: 'arch',
  人物: 'figure',
  物件: 'object',
  植物: 'plant',
  动物: 'animal',
}

/** 首个 tag 决定 marker/印章用色；无 tag 的数据问题点位回退到物件色并在控制台告警 */
export function categoryOf(a: Annotation): Category {
  const cat = a.tags.length > 0 ? TAG_TO_CATEGORY[a.tags[0]] : undefined
  if (!cat) {
    console.warn(`[标注数据] id=${a.id}「${a.title_zh}」tags 为空或未知，暂按物件色显示`, a.tags)
    return 'object'
  }
  return cat
}

/* 注：分类色不再用于静止态 marker（2026-07-11 朱笔圈点改版，PRD §3.8）——
   分类身份只在悬停卡片的字印上揭示，字印 SVG 已内嵌各自分类色。 */
