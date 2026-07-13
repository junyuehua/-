import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AUTO_PAN_RESUME_TAU_MS,
  AUTO_PAN_SPEED_PX_S,
  AUTO_PAN_STOP_TAU_MS,
} from './constants'

export interface AutoPanControls {
  /** 已到卷尾停住（不循环）——驱动重播按钮的"从头再来"语境 */
  ended: boolean
  /** 重播用：清 ended、速度乘子归 0（与 resetToStart 配对调用，淡入后从卷首缓起） */
  restart: () => void
}

/**
 * 卧游/神游共用的自动平移引擎（PRD §3.2）：rAF 循环每帧向左（tx 正方向）推进，
 * 锁屏幕速度恒定——放大后卷上推进自然变慢，贴近细看时多停留。
 *
 * 与镜头层的分工：useViewer 是模式无关的相机物理层，本 hook 是模式策略层，
 * 只通过 panBy / isAnimating / dragging 三个窄接口耦合。
 * 帧级仲裁：auto-pan 是唯一的增量写入者，animateTo 是唯一的绝对写入者，
 * animateTo 在跑（单击放大/分段跳转）时本帧让路，动画毕无缝续推；
 * 滚轮缩放走同步 apply，与增量平移天然可组合——"缩放不打断平移"。
 *
 * 暂停信号分两类：
 * - 软暂停（缓停/缓起）：hoverPaused——速度乘子向 0/1 指数逼近，天然处理中途反转；
 * - 硬暂停（跳过本帧）：dragging（scrub，乘子归零、松手从 0 缓起恒向左）、
 *   isAnimating、ended（卷尾 latch，用户拖拽倒带或 restart() 才清除）。
 */
export function useAutoPan(args: {
  enabled: boolean
  panBy: (dxScreen: number) => { atEnd: boolean }
  isAnimating: () => boolean
  dragging: boolean
  hoverPaused: boolean
}): AutoPanControls {
  const { enabled, panBy, isAnimating, dragging, hoverPaused } = args

  const [ended, setEnded] = useState(false)
  const endedRef = useRef(false)
  // 悬停/拖拽信号同步进 ref：rAF 循环只依赖 enabled 重建，悬停变化不撕重建循环
  const hoverRef = useRef(hoverPaused)
  hoverRef.current = hoverPaused
  const draggingRef = useRef(dragging)
  draggingRef.current = dragging
  /** 速度乘子 0..1（缓停/缓起的插值状态） */
  const mulRef = useRef(0)

  // panBy/isAnimating 进 ref，避免其引用变化重建循环（useViewer 的 useCallback 依赖稳定，双保险）
  const panByRef = useRef(panBy)
  panByRef.current = panBy
  const isAnimatingRef = useRef(isAnimating)
  isAnimatingRef.current = isAnimating

  // 用户开始拖拽（scrub）时清 ended：倒带离开卷尾后松手可重新推进，再撞边界重新 latch
  useEffect(() => {
    if (dragging && endedRef.current) {
      endedRef.current = false
      setEnded(false)
    }
  }, [dragging])

  useEffect(() => {
    if (!enabled) return
    mulRef.current = 0 // 切入卧游/神游：从 0 缓起，不硬弹
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) // 挂起标签页回来不暴冲
      last = now
      // 速度乘子指数逼近目标（悬停→0 缓停，移开→1 缓起；中途反转自然平滑）
      const target = hoverRef.current ? 0 : 1
      const tau = target < mulRef.current ? AUTO_PAN_STOP_TAU_MS : AUTO_PAN_RESUME_TAU_MS
      mulRef.current += (target - mulRef.current) * (1 - Math.exp(-dt / tau))
      if (draggingRef.current) mulRef.current = 0 // scrub 期间归零，松手从 0 缓起
      const hard = draggingRef.current || endedRef.current || isAnimatingRef.current()
      if (!hard && mulRef.current > 0.001) {
        const { atEnd } = panByRef.current(AUTO_PAN_SPEED_PX_S * (dt / 1000) * mulRef.current)
        if (atEnd) {
          endedRef.current = true
          setEnded(true)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled])

  const restart = useCallback(() => {
    endedRef.current = false
    setEnded(false)
    mulRef.current = 0
  }, [])

  return { ended, restart }
}
