import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconButton.module.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 20×20 icon，颜色继承字金 */
  icon: ReactNode
  /** 无障碍标签 */
  label: string
}

export function IconButton({ icon, label, className, ...rest }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} title={label} className={`${styles.button} ${className ?? ''}`} {...rest}>
      {icon}
    </button>
  )
}
