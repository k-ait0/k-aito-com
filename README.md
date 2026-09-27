# K. Aito / DIGITAL STORAGE

個人メディアの静的サイト。公開先: https://k-aito.com/

## 公開記事の共通管理

`content-index.js` が公開記事のメタデータと検索用本文の一次情報です。

- HOME の LATEST・検索: `app.js`
- 下層ページの共通検索: `site-search.js` / `site-search.css`
- SHELVES一覧の最近の記録・件数、ARCHIVEの時系列、および棚詳細・PROJECTSの公開記事: `site-content.js`
- `thinking`（その他）の記事はARCHIVEへ、`business`の記事はPROJECTSと事業の構想ページへ表示。
- 制作・開発の棚では、状態ラベルから完成品・制作中・構想に振り分ける。

## 記事を1本追加するとき

1. `notes/<slug>/index.html` と記事で利用する画像を配置する。
2. `content-index.js` に一意な `id`、`title`、`state`、`shelf`、`date`（YYYY.MM.DD）、`url`（/notes/<slug>/）、`tags`、`summary`、検索用本文 `searchText` を登録する。既存データの `id` と `url` は原則維持する。
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
- 新しい記事の本文と `searchText` の内容を一致させる。
- GitHubのワークフローが成功しただけでは、実際の端末での表示確認が完了したことにはならない。


## FINOWAの導線と最初の記事画像

- K. AitoのHOME・PROJECTS・ABOUTから、別サイトの `https://finowa.jp/` へリンクする。別リポジトリのFINOWAコードはここでは編集しない。
- 第1記事 `/notes/site-launch-trouble/` の記事内画像・HOMEのFIRST NOTEサムネイルは `assets/notebook-photo.webp` を使う（1680×1120）。
- 元サムネイル `assets/notebook-hq.jpg` は420×280であるため、単なるピクセル拡大ではなく高解像度の別写真に差し替えた。
- 写真: Kaboompics / Pexels「Wooden table with coffee and notebook with pen」
  https://www.pexels.com/photo/wooden-table-with-coffee-and-notebook-with-pen-4195334/
  Pexels License: https://www.pexels.com/license/
- `scripts/build-notebook-photo.py` と `.github/workflows/build-notebook-photo.yml` が画像をローカルWebP化する（画像差し替え・再生成時には出典・ライセンスを再確認する）。
