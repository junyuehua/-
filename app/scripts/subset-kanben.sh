#!/usr/bin/env bash
# 刻本宋（AaGuDianKeBenSongYMB）子集化：7.8MB TTF → 按实际内容提取字集的 woff2。
#
# 字集来源（--font-kanji 的全部使用处）：
#   - app/annotations.json 的 title_zh（信息卡标题——动态内容，加了新标注后需重跑本脚本）
#   - app/segments.json 的 title_zh（ListCard/分段标题）
#   - 固定 UI 文案：小屏提示标题、Showcase 页标题、聚合数字等（脚本内 EXTRA 常量）
# 缺字时浏览器回退到 Noto Serif SC（可读、仅风格略异）。
#
# 用法：在 app/ 目录下执行  bash scripts/subset-kanben.sh
set -euo pipefail
cd "$(dirname "$0")/.."

CHARS=$(python3 - <<'PY'
import json

chars = set()
with open('annotations.json', encoding='utf-8') as f:
    for a in json.load(f):
        chars.update(a.get('title_zh') or '')
with open('segments.json', encoding='utf-8') as f:
    for s in json.load(f):
        chars.update(s.get('title_zh') or '')

# 固定 UI 文案（ViewportGate 标题 / Showcase 标题 / 聚合数字 / 常用标点）
EXTRA = (
    '卧游·清明上河图'
    '组件库'
    '一二三四五六七八九众'
    '（）「」《》·、。？！'
)
chars.update(EXTRA)
chars.discard('\n')
print(''.join(sorted(chars)), end='')
PY
)

echo "字集共 ${#CHARS} 字"
python3 -m fontTools.subset src/assets/fonts/AaGuDianKeBenSongYouMoBan.ttf \
  --text="$CHARS" \
  --flavor=woff2 \
  --output-file=src/assets/fonts/KanbenSong-subset.woff2

ls -la src/assets/fonts/KanbenSong-subset.woff2
