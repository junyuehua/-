import sealArch from '../../assets/seals/seal-arch.svg'
import sealFigure from '../../assets/seals/seal-figure.svg'
import sealObject from '../../assets/seals/seal-object.svg'
import sealPlant from '../../assets/seals/seal-plant.svg'
import sealAnimal from '../../assets/seals/seal-animal.svg'
import styles from './CategorySeal.module.css'

export type Category = 'arch' | 'figure' | 'object' | 'plant' | 'animal'

/** 印章 SVG 从 Figma 分类标识 65:320 逐个导出，保留盖印毛刺质感，分类色已内嵌 */
const SEAL: Record<Category, { src: string; name: string }> = {
  arch: { src: sealArch, name: '建筑' },
  figure: { src: sealFigure, name: '人物' },
  object: { src: sealObject, name: '物件' },
  plant: { src: sealPlant, name: '植物' },
  animal: { src: sealAnimal, name: '动物' },
}

interface CategorySealProps {
  category: Category
}

export function CategorySeal({ category }: CategorySealProps) {
  const { src, name } = SEAL[category]
  return <img className={styles.seal} src={src} alt={name} width={32} height={32} draggable={false} />
}
