import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Android 系统返回键 = 关闭 modal 而非退出页面（移动端规格 §3）：打开时压入一条历史，
 * popstate 即关闭；其他途径关闭（点遮罩/按钮）时把这条历史消费掉，保持栈深不漂移。
 * InfoModal 与「长卷宜宽屏」提醒共用（2026-07-13 抽出）。
 */
export function useBackClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const poppedByUser = useRef(false)
  useEffect(() => {
    if (!open) return
    poppedByUser.current = false
    window.history.pushState({ qmModal: true }, '')
    const onPop = () => {
      poppedByUser.current = true
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (!poppedByUser.current && window.history.state?.qmModal) {
        window.history.back()
      }
    }
  }, [open])
}

/**
 * 背景音乐（PRD：默认不播放）：首次点击从头播放（循环），再点暂停，再点从暂停处续播。
 * 桌面/移动壳层共用（2026-07-13 移动端适配时从 App.tsx 抽出）。
 */
export function useBgm() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [musicOn, setMusicOn] = useState(false)
  const toggleMusic = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/music/bgm.m4a')
      audioRef.current.loop = true
    }
    const audio = audioRef.current
    if (audio.paused) {
      void audio.play()
      setMusicOn(true)
    } else {
      audio.pause()
      setMusicOn(false)
    }
  }, [])
  useEffect(
    () => () => {
      audioRef.current?.pause()
    },
    [],
  )
  return { musicOn, toggleMusic }
}

/**
 * 卷首开合状态机（Figma 108:3836）：每次加载默认打开，无持久化；点「展阅」淡出 400ms 后卸载，可重开。
 * 首次进入 = 'first' variant（opaque 底图盖住画作，壳层 UI 全隐藏）；重开 = 'overlay'。
 * firstVisit 在首次关闭时就置 false——壳层在纸页 400ms 淡出期间同步滑入；
 * variant 用 ref 在整个 open→closing 周期内保持不变，莲花底图随纸页一起淡走、平滑露出画作。
 */
export function useIntroState() {
  const [introState, setIntroState] = useState<'open' | 'closing' | 'closed'>('open')
  const [firstVisit, setFirstVisit] = useState(true)
  const introVariant = useRef<'first' | 'overlay'>('first')
  const introTimer = useRef<number | undefined>(undefined)
  const closeIntro = useCallback(() => {
    setIntroState('closing')
    setFirstVisit(false)
    window.clearTimeout(introTimer.current)
    introTimer.current = window.setTimeout(() => setIntroState('closed'), 400)
  }, [])
  const reopenIntro = useCallback(() => {
    introVariant.current = 'overlay'
    window.clearTimeout(introTimer.current)
    setIntroState('open')
  }, [])
  useEffect(() => () => window.clearTimeout(introTimer.current), [])
  return { introState, firstVisit, introVariant, closeIntro, reopenIntro }
}
