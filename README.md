# K. Aito / DIGITAL STORAGE

個人メディアの静的サイト。公開先: https://k-aito.com/

## CI運用（Actions最小化）

開発の検証はローカルを優先し、GitHub Actionsは手動実行のみ。[運用方針](docs/GITHUB_ACTIONS_POLICY.md) と [AGENTS.md](AGENTS.md) を参照。作業後は `node scripts/local-preflight.cjs` で確認し、本番反映の実機検証は手動で実施する。

## 公開記事の共通管理

`content-index.js` が公開記事のメタデータと検索用本文の一次情報です。

- HOME の LATEST・検索: `app.js`
- 下層ページの共通検索: `site-search.js` / `site-search.css`
- SHELVES一覧の最近の記録・件数、ARCHIVEの時系列、および棚詳細・PROJECTSの公開記事: `site-content.js`
- `thinking`（その他）の記事はARCHIVEへ、`business`の記事はPROJECTSと事業の構想ページへ表示。
- 制作・開発の棚では、状態ラベルから完成品・制作中・構想に振り分ける。

## 記事サムネイルの共通管理（2026-10-09）

- `content-index.js` の `thumbnail:{src,alt}` を**唯一のサムネイル台帳**とする。サムネイル未採用の記事は白いテキストカードを維持する。
- 採用済み：サイト公開記録 `/assets/notebook-photo.webp`、原子力加工船 `/assets/notes/nuclear-industrial-carrier/manga-01.webp`。
- HOMEは `app.js`、SHELVES・ARCHIVE・各テーマ棚は `site-content.js`、静的フォールバックは `scripts/sync-published-content.cjs` から共通参照する。
- `thumbnail-v1.css` で16:9のカード表示とアーカイブの2列レイアウトを調整。全24公開ページへ `scripts/sync-white-surfaces.cjs` がCSSを自動追加する。
- 画像の実在・容量・代替テキストは同期時に検査し、PC・スマホの画像読み込みはブラウザQAで検証する。
- 未採用のWHYNOT・サンケイビル論考には無関係な画像を充当しない。[検索・サムネイル監査台帳](docs/KAITO_SEARCH_AND_THUMBNAIL_AUDIT_20261009.md) に残作業を記録。

## 公開記事・プロジェクト横断検索（2026-10-09）

- HOMEの検索と、各下層ページのヘッダー検索に、`ARTICLE` / `PROJECT` の区別付きの共通検索を実装。
- 記事の検索本文：`content-index.js` の公開記事4件（`scripts/article-search-text.cjs` がHTMLから生成）。
- プロジェクト検索：`project-search-index.js`（`scripts/sync-project-search.cjs` がサイトマップ掲載の公開詳細8ページから生成）。個別ページの概要、タイトル、制作段階、本文を利用。
- すべての公開ページで検索インデックスを`app.js`または`site-search.js`より先に読み込む。
- 未公開`noindex`ベータ・サイトマップ外の試作は検索しない。
- `scripts/test-project-search.cjs`で8件・24ページの読み込み漏れと冪等性を検証。`scripts/browser-smoke.cjs`でHOME・下層ページ双方の結果を確認。
- サムネイル候補と採用保留理由は [検索・サムネイル監査台帳](docs/KAITO_SEARCH_AND_THUMBNAIL_AUDIT_20261009.md) へ保存。

## KAITOの文字面を白く統一（2026-10-09 v1.0）

「外側は生成り、読む面は白、写真は写真のまま」をサイト全体の規格にする。

- 共通CSS：`white-surfaces-v1.css`。各公開HTMLの**最後のスタイルシート**として適用。
- 自動横展開：`scripts/sync-white-surfaces.cjs`。公開サイトマップ全24ページへ適用し、以後も漏れを防止。
- 対象：HOME/SHELVES/ARCHIVE/PROJECTS/KIDP/ABOUT/LINKS/各テーマ/記事/検索の各テキスト面。
- 例外：サイト全体の生成り、濃色フッター、画像主体の背景・ヒーロー装飾は維持。写真のある棚カードには白い文字面を敷く。
- 設計資料：[KAITO 白い文字面デザイン標準 v1.0](docs/KAITO_WHITE_READING_SURFACES_v1_20261009.md)
- 品質確認：`scripts/browser-smoke.cjs` に白・非白・画像保持の検証を追加。公開確認はXServer照合と併用。

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
3. 記事HTMLと台帳を作業ブランチに保存し、ローカル同期・QAの結果として生じた生成物も同じPRへ含める。レビュー後にまとめて `main` へ統合する。記事ページがないのにメタデータだけ公開しない。

