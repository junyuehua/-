import { useCallback, useEffect, useRef, useState } from 'react'
import { IconButton } from '../IconButton/IconButton'
import { AlternateEmailIcon } from '../icons'
import { TOAST_HIDE_MS } from '../../viewer/constants'
import styles from './CopyEmailButton.module.css'

/** 联系邮箱（2026-07-13 用户提供）——纯复制，不做任何 mailto/唤起邮件客户端行为（用户拍板） */
const CONTACT_EMAIL = 'junyuehua@gmail.com'

/**
 * 复制邮箱按钮（右上角按钮群最左侧，桌面/移动共用）：点击把地址写进剪贴板，
 * 按钮正下方弹出「已复制邮箱地址」toast（复用比例 toast 视觉，右缘对齐按钮），停留后自动消失。
 */
export function CopyEmailButton() {
  const [toastVisible, setToastVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
    } catch {
      // 非安全上下文/旧内核兜底：临时 textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = CONTACT_EMAIL
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setToastVisible(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastVisible(false), TOAST_HIDE_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <div className={styles.wrap}>
      <IconButton icon={<AlternateEmailIcon />} label="复制邮箱地址" onClick={copy} />
      <div
        className={`${styles.toast} ${toastVisible ? styles.toastVisible : ''}`}
        role="status"
        aria-live="polite"
      >
        已复制邮箱地址
      </div>
    </div>
  )
}
