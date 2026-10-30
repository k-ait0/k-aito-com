# A05 R1｜S5 v0.1 非公開比較画面・実装およびQA記録

**2026-10-30 JST / S5-PREVIEW-001 / 正式S5受入0/8・公開 NO-GO**

## 目的・実装範囲

S4 v0.4の静的編集原案136組を画面から閲覧できるようにする。`feature/a05-r1-s5-manual-comparison-preview-20261030` をS4 v0.4ブランチから派生させた。既存`index.html`・`app.mjs`・質問・採点・本番への導線は未変更。

- ページ：`projects/kidp/life-design-lab/a05/r1-s5-preview.html`
- スタイル：`projects/kidp/life-design-lab/a05/r1-s5-preview.css`
- 表示：`projects/kidp/life-design-lab/a05/r1-s5-preview.mjs`
- 静的原本：`docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json`
- Node検証コード：`scripts/test-a05-r1-s5-preview.mjs`
- Playwright検証コード：`scripts/qa_a05_r1_s5_browser.cjs`

実装した表示：16タイプから手動2タイプ選択、選択順序の反転、RGBYキャラクター表示、A〜D各軸の左/右ラベルと「共通・相違」、ペア固有の未承認文章候補、最大3個の対話質問。P0では2問。他者との相性点・ランキング・成功率・関係別適合は表示しない。B2研究候補のスコアや自動分類に接続しない。

入力は2タイプ選択のみ。選択IDはURLやネットワークに付けない。同一オリジンから静的な136組JSONを初回一度取得し、以後はメモリー上で切り替える。ローカル履歴、Cookie、IndexedDB、localStorage、sessionStorage、第三者計測や埋込は設けない。CSP、`noindex,nofollow,noarchive`、テキストDOM安全表示、キーボード操作に配慮したラベル、320px向けレイアウトを設計した。

## 現時点で実行した検証

GitHubの実ファイルを**保存後に再取得**し、隔離JS環境で以下を構造検証した。

| チェック | 結果 |
|---|---|
| v0.4の組合せID | 136/136 一意 |
| 16×16の順序付き2タイプ選択 | 256/256 全部に正規ペア |
| 軸相違数の分布 0〜4 | 16 / 32 / 48 / 32 / 8 |
| 4軸の合計 | 136/136 整合 |
| 人手・科学・公開承認 | 136/136 未承認を保持 |
| 画面のID参照 / 相対データパス / CSP / 禁止API静的検査 | 不一致0 |

**実施していない**：native Nodeでのテスト実行、Playwright/Chromeの画面操作、Safari/VoiceOver/実端末の表示、実際の通信監査、個人情報の実ランタイム検証、C1〜C7の独立人手レビュー、S5の正式受入。これらを静的検査と取り違えないこと。現作業環境はGitHubへの`git clone`がDNSで失敗するため、ネイティブテスト実行環境を準備できなかった。GitHub Actionsは使用しない。

## ローカルQAの実行方法

ローカルで当該ブランチをチェックアウト後、リポジトリルートから：

```sh
node --test scripts/test-a05-r1-s4-contextual112-v04.mjs
node --test scripts/test-a05-r1-s5-preview.mjs
python3 -m http.server 8765 --bind 127.0.0.1
# 別ターミナル（Playwright と Chrome をローカルにインストール）
node scripts/qa_a05_r1_s5_browser.cjs
```

その後、ブラウザで`http://127.0.0.1:8765/projects/kidp/life-design-lab/a05/r1-s5-preview.html`を開く。`file://`ではfetchが動作しない場合があるため使用しない。画面上は320/390/768/1280px、キーボード、VoiceOver、通信・保存ゼロ、読みやすさ、B1の誤読を評価する。

## 残る課題

1. S4 v0.4の112組は旧4定型フレーズこそ検出0だが、新しい定型構文が112/112組に残る。人手C1〜C7レビューと文章改稿は必要。
2. 2026-10-29版の正規Excel/CSV原本とGitHub原本のバイト照合が未完了。S1の構成概念・旧16タイプ扱いも未承認。
3. S5の正式8条件、S6の9条件、S7の7条件、S8の5条件は0のまま。**本番NO-GO**。

## 進捗の境界

これは「S5の非公開UIプロトタイプをGitHubに追加」という開発成果であり、「公開画面の品質受入」ではない。人手承認、マージ、デプロイ、本番導線変更、GitHub Actions使用は行わない。
