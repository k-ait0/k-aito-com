# DWZ R4 第16.9版 — GitHub Actions 手動QA実行手順

## 実行の目的

このブランチだけで既存の `browser-qa.yml` にDWZの検証を追加しています。元のサイト全体の6画面幅ブラウザ試験も維持しています。**自動トリガーはありません。** GitHub PR #70、`main`、本番Xserverは変更しません。

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
4. `node scripts/test-dwz-origin-result-guard.cjs` — SKIP／欠落／重複が誤PASSしないことを11ケースで検証
5. Playwright Chromiumを一度だけ導入
6. `node scripts/dwz-origin-e2e.cjs` — 一時ローカルHTTPで基礎計算、ネイティブ`localStorage`保存→再読込→復元→削除。ブラウザ診断は必須項目の明示PASSが必要
7. `node scripts/browser-smoke.cjs` — **既存サイト全体の6画面幅ブラウザ回帰テスト**（元のチェックを維持）
8. 成功・失敗にかかわらず `qa-screenshots/*.png` を7日間の成果物として保存

プライベートな資産情報を使用せずダミー値だけで試験し、専用の新しいChromiumコンテキストを利用します。外部サービス・Xserver・本番環境への送信や書込は行いません。ワークフローはGitHubがホストするランナー上で手動実行されます。

## 現時点の事実（実行前）

- ローカルのNode.js構文検査：PASS。判定ガード単体テスト **11/11 PASS**。
- DWZ E2Eの最新Git blob SHA：`5be23fa208e217cbd188f52bb251eb04df41197e`。判定ガード：`147fa0efed60a6780e199113f204fc3a5dd8af4a`。
- HTTP応答検査：一時ローカルHTTPサーバーで2件PASS（診断ページは試験用HTML）。不正診断ページの負例は期待どおりFAIL。
- ローカルChromiumのURL遷移：`ERR_BLOCKED_BY_ADMINISTRATOR`。E2E結果は**未検証**であり、この環境ではスクリプトが終了コード3を返す。
- **GitHub Actionsの手動実行はまだ行っていない。**
- QAブランチの手動workflow以外、PR #70のサイト本体・ワークフローは変更していない。

## これで完了しない工程

GitHub上のlocalhostでE2EがPASSしても、**実公開HTTPSオリジン（Xserver）のテストではありません。** 実際の公開URL、iPad Safari実機、金融計算Coreの正式妥当性承認は別工程です。PR #70はDraftのままとします。

## 実行条件と注意

- 手動QA workflowは **`workflow_dispatch` のみ**。既存サイトの6画面試験が戻され、`timeout-minutes: 25` の上限を設定。GitHub Actionsは実行した時間に応じてリソースを消費するので、実行は必要な1回に限定。
- プレビューPR・手動QAブランチの **DWZ主要6ファイルのGit blob SHAが完全一致**することを事前確認済み（2026-11-06）。対象SHAの再確認は実行直前に行う。
- 判定ガードの重要6項目（通常）・5項目（永続保存）は **1項目でもSKIP、欠落、重複、FAILなら拒否**。負例含む11/11件のNode単体テストで確認。
- `node scripts/browser-smoke.cjs` は既存サイト全体の多画面ブラウザ試験であり、DWZ専用の`dwz-origin-e2e.cjs`とは別に必ず通す。結果のスクリーンショットはGitHubのアーティファクトで確認。
- **この手順書の更新はまだQA実行を意味しない。** 公開HTTPS／iPad Safari／金融計算Coreの正式承認は別途必須。

## WebKitと保存領域の独立性（2026-11-06 追加）

- `node scripts/dwz-origin-e2e.cjs` はデフォルトChromiumで実行。環境変数 `DWZ_BROWSER_ENGINE=webkit` を指定するとLinux WebKitで同じシナリオを実行する。
- QA workflowは既存サイトの6画面幅Chromium試験の後、Playwright WebKitをインストールし、DWZ専用のlocalhost E2Eを**もう一度WebKitで実行する**。最大25分の手動ジョブに収め、不要な反復起動は避ける。
- E2Eのアプリ本体と診断画面は **異なるBrowserContext** を使用。診断起動時に保存キー2件が空であることを確認し、先行試験に起因する保存スキップを防ぐ。外部ネットワーク要求0件も確認する。
- Node.js構文検査と診断結果ガード単体試験（11/11 PASS）、Chromium／WebKitの起動分岐・接続遮断時のfail-closed模擬試験（2/2 PASS）をローカルで実施。
- **重要：Linux WebKitはiPad Safari実機そのものではない。** WebKit E2EがPASSしてもiPad Safari実機受入・実Xserver HTTPSでの永続保存確認は別途必要。
- **まだGitHub Actionsは起動していない**。実際のWebKit/Chromiumでのlocalhost E2E結果は未確定。
