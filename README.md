# ご当地ピン（仮）

日本のご当地もの（特産品・建造物・ご当地もの・アニメ漫画のゆかりの地）の場所を、日本地図にピンを刺して当てるジオゲッサー風クイズ。PCブラウザ向け。

## 遊び方
`index.html` をブラウザで開くだけで遊べます（外部への通信はGoogle Fontsのみ）。

## 構成
- `index.html` — ビルド済みのゲーム本体（`tools/build.js` が生成。直接編集しない）
- `src/head.html` — 見た目（CSS）と画面の骨組み
- `src/game.js` — ゲームの処理（地図の拡大・移動、ピン、採点、ヒント）
- `data/questions.tsv` — 問題データ
- `data/municipalities.geojson` / `data/prefectures.geojson` — 地図データ（簡素化済み）
- `tools/build.js` — データを埋め込んで `index.html` を作る。問題の座標が正解の市の中にあるかも検査する
- `tools/fetch_map.sh` — 地図データの作り直し（通常は不要）
- `docs/企画書.md` — 企画書

## 問題の追加
`data/questions.tsv` に1行追加して `node tools/build.js` を実行します。列はタブ区切りで次の8つです。

| 列 | 内容 | 例 |
|---|---|---|
| 分類 | 特産品 / 建造物 / オブジェクト / アニメ | 特産品 |
| 名前 | お題 | 夕張メロン |
| 都道府県 | 正式名 | 北海道 |
| 市 | 答えの市（町村は使わない。東京は区） | 夕張市 |
| 緯度・経度 | 答えの地点（その市の中） | 43.057 / 141.974 |
| 市のヒント | ヒント3で出る文 | かつて炭鉱で栄えたまち |
| メモ | 答え合わせで出る豆知識 | 赤肉メロンの代表格。… |

## 出典
地図データ: 国土数値情報（行政区域データ）（国土交通省）を加工して作成。加工データは [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography) を利用。
