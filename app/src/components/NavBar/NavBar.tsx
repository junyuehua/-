import thumbnail from '../../assets/qingming-scroll-working.jpg'
import styles from './NavBar.module.css'

/** 底部通栏缩略图导航条（Figma 导航 65:98 / mockup 68:605）：铺满屏宽，高度随宽度等比缩放 */
export function NavBar() {
  return (
    <div className={styles.nav}>
      <img className={styles.thumbnail} src={thumbnail} alt="清明上河图全卷缩略导航" draggable={false} />
    </div>
  )
}
