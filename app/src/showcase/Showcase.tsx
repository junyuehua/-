import { useState } from 'react'
import { AppBackground } from '../components/AppBackground/AppBackground'
import { CategorySeal, type Category } from '../components/CategorySeal/CategorySeal'
import { IconButton } from '../components/IconButton/IconButton'
import { InfoCard } from '../components/InfoCard/InfoCard'
import { ListCard } from '../components/ListCard/ListCard'
import { ModeToggle, type ViewMode } from '../components/ModeToggle/ModeToggle'
import { NavBar } from '../components/NavBar/NavBar'
import { ScaleControl, ScaleToast } from '../components/ScaleControl/ScaleControl'
import { MusicNoteIcon, TranslateIcon, ViewRealSizeIcon } from '../components/icons'
import circle1 from '../assets/markers/circle-1.svg'
import circle2 from '../assets/markers/circle-2.svg'
import circle3 from '../assets/markers/circle-3.svg'
import clusterBlob from '../assets/markers/cluster-blob.svg'
import styles from './Showcase.module.css'

const CATEGORIES: Category[] = ['arch', 'figure', 'object', 'plant', 'animal']

/** 组件库对照页：访问 /?showcase 查看，用于和 Figma 验收比对 */
export function Showcase() {
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
          <h2 className={styles.sectionTitle}>信息卡片 InfoCard（含引用块）</h2>
          <div className={styles.row}>
            <InfoCard category="arch" title="孙羊正店">
              {'彩楼欢门高扎，灯箱上书「正店」二字。北宋汴京酒楼分「正店」与「脚店」——正店有酿酒权，全城仅七十二户；脚店须向正店[批发酒水](https://example.com)。门前车马络绎，是全卷最繁华的一角。\n\n> 在京正店七十二户，此外不能遍数，其余皆谓之脚店。\n> ——《东京梦华录·卷二》'}
            </InfoCard>
            <InfoCard category="figure" title="送炭人">
              前后一对人正赶着驴队往城内运送木炭。
            </InfoCard>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>标记 Marker（三种手绘朱圈 × 三档层级 / 聚合计数）</h2>
          <div className={styles.markerRow}>
            {([28, 18, 12] as const).map((d) =>
              (
                [
                  { src: circle1, aspect: 21.0105 / 19.8224 },
                  { src: circle2, aspect: 17.8501 / 18.037 },
                  { src: circle3, aspect: 17.2631 / 18.2047 },
                ] as const
              ).map((v, i) => (
                <img
                  key={`${d}-${i}`}
                  src={v.src}
                  alt=""
                  style={{ height: d, width: d * v.aspect }}
                  className={styles.markerDemo}
                />
              )),
            )}
            <span className={styles.clusterDemo}>
              <img src={clusterBlob} alt="" />
              <span>五</span>
            </span>
            <span className={styles.clusterDemo}>
              <img src={clusterBlob} alt="" />
              <span>众</span>
            </span>
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
