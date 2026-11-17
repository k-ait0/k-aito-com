# A05 Tier2 v37｜実結果画面へのオプトイン隔離接続とChromium実E2E

更新：2026-11-17 JST。対象は `k-ait0/k-aito-com` Draft PR #77。16モチーフ正本は `A05_16寓意_採用16種_v13.xlsx` と `docs/A05_VISUAL_CANONICAL_MOTIFS_V30.json`。**本番公開・mainマージ・採点ルール・診断保存データ・既存タイプ判定には変更なし。**

## この版で実装した内容

- A05実ファイル `projects/kidp/life-design-lab/a05/app.mjs` の既存 `renderResult()` 内に、新規の `renderTier2Review()` を追加。既存Tier1手動表示 `renderVisualPreview()` および結果ヘッダー・5軸スコア・共有・履歴は保持。
- **通常URLでは表示されない**。開発用 URL パラメータ `?a05_tier2_review=1` を明示した時だけTier2レビュー欄が出る。未承認のTier2画像の本番配信や常時表示をしない。
- 新規 `tier2-review.mjs` と `tier2-review.css`：正式に採用された16のうち先行4種 **世界樹（SC-11）・ペガサス（CA-11）・鴉天狗（CC-10）・カーバンクル（CC-00）** だけを手動選択可能。
- この機能は**ユーザーが選択したローカル画像**を読み込み、現在のブラウザタブのメモリにのみ保持する。PNG / JPEG / WebP、12MiB以下、最大2000万画素。SVGや任意URLの埋め込みを拒否。画像のアップロード通信・IndexedDBへの保存・JSONエクスポート/共有・結果データへの紐付けをしない。
- 画像未選択時は既存Tier1のSVG紋章を代替表示し、未承認であることを常にラベル表示。
- `RGBY` は全4色のCSS外枠で手動切替。`E` は未割当/経済的余裕/時間的自由。**分類ロジックからモチーフや色を推論しない**。
- 世界樹は原画に近い`1229/1280`比率と共通`3/4`の表示枠を切替。主画像はすべて `object-fit:contain`。
- ペガサスの96px一覧用サムネイルに限り、全体表示と`cover`＋倍率1.30の試案を比較。**切り抜き試案は未承認**。安全領域7%のガイドを手動表示。

## 検証結果

### Node契約・静的試験

`scripts/test-a05-visual-tier2-review-v37.mjs` を作成し、既存の16モチーフ固定、Tier1 SVG、表示契約テストと同じGitHub Actionsに追加。
- 採用4IDと未採用IDの拒否、Tier1代替表示、画像data URIの検証、4RGBY×3E状態、ペガサス限定の96px比較、実結果ページでの明示URLオプトイン、CSS `contain` を確認。
- `A05 visual canonical lock` workflow **PASS**（v37コード変更後のGitHub Actions成功）。

### 実A05結果画面のChromiumスモーク

- `scripts/qa-a05-tier2-result-v37.cjs` を追加。実リポジトリをGitHub Actionsのランナーへcheckoutし、実際の `index.html`・`app.mjs`・`style.css` と全依存ファイルをローカルHTTPサーバーで読み込む。従来の `page.set_content()` で作った独立デモではない。
- Chromium／PlaywrightによるT11サンプル結果画面を使用。個人の診断データは使用しない。
- **320 / 390 / 768 / 1280pxすべてPASS**：横はみ出しなし、ローカルPNGフィクスチャ読込とデコード、世界樹の自然比/共通3:4切替、RGBY（B）枠線、E軸time、7%ガイド、ペガサス96px比較、画像のモチーフごと切替、削除とページ再読込後の非保持、通常URLではTier2欄が存在しないことを検査。
- **結果ヘッダーと5軸スコアは操作前後で不変**。HTTP POSTなし、未処理JavaScriptエラーなし。
- GitHub Actions `A05 Tier2 result-view browser smoke` **成功、Run ID: 43925725949**（`https://github.com/k-ait0/k-aito-com/actions/runs/43925725949`）。ランナーUbuntu 26.04上のPlaywrightブラウザインストールに失敗したため、**Ubuntu 24.04に固定して再実行しPASS**。
- **ブラウザQAに用いた画像はテスト用1×1 PNG**。過去の大きな世界樹・ペガサス原画の本物のバイト列をこのActionsには追加していない。従って「4作品の本番画像がすべて実A05でQA合格」とは主張しない。

## 運用方法（開発プレビューのみ）

1. PR #77のブランチ `feature/a05-visual-contract-v15-20261111` をチェックアウトしてローカルWebサーバーを起動する（画像をそのまま開く `file://` ではモジュール制限が起きる場合がある）。
2. `http://localhost:<port>/projects/kidp/life-design-lab/a05/?a05_tier2_review=1` を開く。
3. 「結果のサンプルを見る」からT11またはT14へ進む。これらの旧Tタイプ結果と16寓意は**自動では紐付かない**。
4. 新しく現れる「Tier2 原画・結果画面レビュー（開発専用）」から4モチーフを選択。会話のv31/v27/v34/v33の原画を端末で選択し、RGBY・E・比率・安全域を確認する。
5. 通常URL、再読み込み、ブラウザタブ終了では画像が保持されない。

## 未完了のゲート

- 現在のGitHub PRにはTier2のPNG/WebP本体を登録していない。**未承認の原画の自動公開は回避**。
- 実際の大きな世界樹/ペガサス/鴉天狗/カーバンクルのバイト列を用いた本A05の画面・描画品質の人間レビューは未実施。小サイズのペガサスの翼端カットも未承認。
- Safari / VoiceOver、スマホ実機、画像の権利・IP類似性、Tier1 24pxの人間識別性、C/D→RGBY・E軸・A/B→16寓意の心理測定契約、正式美術承認は未完了。
- 現状：選定16/16、Tier1 SVG初稿16/16、Tier2独立原画試作4/16、**Tier2正式承認0/16**、本番公開NO-GO、PR #77はDraft・未マージ。

## 次の一手

**先行4作品の現物を実結果画面の開発モードへ読み込み、PC・スマホで見切れ/視認性を人間が評価する。** 合格した画像のみ原画受入（由来・SHA256・寸法・ライセンス/類似性・承認記録）へ進め、残り12種類へ段階展開する。
