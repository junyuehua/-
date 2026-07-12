import { useEffect, useState } from "react";
import { AppBackground } from "../AppBackground/AppBackground";
import { PaperTabs } from "../PaperTabs/PaperTabs";
import { useScrollFade } from "../useScrollFade";
import { parseBlocks, renderInline } from "../InfoCard/markdown";
import introSeal from "../../assets/intro/intro-seal.png";
import introData from "../../../introContent.json";
import styles from "./ScrollIntro.module.css";

/** 卷首 tab 内容 schema（app/introContent.json，唯一源；*_en 留给下版本的英文支持） */
interface IntroTab {
  id: string;
  title_zh: string;
  title_en: string;
  body_zh: string;
  body_en: string;
}

const TABS = introData as IntroTab[];

/** 标题固定不变（字体子集只含这 5 个字，改字须重跑子集，见 fonts.css） */
const TITLE_CHARS = ["清", "明", "上", "河", "图"];

interface ScrollIntroProps {
  /** 点击 CTA「展阅」：淡出动画结束后由挂载方卸载 */
  onClose: () => void;
  /** false = 播放退场淡出（挂载方随后卸载） */
  visible: boolean;
  /**
   * first = 首次进入（刷新后第一次）：backdrop 为 opaque 网页底图，盖住画作与一切壳层；
   * overlay = 顶栏重开：无 backdrop，纸页直接浮在画面上（四周画作可见，交互被 wrapper 拦截）
   */
  variant: "first" | "overlay";
}

/**
 * 卷首（Figma 108:3836 / 150:1183）：1225×807 纸页（宣纸纹理）水平垂直居中，非全屏铺满。
 * 左列标题+朱印固定在纸页左；tab+正文在纸页内水平居中且左对齐；tab 固定只滚正文；
 * CTA 常驻纸页底部（上 24 / 下 48），正文滚动区止步于其上缘并做边缘渐隐（同信息卡）。
 */
export function ScrollIntro({ onClose, visible, variant }: ScrollIntroProps) {
  const [activeId, setActiveId] = useState<string>(TABS[0]?.id ?? "");
  const active = TABS.find((t) => t.id === activeId) ?? TABS[0];
  const { ref: bodyRef, fade, update: updateFade } = useScrollFade();

  // 切换 tab：滚回顶部并重算渐隐
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    updateFade();
  }, [activeId, bodyRef, updateFade]);

  return (
    <div
      className={`${styles.wrapper} ${visible ? "" : styles.wrapperHidden} ${variant === "overlay" ? styles.wrapperDismiss : styles.wrapperFirst}`}
      onClick={(e) => {
        // 重开形态：点纸页以外的背景（画面）也可关闭；首次进入只能走「展阅」
        if (variant === "overlay" && e.target === e.currentTarget) onClose()
      }}
    >
      {/* 首次进入：opaque 底图（渐变+莲花纹）盖住画作——画布仍挂载在其下预载瓦片 */}
      {variant === "first" && <AppBackground />}

      <div className={`${styles.sheet} ${variant === "first" ? styles.sheetFirst : ""}`}>
        {/* 首次进入的墨染（四版·生长窗口）：实色纸层带静态墨斑 mask，动画 transform:scale
            连续生长——纯色缩放不变，肉眼只见墨形边缘在洇开；transform 是合成器动画、
            mask 只光栅化一次，连续且不掉帧。纹理层独立淡入（multiply，渐进不可察） */}
        {variant === "first" && (
          <>
            <div className={styles.inkWindow} aria-hidden="true" />
            <div className={styles.inkTexture} aria-hidden="true" />
          </>
        )}
        {/* 左列：标题与朱印固定在纸页左侧，不随中央列居中 */}
        <aside className={styles.left}>
          <h1 className={styles.title} aria-label="清明上河图">
            {TITLE_CHARS.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </h1>
          <img
            className={styles.seal}
            src={introSeal}
            alt=""
            width={83}
            height={86}
            draggable={false}
          />
        </aside>

        {/* 中央列：水平居中，tab 与正文左对齐；tab 固定，正文独立滚动 */}
        <div className={styles.center}>
          <PaperTabs
            solid
            ariaLabel="卷首章节"
            items={TABS.map((t) => ({ id: t.id, label: t.title_zh }))}
            activeId={activeId}
            onSelect={(id) => setActiveId(String(id))}
          />
          <div
            ref={bodyRef}
            onScroll={updateFade}
            className={`${styles.body} ${fade.top ? styles.fadeTop : ""} ${fade.bottom ? styles.fadeBottom : ""}`}
          >
            {parseBlocks(active?.body_zh ?? "").map((b, i) =>
              b.type === "quote" ? (
                <div key={i} className={styles.citation}>
                  <span className={styles.citationBar} />
                  <p className={styles.citationText}>{renderInline(b.text)}</p>
                </div>
              ) : (
                <p key={i} className={styles.paragraph}>
                  {renderInline(b.text)}
                </p>
              ),
            )}
          </div>
        </div>

        {/* 底部区：CTA 常驻文字之上（上 24 / 下 48）。
            首次 =「展阅」（UI红，110:3601）；重开 =「关闭」（UI金，152:1270） */}
        <div className={styles.bottom}>
          <button
            type="button"
            className={`${styles.cta} ${variant === "overlay" ? styles.ctaClose : ""}`}
            onClick={onClose}
          >
            {variant === "first" ? "展阅" : "关闭"}
          </button>
        </div>
      </div>
    </div>
  );
}
