import type { SVGProps } from 'react'
import InfoI from '@material-symbols/svg-400/outlined/info_i.svg?react'
import MusicNote from '@material-symbols/svg-400/outlined/music_note.svg?react'
import MusicOff from '@material-symbols/svg-400/outlined/music_off.svg?react'
import ViewRealSize from '@material-symbols/svg-400/outlined/view_real_size.svg?react'

/**
 * 图标统一来源：Google Material Symbols（outlined / wght400，与 Figma 使用的字重风格一致）。
 * 以后新增图标：去 https://fonts.google.com/icons 查名字，然后
 *   import Xxx from '@material-symbols/svg-400/outlined/<name>.svg?react'
 * 再照下面包一层默认 20px + currentColor 即可（打包只含实际 import 的图标）。
 */
function withIconDefaults(Icon: React.FC<SVGProps<SVGSVGElement>>) {
  return function ThemedIcon(props: SVGProps<SVGSVGElement>) {
    return <Icon width={20} height={20} fill="currentColor" {...props} />
  }
}

export const InfoIIcon = withIconDefaults(InfoI)
export const MusicNoteIcon = withIconDefaults(MusicNote)
export const MusicOffIcon = withIconDefaults(MusicOff)
export const ViewRealSizeIcon = withIconDefaults(ViewRealSize)
