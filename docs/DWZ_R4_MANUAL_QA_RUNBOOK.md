# DWZ R4 第16.9版 — GitHub Actions 手動QA実行手順

## 実行の目的

このブランチだけで既存の `browser-qa.yml` を検証用に置き換えています。**自動トリガーはありません。** GitHub PR #70、`main`、本番Xserverは変更しません。

検証対象：研究用アプリ `lab/dwz/index.html` とブラウザ診断 `lab/dwz/diagnostics.html`。

## GitHub UIから一度だけ実行

1. `https://github.com/k-ait0/k-aito-com/actions/workflows/browser-qa.yml` を開く。
2. **Run workflow** を選択し、ブランチに **`dwz-r4-v16-9-manual-qa-20261106`** を指定する。**`main` や `dwz-r4-v16-5-xserver-preview` は選ばない。**
3. 対象ブランチとチェックアウトSHAを確認してから Run workflow を実行する。GitHub Actionsの利用時間が発生する場合があります。
4. 実行ページで各ステップと最終の成功／失敗を確認し、実行URL、SHA、失敗ログをPR #70に記録する。

## この1回の実行で行う内容

1. `node scripts/check-actions-manual-only.cjs` — 全11 workflowの手動専用ポリシー確認
2. `node scripts/local-preflight.cjs` — K. Aitoサイト共通の14検証
3. `node scripts/dwz-preflight.cjs` — DWZの固定Coreハッシュ、HTML、CSP、入力等28条件
4. Playwright Chromiumを一度だけ導入
5. `node scripts/dwz-origin-e2e.cjs` — 一時ローカルHTTPで基礎計算、同一ブラウザのネイティブ`localStorage`保存→ページ再読み込み→復元→削除、シナリオ保存、診断画面の通常／保存試験

プライベートな資産情報を使用せずダミー値だけで試験し、専用の新しいChromiumコンテキストを利用します。外部サービス・Xserver・本番環境への送信や書込は行いません。ワークフローはGitHubがホストするランナー上で手動実行されます。

## 現時点の事実（実行前）

- ローカルのNode.js構文検査：PASS。
- スクリプトのGit blob SHA：`23ea0f3e222cf61087bcbc96e84b5609c8d8e03e`。
- HTTP応答検査：一時ローカルHTTPサーバーで2件PASS（診断ページは試験用HTML）。不正診断ページの負例は期待どおりFAIL。
- ローカルChromiumのURL遷移：`ERR_BLOCKED_BY_ADMINISTRATOR`。E2E結果は**未検証**であり、この環境ではスクリプトが終了コード3を返す。
- **GitHub Actionsの手動実行はまだ行っていない。**
- QAブランチの手動workflow以外、PR #70のサイト本体・ワークフローは変更していない。

## これで完了しない工程

GitHub上のlocalhostでE2EがPASSしても、**実公開HTTPSオリジン（Xserver）のテストではありません。** 実際の公開URL、iPad Safari実機、金融計算Coreの正式妥当性承認は別工程です。PR #70はDraftのままとします。
