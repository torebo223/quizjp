#!/usr/bin/env bash
# 地図データ（data/*.geojson）を作り直すスクリプト。通常は実行不要（生成済みのものをコミットしている）
# 元データ: smartnews-smri/japan-topography（国土数値情報 行政区域データ 2021年 を簡素化したもの）
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
curl -sSL -o "$tmp/dc.json" https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/topojson/s0010/N03-21_210101_designated_city.json
# 政令指定都市は区をまとめて1つの市にする。飛び地は同じ市町村コードでまとめる
npx -y mapshaper@0.6.102 -i "$tmp/dc.json" \
  -each 'name=N03_004||N03_003, pref=N03_001, code=N03_007' \
  -filter 'code!=null' \
  -dissolve code copy-fields=name,pref \
  -simplify 25% keep-shapes \
  -filter-islands min-area=3km2 \
  -o precision=0.005 format=geojson data/municipalities.geojson
npx -y mapshaper@0.6.102 -i data/municipalities.geojson -dissolve pref -o precision=0.005 format=geojson data/prefectures.geojson
rm -rf "$tmp"
