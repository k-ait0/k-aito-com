# KAITO 全体改善監査・実行台帳 v1.0

確認日：2026-10-09 / 対象：`k-ait0/k-aito-com` / 本番：<https://k-aito.com/>

## 基本方針

- サイトの「デジタル物置」という世界観、生成り背景、緑系の配色、ロゴ、主要ナビゲーションは維持する。
- 記事の本文・実装済み機能・出典を勝手に短縮しない。
- 情報整合性 → 導線/発見性 → 検索/SEO/運用の順で改修する。
- GitHubへの保存とXServerの本番反映を分けて検証する。スマホ幅390px、PC幅1440pxのブラウザQAを継続する。

## フェーズ 1：記事・検索・一覧の同期

| 項目 | 状態 | 実装 |
| --- | --- | --- |
| サンケイビル記事の検索用本文が古い | 修正済み | `scripts/article-search-text.cjs` が本文を抽出 |
| 手入力の古い`searchText`が散在 | 修正済み | `content-index.js` の生成ブロックのみが正本 |
| HTML修正で再同期されない | 修正済み | `sync-published-content.yml` が `notes/**/index.html` も監視 |
| 非JSアーカイブの件数が古い | 修正済み | `scripts/sync-published-content.cjs` で件数・種類・月を同期 |
| 新規記事や既存加筆の再発テスト | 修正済み | `scripts/test-published-content.cjs` で新規・加筆・冪等性を検証 |
| 全記事の公開・端末チェック | 検証運用 | Browser QA / Live XServer verification |

### 更新時の原則

`notes/<slug>/index.html` が記事本文の一次情報。`content-index.js` はタイトル・タグ・日付・要約などのメタデータ、生成ブロックに機械抽出した検索本文を格納する。

`node scripts/test-published-content.cjs` → `node scripts/sync-published-content.cjs` → `node scripts/site-static-check.cjs` → デプロイ比較・ブラウザ検査で確認する。

## フェーズ 2：導線とページ構成（進行中）

| 優先 | 対象 | 確認された現状 | 修正の方向 |
| --- | --- | --- | --- |
| P1 | ホームのヒーロー | FIRST NOTEは維持 | **対応済み**：ヒーロー直下に最新記事1件を表示、次の記録を別枠へ配置。最新記事枠は公開台帳で自動更新 |
| P1 | 棚・一覧 | 7棚に対し公開記事4本。準備中を残す | **一部対応済み**：SHELVESにARCHIVE・KIDP・考察記事への案内を設置。カテゴリ自体のコンテンツ拡充は未実施 |
| P1 | 記事カード | ARTICLEラベルと文字面の白地を共通化 | **サムネイル2件を正式採用・本番展開済み**。残り2件は記事専用画像を検討 |
| P2 | プロジェクト一覧 | HOMEとPROJECTSで異なる制作段階表現が混在 | **カードの段階・公開区分は共通台帳へ統一済み**。COMING SOONやPROJECT FLOWの整理は残作業 |
| P2 | 記事回遊 | 7棚と記事導線が少なく孤立しやすい | 記事末から同カテゴリ/関連論考に誘導。推奨アルゴリズムは記事台帳ベース |

## フェーズ 2-D：サイト全体の白い文字面（本番確認済み）

ユーザー決定：「背景色は変えず、文字がある下地は白で統一」。

- `white-surfaces-v1.css` を全24公開ページに最後の共通CSSとして適用。
- 見出し、文章ボックス、記事カード、プロジェクトカード、棚、検索、KIDP説明面を対象にする。
- サイト全体の生成り背景・画像・濃緑フッターは維持。写真付きの棚は上部画像＋下部白い文字面。
- `scripts/sync-white-surfaces.cjs` で新規ページ追加時も強制適用。仕様：`docs/KAITO_WHITE_READING_SURFACES_v1_20261009.md`。
- **本番公開確認済み：GitHub Actions `37879203847` の再実行（attempt 2）で、XServer配信バイト照合58/58成功・失敗0、実サイトのPC／スマホChromium QA 460項目成功・失敗0。** 本番CSS `/white-surfaces-v1.css` もHTTP 200で一致。
- ローカルChromium QAも464項目成功・失敗0。PC／スマホの画面キャプチャでHOME・SHELVES・PROJECTS・ARCHIVE・ABOUTを目視確認。
- 通信障害履歴：2026-10-09の先行検証（`37877990150`、`37879203847` attempt 1）では起点サイトがタイムアウトしたが、後続の診断 `37880257877` は `k-aito.com` と `finowa.jp` のDNS・TCP・HTTPS 200を確認し、本番照合も再実行で成功。恒久的な配信障害だったとは断定しない。
- `www.k-aito.com` は診断時にDNS ENOTFOUND。通常の正規URL `https://k-aito.com/` は正常。www別名が必要ならドメイン設定側で対応する（未対応・低優先度）。
- 本番検証スクリプトは、到達不能・HTTP取得失敗・内容不一致を明確に分け、同時取得数を10に制限。補助診断：`scripts/diagnose-origin-network.cjs`。

