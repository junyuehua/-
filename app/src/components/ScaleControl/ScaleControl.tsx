import { IconButton } from '../IconButton/IconButton'
import { ViewRealSizeIcon } from '../icons'
import styles from './ScaleControl.module.css'

interface ScaleToastProps {
  /** 实物比例百分比，如 234 */
  percent: number
}

export function ScaleToast({ percent }: ScaleToastProps) {
  return (
    <div className={styles.toast}>
      实物比例：{percent}%
    </div>
  )
}

interface ScaleControlProps {
  percent: number
  onResetScale?: () => void
}

/** 缩放控制簇：比例 toast + 恢复实际大小按钮（Figma 70:2434 + 70:2236，间距 8px） */
export function ScaleControl({ percent, onResetScale }: ScaleControlProps) {
  return (
    <div className={styles.control}>
      <ScaleToast percent={percent} />
      <IconButton icon={<ViewRealSizeIcon />} label="恢复实际大小" onClick={onResetScale} />
    </div>
  )
}
