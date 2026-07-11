#!/bin/zsh
# 从全分辨率原始扫描件生成 DeepZoom (DZI) 瓦片金字塔 → app/public/tiles/
#
# 依赖：brew install vips
# 输出：public/tiles/qingming.dzi + qingming_files/{0..18}/{x}_{y}.jpg（约 368MB，已 gitignore）
#
# 坐标系说明（勿改拼接顺序！）：
#   官方坐标系 = 160348×7595（已切卷首金色装裱画，见 PRD §5）
#   内容 x 轴从左到右 = 4.jpg → 3.jpg → 2.jpg → image1-已裁金色画.jpg（卷首在最右）
#   与 清明上河图-完整拼接.jpg（master）及所有已标注坐标一致，改动会导致全部锚点漂移
set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT=".."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# vips CLI 对含空格路径的多文件参数不友好，先做无空格软链
ln -sf "$PWD/$PROJECT_ROOT/Full scroll/4.jpg" "$TMP/s4.jpg"
ln -sf "$PWD/$PROJECT_ROOT/Full scroll/3.jpg" "$TMP/s3.jpg"
ln -sf "$PWD/$PROJECT_ROOT/Full scroll/2.jpg" "$TMP/s2.jpg"
ln -sf "$PWD/$PROJECT_ROOT/image1-已裁金色画.jpg" "$TMP/s1c.jpg"

echo "== 逐段水平拼接（约 9GB 临时 .v 文件，结束自动清理）=="
vips join "$TMP/s4.jpg" "$TMP/s3.jpg" "$TMP/j1.v" horizontal
vips join "$TMP/j1.v" "$TMP/s2.jpg" "$TMP/j2.v" horizontal
vips join "$TMP/j2.v" "$TMP/s1c.jpg" "$TMP/full.v" horizontal
vipsheader "$TMP/full.v"  # 应为 160348x7595

echo "== 切瓦片（512px / overlap 1 / JPEG Q80）=="
mkdir -p public/tiles
cd public/tiles
rm -rf qingming.dzi qingming_files
vips dzsave "$TMP/full.v" qingming --tile-size 512 --overlap 1 --suffix ".jpg[Q=80]"

du -sh qingming_files
echo "完成：public/tiles/qingming.dzi"
