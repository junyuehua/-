import { useState } from 'react'
import { AppBackground } from './components/AppBackground/AppBackground'
import { CategorySeal, type Category } from './components/CategorySeal/CategorySeal'
import { IconButton } from './components/IconButton/IconButton'
import { InfoCard } from './components/InfoCard/InfoCard'
import { ListCard } from './components/ListCard/ListCard'
import { ModeToggle, type ViewMode } from './components/ModeToggle/ModeToggle'
import { NavBar } from './components/NavBar/NavBar'
import { ScaleControl, ScaleToast } from './components/ScaleControl/ScaleControl'
import { MusicNoteIcon, TranslateIcon, ViewRealSizeIcon } from './components/icons'
import styles from './App.module.css'

const CATEGORIES: Category[] = ['arch', 'figure', 'object', 'plant', 'animal']

export default function App() {
  const [mode, setMode] = useState<ViewMode>('learn')

  return (
    <>
      <AppBackground />
      <main className={styles.showcase}>
        <h1 className={styles.pageTitle}>清明上河图 · 组件库</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>模式切换 ModeToggle</h2>
          <div className={styles.row}>
            <ModeToggle value={mode} onChange={setMode} />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>按钮 IconButton</h2>
          <div className={styles.row}>
            <IconButton icon={<MusicNoteIcon />} label="背景音乐" />
            <IconButton icon={<TranslateIcon />} label="切换语言" />
            <IconButton icon={<ViewRealSizeIcon />} label="恢复实际大小" />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>分类印章 CategorySeal</h2>
          <div className={styles.row}>
            {CATEGORIES.map((c) => (
              <CategorySeal key={c} category={c} />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>信息卡片 InfoCard</h2>
          <div className={styles.row}>
            <InfoCard category="arch" title="孙羊正店">
              彩楼欢门高扎，灯箱上书「正店」二字。北宋汴京酒楼分「正店」与「脚店」——正店有酿酒权，全城仅七十二户；脚店须向正店
              <a href="#" onClick={(e) => e.preventDefault()}>
                批发酒水
              </a>
              。门前车马络绎，是全卷最繁华的一角。
            </InfoCard>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>列表卡片 ListCard</h2>
          <div className={styles.row}>
            <ListCard
              items={[
                { category: 'figure', label: '说书人' },
                { category: 'figure', label: '船夫' },
                { category: 'object', label: '漕船' },
                { category: 'animal', label: '猪' },
                { category: 'object', label: '酒杯' },
              ]}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>缩放控制 ScaleControl（比例 toast + 恢复 1:1）</h2>
          <div className={styles.row}>
            <ScaleControl percent={234} />
            <ScaleToast percent={100} />
          </div>
        </section>
      </main>

      <div className={styles.navSlot}>
        <NavBar />
      </div>
    </>
  )
}
