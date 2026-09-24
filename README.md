# K. Aito / DIGITAL STORAGE

個人メディアの静的サイト。公開先: https://k-aito.com/

## 公開記事の管理

`content-index.js` に公開記事のメタデータと検索用テキストをまとめています。次の表示は同じ一覧を参照します。

- HOME の LATEST と記事検索: `app.js`
- 下層ページの共通検索: `site-search.js` / `site-search.css`
- SHELVES 一覧の最近の記録・件数と ARCHIVE の時系列: `site-content.js`

新しい記事を公開するとき:

1. `notes/<slug>/index.html` を公開する。
2. `content-index.js` に一意な `id`、`title`、`state`、`shelf`、`date`（YYYY.MM.DD）、`url`（/notes/.../）、`tags`、`summary`、検索用本文 `searchText` を登録する。記事本文と検索テキストを矛盾させない。
3. 関連する棚の詳細ページに載せたい場合、該当ページの編集も行う。棚の個別セクションはまだ自動生成していない。
4. `sitemap.xml`、必要に応じて静的HTMLのフォールバックも更新する。
5. インデックス更新時には各ページの `content-index.js?v=...` のキャッシュ番号を更新し、記事リンク・検索・スマホ表示を確認する。

JavaScriptを無効にした場合でもARCHIVEとSHELVESの既存HTMLは表示できますが、記事追加時にはその静的HTMLも更新が必要です。

## 運用上の注意

- 本番ブランチ: `main`
- 公開方式: XServer Static
- `.htaccess` は既存設定を確認せずに変更・上書きしない。
- CSS・画像・JSのキャッシュ指定と、参照する実ファイルの存在を確認する。
