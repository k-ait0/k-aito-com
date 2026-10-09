# K. Aito / DIGITAL STORAGE

個人メディアの静的サイト。公開先: https://k-aito.com/

## 公開記事の共通管理

`content-index.js` が公開記事のメタデータと検索用本文の一次情報です。

- HOME の LATEST・検索: `app.js`
- 下層ページの共通検索: `site-search.js` / `site-search.css`
- SHELVES一覧の最近の記録・件数、ARCHIVEの時系列、および棚詳細・PROJECTSの公開記事: `site-content.js`
- `thinking`（その他）の記事はARCHIVEへ、`business`の記事はPROJECTSと事業の構想ページへ表示。
- 制作・開発の棚では、状態ラベルから完成品・制作中・構想に振り分ける。

## 記事・プロジェクトカードの共通分類（2026-10-09 フェーズ2-C）

- ARTICLESは `ARTICLE` と `THINK/MAKING` 等の編集状態を分けて表示する。
- PROJECTSは `PROJECT` と `DESIGNING/BUILDING/TESTING/OPERATING` 等の制作段階、さらに公開区分（未公開／詳細あり／試作あり／外部サイト）を分離する。
- 正式ルール：[KAITO カード表示・状態管理標準 v1.0](docs/KAITO_CARD_STANDARD_v1_20261009.md)
- 状態の正本：`data/project-card-status.v1.json`。HOME・PROJECTSの両ページへ `scripts/sync-project-cards.cjs` で反映。
- 共通CSS：`cards-v1.css`。記事一覧・棚・アーカイブ・プロジェクトカードへ適用。
- 未公開プロジェクトは操作できるリンクにしない。外部サイトへの移動は明示する。
- 変更後は `node scripts/test-project-cards.cjs` → `node scripts/sync-project-cards.cjs` → Browser QAと本番照合を実行する。

## ホーム・棚の回遊導線（2026-10-09 フェーズ2）

- HOMEのヒーローにある**FIRST NOTE**はサイトの原点として維持。
- 直下の `LATEST PICK` は記事台帳の最新の公開記事を表示。`scripts/sync-published-content.cjs` がHTMLの静的フォールバックを自動更新し、JavaScriptなしでも閲覧可能。
- `MORE NOTES` は注目記事との重複を避けて残りの公開記事を表示。見出し右から `/archive/` に直接移動。
- SHELVESは準備中の棚を偽装せず、`storage-discovery` で「全記事」「KIDP」「図解付き論考」の3導線を案内。
- `discovery-v1.css` がホーム・棚ページ専用スタイル。全サイトの配色、FIRST NOTE演出、既存の記事デザインは維持する。
- 今後の未着手課題は [全体改善監査台帳](docs/KAITO_SITE_AUDIT_20261009.md) に記載。

## KAITO記事の共通デザイン（2026-10-09 標準化）

公開済み記事はすべて、生成りのサイト背景に**白い記事紙面**を重ねるデザインに統一しました。

- 正式な共通スタイル：`article-reading.css`（`article-v2.css` と共存）
- 記事HTML：`body.subpage.essay-page`、`article.article-page`、`div.article-copy.essay-body`
- 長文の目次：`essay-toc`（必要なら `details` で折りたたむ）
- 仕様書：[KAITO 記事デザイン・制作標準 v1.0](docs/KAITO_ARTICLE_STYLE_GUIDE_v1_20261009.md)
- 新規記事用：[記事テンプレート v1.0](docs/KAITO_ARTICLE_TEMPLATE_v1.md)
- 既存4記事に適用済み。記事固有の図解・写真・Prototypeはそのまま残しています。

## 本文・検索・一覧の自動同期（2026-10-09）

記事本文の一次情報は `notes/<slug>/index.html` です。`content-index.js` はタイトル・日付・棚・タグ・要約を手動管理し、**検索用全文 `searchText` だけを自動生成**します。

- `scripts/article-search-text.cjs` は `.article-copy.essay-body` の本文から検索テキストを抽出する。
- `scripts/sync-published-content.cjs` は `content-index.js` の `BEGIN/END GENERATED ARTICLE SEARCH TEXT` ブロックを再生成し、`sitemap.xml`・ストレージ一覧・アーカイブ静的一覧／件数・全HTMLの検索用スクリプトキャッシュを同期する。
- 同期ワークフローは **`notes/**/index.html` の変更でも実行する**。今後は記事本文の変更のたびに `searchText` を手編集しない。
- 生成ブロックを直接編集しない。記事を変更したら `scripts/test-published-content.cjs` と `scripts/sync-published-content.cjs` を実行し、生成結果を反映する。
- GitHub Actions生成コミットはほかのワークフローを自動発火しない場合があるので、**本番公開とブラウザQAは生成結果が反映された最新コミットで確認する**。

