import { useRef } from 'react'
import thumbnail from '../../assets/qingming-scroll-working.jpg'
import styles from './NavBar.module.css'

/** 当前视口在整卷中的位置与大小，全部为 0..1 的分数坐标 */
export interface ViewportFraction {
  x: number
  y: number
  w: number
  h: number
}

interface NavBarProps {
  /** 传入则显示实时视口指示框 */
  viewport?: ViewportFraction
  /** 点击导航条跳转，参数为点击点的分数坐标 */
  onJump?: (fx: number, fy: number) => void
}

/** 底部通栏缩略图导航条（Figma 导航 65:98 / mockup 68:605）：铺满屏宽，高度随宽度等比缩放 */
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function NavBar({ viewport, onJump }: NavBarProps) {
  const innerRef = useRef<HTMLDivElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    if (!onJump || !innerRef.current) return
    const r = innerRef.current.getBoundingClientRect()
    onJump((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  }

  // 指示框 = 视口与画卷的交集：两端各自钳制进 [0,1] 再取差，保证任何视图状态下都不会伸出导航条
  const x0 = viewport ? clamp01(viewport.x) : 0
  const x1 = viewport ? clamp01(viewport.x + viewport.w) : 0
  const y0 = viewport ? clamp01(viewport.y) : 0
  const y1 = viewport ? clamp01(viewport.y + viewport.h) : 0

  return (
    <div className={styles.nav}>
      <div
        ref={innerRef}
        className={`${styles.inner} ${onJump ? styles.clickable : ''}`}
        onClick={handleClick}
      >
        <img className={styles.thumbnail} src={thumbnail} alt="清明上河图全卷缩略导航" draggable={false} />
        {viewport && (
          <div
            className={styles.indicator}
            style={{
              left: `${x0 * 100}%`,
              top: `${y0 * 100}%`,
              width: `${(x1 - x0) * 100}%`,
              height: `${(y1 - y0) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}
