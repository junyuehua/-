import { useCallback, useEffect, useRef, useState } from 'react'
import { AUDIO_IDS } from './generated/audioIds'
import { BGM_DUCK_VOLUME } from './viewer/constants'

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
  // 听画朗读时压低（不暂停）背景音乐；朗读结束/中断恢复。音乐没开时是无害的 no-op
  const duckMusic = useCallback((on: boolean) => {
    const a = audioRef.current
    if (a) a.volume = on ? BGM_DUCK_VOLUME : 1
  }, [])
  useEffect(
    () => () => {
      audioRef.current?.pause()
    },
    [],
  )
  return { musicOn, toggleMusic, duckMusic }
}

/**
 * 听画朗读（2026-07-13）：唤出信息卡即从头朗读，卡关闭立即停，重开从头。
 * `audioId` = 当前打开卡片的标注 id（无卡时传 null）；`enabled` = 听画总开关；
 * `duckMusic` = 播报时压低 BGM。实现要点：effect 依赖 audioId+enabled——
 * 每次开卡新建 Audio（天然从头）；卡关闭（id→null）或切卡或关开关触发 cleanup 停播 + 恢复 BGM。
 */
export function useNarration(
  audioId: number | null | undefined,
  enabled: boolean,
  duckMusic: (on: boolean) => void,
) {
  useEffect(() => {
    if (!enabled || audioId == null || !AUDIO_IDS.has(audioId)) return
    const audio = new Audio(`/audio/${audioId}.mp3`)
    let ducked = true
    duckMusic(true)
    audio.play().catch(() => {
      if (ducked) {
        duckMusic(false)
        ducked = false
      }
    })
    const onEnded = () => {
      if (ducked) {
        duckMusic(false)
        ducked = false
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.pause()
      audio.removeEventListener('ended', onEnded)
      if (ducked) duckMusic(false)
    }
  }, [audioId, enabled, duckMusic])
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
