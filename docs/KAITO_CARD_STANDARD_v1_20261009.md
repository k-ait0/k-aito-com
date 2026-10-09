# KAITO カード表示・状態管理標準 v1.0

制定：2026-10-09 / 適用：HOME・SHELVES・ARCHIVE・PROJECTS・各テーマ棚

## 1. 最優先の情報構造

カードは内容の種類・状態・利用可能性を混同させない。

| 要素 | 記事 / ARTICLE | プロジェクト / PROJECT |
| --- | --- | --- |
| 種類（必須） | ARTICLE | PROJECT |
| 状態 | THINK、MAKING、RESEARCH など記事の編集状態 | DESIGNING、BUILDING、TESTING、OPERATING など制作段階 |
| 利用可能性 | 記事が公開されていれば「読む」リンク | 詳細ページ、外部サイト、試作品、未公開を区別 |
| 主な操作 | 記事へ移動 | PROJECT NOTE / EXTERNAL SITE / VIEW PROTOTYPES / PREPARING |

**THINKやMAKINGは記事の内容や執筆の種類を指し、プロジェクトの開発段階ではない。**  
**FOCUSは優先して取り組む対象を指し、公開状態や利用可能性ではない。**

## 2. ステータス台帳

正本：`data/project-card-status.v1.json`。現在の登録は4件。

| ID | 現在の段階 | 公開区分 | 導線 |
| --- | --- | --- | --- |
| `digital-storage` | OPERATING / 公開・運用中 | INTERNAL / 詳細ページあり | PROJECT NOTE |
| `tabi-route` | DESIGNING / 設計・データ構築中 | PREPARING / 未公開 | リンクなし、PREPARING |
| `finowa` | BUILDING / サイト・ツール開発中 | EXTERNAL / 外部サイト公開 | EXTERNAL SITE |
| `kidp` | TESTING / 試作・テスト中 | PROTOTYPE / 試作あり | VIEW PROTOTYPES |

FINOWAはKAITOとは別の公開サイトであると明示する。KIDPで閲覧できるのは制作シリーズと個別試作への導線であり、すべての試作品が一般公開可能であると保証しない。

## 3. 実装ファイル

- `cards-v1.css`：種類ラベル・段階表示・公開区分・CTAの共通視覚ルール。
- `app.js`：HOMEのARTICLEカード。
- `site-content.js`：SHELVES、ARCHIVE、カテゴリのARTICLEカード。
- `scripts/sync-published-content.cjs`：JavaScriptなしの一覧HTMLへARTICLEラベルを書き出す。
- `data/project-card-status.v1.json`：プロジェクトカードの制作段階・公開状態・CTAテキストの正本。
- `scripts/sync-project-cards.cjs`：HOMEとPROJECTS双方のPROJECTラベルを更新。
- `scripts/test-project-cards.cjs`：1つの台帳変更が両ページに反映されること、複数回実行しても差分が出ないことを確認。
- `scripts/browser-smoke.cjs`：モバイル・PCでARTICLE / PROJECT、公開/未公開、リンク先を検証。

## 4. 新規追加・更新時のチェック

1. 新規記事は `content-index.js` に必要なメタデータを登録し、`notes/<slug>/index.html` を公開する。検索本文は自動生成。カードにはARTICLE種別が付く。
2. 新規プロジェクトはまず `data/project-card-status.v1.json` に種類とは独立した「段階」「公開区分」「操作名」を登録する。HOMEとPROJECTSのカード両方に同じ`data-project-id`を付け、`data-project-stage`、`data-project-access`、`data-project-action`を配置する。
3. 未公開カードは `<a>` にしない。ユーザーが操作できるように見える装飾を付けない。
4. 外部サイトカードには `target="_blank"` と `rel="noopener noreferrer"` を使い、外部遷移を明示する。
5. 既存の写真・アイコンを急に差し替えない。共通ラベルは控えめで、KAITOの紙面・生成り・緑の基調を優先する。
6. Node.jsの同期・回帰テスト、ブラウザQA、XServer公開ファイル照合を実施する。

## 5. 残作業

- 記事ごとの個別サムネイル採用・最適化（元画像の権利・トーン統一を確認して段階的に）。
- KIDPの「試作ページ」「テストレビュー」「制作記事」の各種カードも同一の種類・段階・アクセス表示へ将来統合。
- PROJECTSのCOMING SOON枠、PROJECT FLOWのFOCUS/QUEUE/INCUBATE/REFERENCEを本台帳の制作段階と混同させない表示改善。
- 将来5件以上のプロジェクトが増えたときに、同期スクリプトの固定4件制約を拡張する。

本仕様は**カードの分類・状態・リンクの表示ルール**。記事本文のデザイン標準は `docs/KAITO_ARTICLE_STYLE_GUIDE_v1_20261009.md` を参照。