## フェーズ 3：横断検索・SEO・運用（一部完了）

| 優先 | 対象 | 現状 | 検討内容 |
| --- | --- | --- | --- |
| P1 | 横断検索 | **公開記事4件＋公開プロジェクト詳細8件の横断検索を本番確認済み** | 24公開ページで共通検索を提供。XServer実体照合59/59・PC/スマホ470項目成功。非公開ベータは対象外 |
| P1 | 画像 | 既存画像からノート写真・原子力加工船の漫画の2点を採用 | HOME・ARCHIVE・SHELVES・WORKSに展開。WHYNOT／サンケイビル論考の2件は画像選定保留 |
| P2 | メタデータ | 一部は共通OG画像、構造化データには差 | 記事単位のOG/Article/BreadcrumbListの運用を設計 |
| P2 | 古いCSS | `article-v2.css`, `article-reading.css`, 旧`essay-reading.css` が混在 | 参照箇所を洗い、未使用が確認できたもののみ廃止する |
| P2 | Search Console | 本監査でKAITOの接続プロパティが確認できなかった | 所有権確認・サイトマップ送信・検索流入/索引状況の検証 |

## 今後の次工程

1. フェーズ2-A【実装済み】：ホームの最新記事スポットライト。FIRST NOTE維持、他の投稿との重複排除。関連ファイル：`discovery-v1.css`、`app.js`、`index.html`、`scripts/sync-published-content.cjs`。
2. フェーズ2-B【一部実装済み】：SHELVESに初回案内を追加。記事未公開のカテゴリ自体は準備中を表示。
3. フェーズ2-C【共通分類・表示は実装済み】：HOME／ARCHIVE／SHELVES／PROJECTS／各棚でARTICLEとPROJECTを区別。`cards-v1.css`と`data/project-card-status.v1.json`が正本。サムネイル2件を横展開済み。KIDP内部の全カード統一は次工程。
4. フェーズ3-A【実装・本番検証済み】：公開記事4件とプロジェクト詳細8件の横断検索。`project-search-index.js`は各HTMLから自動生成。`scripts/sync-project-search.cjs`、`scripts/test-project-search.cjs`、`site-search.js`、`app.js`を参照。

**最終確認（2026-10-09）：** GitHub Actions [本番検証 37887561491](https://github.com/k-ait0/k-aito-com/actions/runs/37887561491) は59項目のファイル照合が成功・失敗0、ブラウザ470項目成功・失敗0。`project-search-index.js`も本番でHTTP 200・バイト単位一致。スマホ検索欄の開閉不具合を修正済み。

5. フェーズ3-B【2記事本番採用済み】：原子力加工船とサイト公開記録の画像を`content-index.js`で共通管理、`thumbnail-v1.css`でカード表示統一、JSなしの静的一覧も画像を表示。WHYNOT／サンケイビル論考のサムネイル選定が残件。詳細は`docs/KAITO_SEARCH_AND_THUMBNAIL_AUDIT_20261009.md`。

**追加検証（2026-10-09）：** サムネイル実装の本番検証 [GitHub Actions 37889156156](https://github.com/k-ait0/k-aito-com/actions/runs/37889156156) では、配信ファイル60項目の一致、PC・スマホ486項目成功（失敗0）。ローカル側490項目成功（失敗0）。原画像と台帳、JSあり／なしの各一覧が一致。

**注意**：2026年10月9日現在の公開記事4本で判定。非公開ベータや外部FINOWAの記事はKAITO公開記事数に含めない。未実施の項目を完了扱いにしない。
