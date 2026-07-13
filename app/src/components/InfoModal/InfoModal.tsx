import { createPortal } from 'react-dom'
import { InfoCard } from '../InfoCard/InfoCard'
import { useBackClose } from '../../shellHooks'
import { categoryOf, type Annotation } from '../../viewer/annotations'
import styles from './InfoModal.module.css'

interface InfoModalProps {
  /** 被 tap 的点位；null = 关闭（组件常挂载，由挂载方控制） */
  annotation: Annotation | null
  onClose: () => void
}

/**
 * 移动端信息 modal（移动端规格 §3 + Figma 219:1674）：tap 标识点直接出卡，居中浮于
 * #241607@50% 遮罩之上；同一时间只有一张（annotation 单值天然保证）。
 * 关闭：点遮罩 / Android 系统返回键（history 拦截），关闭后直接回到画面。
 * 卡片复用桌面 InfoCard，宽度 = min(100vw−48, 420)——横屏/iPad/折叠屏不摊宽；
 * 高度定死上限、超出走 InfoCard 内部滚动，modal 自身绝不超出屏幕。
 */
export function InfoModal({ annotation, onClose }: InfoModalProps) {
  // Android 返回键关闭（历史栈拦截）：逻辑在 shellHooks.useBackClose，与「长卷宜宽屏」提醒共用
  useBackClose(annotation !== null, onClose)

  if (!annotation) return null

  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      {/* 卡片区不冒泡：点卡片本身（含内部滚动/链接）不关闭 */}
      <div className={styles.holder} onClick={(e) => e.stopPropagation()}>
        <InfoCard
          className={styles.card}
          category={categoryOf(annotation)}
          title={annotation.title_zh || '（未命名）'}
        >
          {annotation.body_zh}
        </InfoCard>
      </div>
    </div>,
    document.body,
  )
}