## 記事を1本追加するとき

1. `notes/<slug>/index.html` と記事で利用する画像を配置する。
2. `content-index.js` に一意な `id`、`title`、`state`、`shelf`、`date`（YYYY.MM.DD）、`url`（/notes/<slug>/）、`tags`、`summary` を登録する。**検索用本文 `searchText` は生成されるので手入力しない。**既存データの `id` と `url` は原則維持する。
3. 両方を `main` に反映する。記事ページがないのにメタデータだけ公開しない。

`.github/workflows/sync-published-content.yml` が記事台帳の変更を検出すると、`scripts/sync-published-content.cjs` を実行し、次をGitHub Actionsの別コミットへ反映します。

- `sitemap.xml` の公開記事URL・公開日
- SHELVES一覧とARCHIVEの静的フォールバック記事一覧
- 各HTMLが読み込む `content-index.js` のキャッシュ識別子（内容のSHA-256から生成）

ワークフローは記事HTMLの存在、URLとIDの一致、棚、公開日の妥当性を検証します。**Actionsが失敗した場合は生成物が同期されないので、実行結果と公開先での反映を確認してください。** Github Actionsが生成したコミットのXServer Staticへの反映も確認してください。

手元で確認する場合は、Node.js 22で `node scripts/sync-published-content.cjs` を実行できます。生成結果は決定的で、同じ台帳から再実行しても差分は発生しません。

JavaScriptが無効の場合に備え、SHELVES一覧とARCHIVEの静的記事一覧も自動更新します。**棚詳細ページの個別セクションはJavaScriptによる記事一覧更新です。** JavaScript無効でもすべての棚の新着記事を一覧表示する要件が生じた場合は、静的生成の対象に追加します。

## 通常運用と本番公開チェック

公開記事を追加するときは、記事のHTMLと `content-index.js` の登録を同一の変更として反映します。台帳の同期が成功すると、SHELVES・ARCHIVEのフォールバック一覧と `sitemap.xml` が更新されます。

- `Browser and metadata QA` はサイトマップに掲載されたすべての公開ページをPC・スマホで検証します。新しい記事も固定リストへの追記なしで検証対象になります。
- `Live XServer deployment verification` はサイトマップから公開ページを取得し、XServerのHTMLがGitHubの想定ファイルと一致するか確認します。主要なCSS・JS・画像も照合します。
- XServerの反映時間を考慮して照合を再試行します。検証ワークフローが成功しても、最終的な文章・構図・写真の見え方は担当者が確認します。
- 新たな画像や補助リソースを追加したときは、必要に応じて `scripts/live-production-check.cjs` の主要リソース一覧も更新します。サイトマップの追加だけで全画像がバイト単位で照合されるわけではありません。
- 記事公開後は、検索、HOMEの最新記事、該当する棚、ARCHIVE、サイトマップ、本番記事URLを確認します。

## 運用上の注意

- 本番ブランチ: `main`
- 公開方式: XServer Static
- `.htaccess` は既存設定を確認せず変更・上書きしない。
- 新しい記事の本文から `searchText` が自動生成されていることを確認する。
- GitHubのワークフローが成功しただけでは、実際の端末での表示確認が完了したことにはならない。


## FINOWAの導線と最初の記事画像

- K. AitoのHOME・PROJECTS・ABOUTから、別サイトの `https://finowa.jp/` へリンクする。別リポジトリのFINOWAコードはここでは編集しない。
- 第1記事 `/notes/site-launch-trouble/` の記事内画像・HOMEのFIRST NOTEサムネイルは `assets/notebook-photo.webp` を使う（1680×1120）。
- 元サムネイル `assets/notebook-hq.jpg` は420×280であるため、単なるピクセル拡大ではなく高解像度の別写真に差し替えた。
- 写真: Kaboompics / Pexels「Wooden table with coffee and notebook with pen」
  https://www.pexels.com/photo/wooden-table-with-coffee-and-notebook-with-pen-4195334/
  Pexels License: https://www.pexels.com/license/
- `scripts/build-notebook-photo.py` と `.github/workflows/build-notebook-photo.yml` が画像をローカルWebP化する（画像差し替え・再生成時には出典・ライセンスを再確認する）。
