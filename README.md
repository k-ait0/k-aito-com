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

## 運用上の注意

- 本番ブランチ: `main`
- 公開方式: XServer Static
- `.htaccess` は既存設定を確認せず変更・上書きしない。
- 新しい記事の本文と `searchText` の内容を一致させる。
- GitHubのワークフローが成功しただけでは、実際の端末での表示確認が完了したことにはならない。
