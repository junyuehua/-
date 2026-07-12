import { useCallback, useRef, useState } from 'react'

/**
 * 滚动边缘渐隐共用状态（信息卡 / 卷首正文）：顶部/底部各自只在
 * "该方向还有内容滚出可读范围"时渐隐。消费方把 ref 挂到滚动容器、
 * onScroll 调 update，并在内容变化的 effect 里再调一次 update。
 * mask 渐隐 CSS 留在各组件的 module 里（渐隐带宽可不同）。
 */
export function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }))
  }, [])

  return { ref, fade, update }
}
