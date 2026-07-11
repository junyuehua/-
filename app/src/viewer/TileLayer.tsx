import { useEffect, useMemo, useState } from 'react'
import {
  CONTENT_H,
  CONTENT_W,
  TILE_MAX_LEVEL,
  TILE_MIN_LEVEL,
  TILE_OVERLAP,
  TILE_SIZE,
  tileUrl,
} from './constants'
import type { ViewState } from './useViewer'
import styles from './TileLayer.module.css'

/** 已加载过的瓦片（模块级缓存）：重新挂载时直接显示，不再走淡入 */
const loadedTiles = new Set<string>()

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

interface TileLayerProps {
  view: ViewState
  size: { w: number; h: number }
  /** 当前视口清晰度 0..1（视口内目标层级瓦片的加载比例），用于加载指示 */
  onClarity?: (ratio: number) => void
}

/**
 * 瓦片渲染层：按当前 zoom 选金字塔层级，只挂载覆盖视口的瓦片。
 * 底下常驻工作副本低清底图（ScrollCanvas 渲染），瓦片加载完成后淡入盖上——"低清先行、高清渐进"。
 */
export function TileLayer({ view, size, onClarity }: TileLayerProps) {
  // 选层：让瓦片像素 ≈ 屏幕像素（zoom > 1 时钳在最高层，纯放大）
  const level = clamp(
    TILE_MAX_LEVEL + Math.ceil(Math.log2(view.zoom)),
    TILE_MIN_LEVEL,
    TILE_MAX_LEVEL,
  )
  /** 该层级图像像素 : content 像素 */
  const levelScale = 2 ** (level - TILE_MAX_LEVEL)
  const levelW = Math.ceil(CONTENT_W * levelScale)
  const levelH = Math.ceil(CONTENT_H * levelScale)
  const cols = Math.ceil(levelW / TILE_SIZE)
  const rows = Math.ceil(levelH / TILE_SIZE)

  // 视口在该层级坐标系下的矩形 → 需要挂载的瓦片索引范围
  const x0 = clamp(Math.floor(((-view.tx / view.zoom) * levelScale) / TILE_SIZE), 0, cols - 1)
  const y0 = clamp(Math.floor(((-view.ty / view.zoom) * levelScale) / TILE_SIZE), 0, rows - 1)
  const x1 = clamp(
    Math.floor((((size.w - view.tx) / view.zoom) * levelScale) / TILE_SIZE),
    0,
    cols - 1,
  )
  const y1 = clamp(
    Math.floor((((size.h - view.ty) / view.zoom) * levelScale) / TILE_SIZE),
    0,
    rows - 1,
  )

  const tiles = useMemo(() => {
    const list: { key: string; url: string; x: number; y: number }[] = []
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        list.push({ key: `${level}/${x}_${y}`, url: tileUrl(level, x, y), x, y })
      }
    }
    return list
  }, [level, x0, x1, y0, y1])

  // 瓦片 onLoad 时 bump 版本触发重渲染，让清晰度和淡入状态更新
  const [, setLoadedVersion] = useState(0)

  const loadedCount = tiles.reduce((n, t) => n + (loadedTiles.has(t.url) ? 1 : 0), 0)
  const clarity = tiles.length === 0 ? 1 : loadedCount / tiles.length
  useEffect(() => {
    onClarity?.(clarity)
  }, [clarity, onClarity])

  return (
    <div
      className={styles.layer}
      style={{
        transform: `translate3d(${view.tx}px, ${view.ty}px, 0) scale(${view.zoom / levelScale})`,
      }}
    >
      {tiles.map((t) => (
        <img
          key={t.key}
          src={t.url}
          alt=""
          draggable={false}
          className={`${styles.tile} ${loadedTiles.has(t.url) ? styles.tileLoaded : ''}`}
          style={{
            left: t.x * TILE_SIZE - (t.x > 0 ? TILE_OVERLAP : 0),
            top: t.y * TILE_SIZE - (t.y > 0 ? TILE_OVERLAP : 0),
          }}
          onLoad={() => {
            loadedTiles.add(t.url)
            setLoadedVersion((v) => v + 1)
          }}
        />
      ))}
    </div>
  )
}