**2026-10-21以降の標準運用：記事・索引の同期はローカルで行い、生成物も同じPRに含めます。** `Sync published article index` の自動pushトリガーは停止し、`workflow_dispatch`（手動実行）のみ維持します。これにより、マージ後にActionsが別コミットを作ってXServerの公開版と食い違う問題を予防します。

記事や索引を変更する場合：

```bash
node scripts/test-published-content.cjs
node scripts/sync-published-content.cjs
node scripts/local-preflight.cjs
git diff --check
git diff --stat
```

生成された`content-index.js`の検索本文、`sitemap.xml`、HOME/SHELVES/ARCHIVEの静的一覧、記事内の前後リンク・「次に見る」、読み込みキャッシュ識別子の変更を**ソース変更と同じPRでレビュー・コミット**してください。

Actions側の手動同期は、ローカル実行できない緊急復旧などに限定します。手動実行した場合は、生成後コミットのSHAとXServerの配備履歴を必ず照合してください。公開ページを変更したコミットに対する`Live XServer deployment verification`は引き続き自動実行され、リリース時の配信整合性チェックは残します。

ローカル生成スクリプトは同じ入力に対して冪等であることを単体テストしています。**本番復旧については別管理の[Issue #52](https://github.com/k-ait0/k-aito-com/issues/52)が未解決です。**

JavaScriptが無効の場合に備え、SHELVES一覧とARCHIVEの静的記事一覧も自動更新します。**棚詳細ページの個別セクションはJavaScriptによる記事一覧更新です。** JavaScript無効でもすべての棚の新着記事を一覧表示する要件が生じた場合は、静的生成の対象に追加します。

### 同期方式の改訂履歴

| 版 | 日付 | 変更前 | 変更後 | 理由・対象 |
| --- | --- | --- | --- | --- |
| 1.0 | 2026-10-09 | 記事変更をpush検出してActionsで索引とHTMLを別コミット生成 | 同左 | 記事検索・一覧を自動同期 |
| 1.1（PR審査中） | 2026-10-21 | `main`のpushで自動生成コミット | PR内で生成済み成果物を提出、Actionsは手動復旧専用 | XServerで生じた生成コミットの公開不一致とActions消費を抑制。対象：`sync-published-content.yml`・記事更新手順 |

## GitHub Actionsを使わないローカルQA（2026-10-21）

日常のHTML・記事・検索UI修正は、Node.js 22環境で以下を実行し、**PRに生成物を含めてから**レビューする。GitHub Actions、XServerへのデプロイ、Playwrightのインストールはいずれも発生しない。

```bash
node scripts/local-preflight.cjs
```

検査内容：自動生成物とコミット済みHTMLの一致、生成チェックの回帰、公開記事・前後記事リンク、共通シェル・パンくず、検索、HTML参照、静的SEO。生成チェックは一時ディレクトリ上で同期処理を再実行し、実際の作業ツリーを変更しない。

**生成物差分が検出された場合**は、対応するソースを見直してから以下を実行する。

```bash
node scripts/sync-published-content.cjs
git diff --check
git diff --stat
node scripts/local-preflight.cjs
```

同期で変更されたHTML・`content-index.js`・`sitemap.xml`もPRに含める。これで「PRマージ後のActions生成コミットだけが公開先に配備されない」リスクを低減できる。

**注意：** ローカルQA合格はPRマージや公開の承認ではない。主要UIの変更では手動ブラウザQA、公開時にはXServerの配備履歴・配信62ファイルの一致・主要画面の動作確認を別途行う。XServerへの反映不一致は[Issue #52](https://github.com/k-ait0/k-aito-com/issues/52)で追跡中であり、このQAでは解消しない。

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

## SEO監査（2026-10-09）

- `node scripts/audit-seo.cjs` で `sitemap.xml` 掲載の全公開ページを読み取り専用で監査する。
- エラー：HTML不在、title/description欠落、canonical不一致、noindex混入、robotsのサイトマップ指定欠落。エラー時は終了コード1。
- 警告：OGP、H1、JSON-LDの欠落。警告だけでは終了コードを変更しない。
- 記事の公開・修正時は `node scripts/sync-published-content.cjs` の後に監査を実行する。
- JSON-LDはページ種別と公開情報に合わせて実装し、未確認の日付・著者属性・画像を推測で追加しない。
- この監査は静的HTMLの検証であり、本番HTTP応答・Search Console・リッチリザルト適格性は別途確認する。

### 構造化データの検証

SEO監査はJSON-LDの有無に加え、JSONとして解析可能か、`@context`と`@type`があるかを検証する。`/notes/`以下の記事はArticle系タイプの有無も警告する。構造化データ未設定の一覧・プロジェクトページは現状警告扱いとし、実態に合わないschemaを機械的に追加しない。
