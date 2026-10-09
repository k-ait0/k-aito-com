# KAITO 記事デザイン・制作標準 v1.0

策定日：2026-10-09  
対象：k-aito.com の公開記事（`/notes/<slug>/`）  
基準ページ：[報道は誰のためにあるのか](https://k-aito.com/notes/media-public-interest-sankei-building/)

## 1. デザイン原則

**サイト全体の背景は生成りのまま維持し、記事だけを白い紙面として囲う。** KAITOの「デジタル物置」という世界観と、読み物としての可読性を両立する。

- **外側の背景**：従来の `--paper: #f6f4ea` を変更しない。
- **記事の紙面**：純白 `#fff`。淡い境界線 `#d9dfd5`、控えめな影、柔らかい角丸。
- **記事カード幅**：最大860px。本文は最大760pxを目安とする。
- **内側の余白**：PC `46px 49px 52px`、760px以下 `28px 24px 34px`、420px以下 `21px 16px 28px`。
- **文字組み**：記事タイトル・章見出しは明朝系（`var(--serif)`）、長い本文はゴシック系（`var(--font)`）。本文は約1.075rem / 行高2.03（狭い画面では調整）。
- **セクション**：見出し前に十分な余白、章の開始に薄い罫線。見出し階層は `h1 > h2 > h3`。
- **色**：既存の濃緑を軸にする。本文の色は濃い灰緑。強調色を乱用しない。
- **図解**：出典・注記・代替テキストを付ける。スマホで横長の図を縮小し過ぎる場合は、拡大・横スクロールを提供。
- **表**：基本的に横スクロール可。図と重複する補助データは必要に応じて `details` で折りたたむ。
- **目次**：長文では導入と本文の間に設置。長い目次は `details` に格納して紙面を圧迫しない。
- **内容**：デザイン変更時に本文を勝手に要約・削除・改稿しない。図表・出典・既存の機能を維持する。

## 2. 実装に使用するファイル

| ファイル | 役割 |
| --- | --- |
| `article-v2.css` | 既存記事の基礎的な共通レイアウト |
| **`article-reading.css`** | **KAITO記事標準の一次実装（白い紙面、文字組み、図解、目次）** |
| `pages.css`・`subpages.css` | サイト全体の構造・ナビゲーション |
| `kidp-article.css` | KIDP記事固有の機能・図解 |
| `content-index.js` | 記事の公開台帳・検索テキスト |
| `scripts/site-static-check.cjs` | 全記事の構造・CSS参照チェック |
| `scripts/browser-smoke.cjs` | PC・スマホの見え方・JS・画像読み込みの確認 |
| `scripts/live-production-check.cjs` | XServer本番とGitHub `main` の配信ファイル照合 |

※旧 `essay-reading.css` はサンケイビル記事の試作段階で使った名称。共通化後は `article-reading.css` を使用する。

## 3. 新規公開記事の必須HTML構造

詳細なコピーベースは `docs/KAITO_ARTICLE_TEMPLATE_v1.md` を参照。

1. bodyに `class="subpage essay-page"` を指定する。
2. `<link rel="stylesheet" href="/article-reading.css?v=更新識別子">` をサイト共通CSSの後に読み込む。
3. ページのmainに `class="page-wrap article-layout"` を指定する。
4. 主記事は `<article class="article-page">` を用いる（固有クラス併用可）。
5. 記事本文は `<div class="article-copy essay-body">` を用いる。
6. 記事外の前後リンク・下層ページの導線は既存構造を維持する。
7. h2ごとに固定IDを付け、目次を置く場合はリンク整合を確認する。
8. 主要図解には `alt` と出典・注記を明示する。

## 4. 横展開の実施状況

2026-10-09に確認した公開記事全4本が対象。

| 記事 | パス | 実施内容 |
| --- | --- | --- |
| サンケイビル売却と知る権利 | `/notes/media-public-interest-sankei-building/` | 白い紙面・7章目次・図解4点・補助表の折りたたみ |
| 原子力加工船という妄想 | `/notes/nuclear-industrial-carrier/` | 共通の白い紙面・文字組み・11章目次、固有図解を維持 |
| WHYNOT制作記録 | `/notes/kidp-002-whynot/` | 共通の白い紙面・文字組み・8章目次、Prototype埋め込みを維持 |
| サイト公開トラブル | `/notes/site-launch-trouble/` | 共通の白い紙面・文字組み、表紙写真と記事内容を維持 |

## 5. 公開と品質確認のチェックリスト

- [ ] 新規記事の `notes/<slug>/index.html` と画像が作成済み
- [ ] 共通body・article・article-copyのクラスと共通CSS読み込み
- [ ] canonical、OG、説明文、日付、出典、`content-index.js` が一致
- [ ] 目次のアンカーが有効、画像が表示され、外部リンクが適切
- [ ] スマホ390px幅で横はみ出しなし。図・表の必要な部分は操作可能
- [ ] PC 1440px幅で白い紙面の左右に生成りの背景が見える
- [ ] 論考の事実・主張・仮説、金融系記事の事業数値の出典が区別されている
- [ ] Browser and metadata QAに成功
- [ ] Live XServer deployment verificationで記事HTML・共通CSS・必要画像を照合
- [ ] **GitHubへのコミットだけを公開完了とみなさない。** 本番の記事URLも確認する

## 6. 更新時のルール

共通デザイン変更は基本的に `article-reading.css` を編集する。新しいクラスの導入はこの仕様書も更新する。個別記事独自のチャートやUIは別CSSへ切り出し、基本紙面の色・幅・本文フォントを重複定義しない。既存記事への大幅な変更時は、4本すべてで表示を検証する。

本標準はKAITO用であり、FINOWAのデザイン規格とは分けて管理する。
