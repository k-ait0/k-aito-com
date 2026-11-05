# A05 D-88｜B/C独立尺度・12問プレビュー実装記録

記録日：2026-11-05 JST／対象：PR #61 Draftブランチ／ステータス：**未承認・未公開**。

## 成果物
- 質問データの唯一の入力原本：docs/A05_D87_BC_PILOT_20261105.json（D-87を変更しない）
- 独立集計：projects/kidp/life-design-lab/a05/bc-pilot-engine.mjs
- 非公開プレビュー：projects/kidp/life-design-lab/a05/bc-pilot-preview.html
- インタラクション：projects/kidp/life-design-lab/a05/bc-pilot-preview.mjs
- Node単体テスト：scripts/test-a05-bc-pilot.mjs
- Chromium E2E：scripts/qa_a05_bc_pilot_browser.cjs
- 手動QAワークフローへの追加：.github/workflows/kidp-wave-a-browser-qa.yml

## 動作と互換性
1. 旧30問 \`questions.mjs\`、旧採点エンジン、旧タイプ名、旧履歴、既存のプレビューを変更しない。
2. 研究用のD-87 12問のうち、自己裁量／つながり／将来達成／現在充実を各3問の独立した重視度として採点する。
3. 各尺度3問が整数1～7で揃う場合のみ平均を表示。未回答（未選択）と判断不能（\`null\`）を区別し、いずれかが含まれれば当該尺度の平均は\`null\`。他尺度の平均には影響しない。
4. 4尺度が同時に高い・低い・交差するケースを表せる。相対二極の中間4へ圧縮しない。
5. \`typeId\`・\`groupId\`は常に\`null\`、\`classificationStatus\`は\`WITHHELD\`、\`oldTypeCompatible\`は\`false\`。
6. 選択結果は画面メモリのみ。LocalStorage、SessionStorage、IndexedDB、解析タグ、外部API、回答送信なし。質問データの取得のみ同一オリジンへのGET。リロード時に回答を消去。
7. 保存された回答、同意画面、研究参加者募集、A01/MY LIFE NOTE連携、16タイプ判定、本番への導線は追加しない。
8. \`noindex,nofollow\`と、尺度未検証・分類未実施の注意書きを維持する。

## 自動テストに追加した受入条件
- Node：12問・4尺度・ID重複なし／D-87架空4ケースとの完全一致／欠測・未選択を4にしない／不正値の拒否／旧タイプ不発行／保存APIの不在。
- Chromium：320、390、1280pxの3画面幅／全12問と各8選択肢／4ケース切替／部分欠測／リセット／手動選択／リロード後の消去／local/session/IndexedDB非保存／外部通信なし／ページ例外なし／横方向オーバーフローなし。
- CI：既存の\`workflow_dispatch\`のみを利用。PR/push自動トリガーは追加せず、他のKIDP本番画面は変更しない。

## 実行用コマンド

\`\`\`sh
node --test scripts/test-a05-bc-pilot.mjs
# 別ターミナル
python3 -m http.server 8765 --bind 127.0.0.1
# Playwright / Chromeをインストールした環境で
node scripts/qa_a05_bc_pilot_browser.cjs
\`\`\`

## QA証拠ステータス
- GitHubへの5実装・テストファイル追加：完了
- 手動QAワークフローへの2テスト追加：完了
- 元の質問JSONとの整合性：コードとテストで保証する設計、実行証拠は未取得
- Node \`--test\`実行結果：**未実行・合格としない**
- 実Chrome E2E実行結果：**未実行・合格としない**
- 実iOS Safari / VoiceOver：**最終工程まで保留**
- 心理測定妥当性、ユーザーによる製品仕様承認：未完
- マージ・公開：未実施

## 次の工程
1. 新規テストのNodeとChromeでの実行・エラー修正。
2. 評価項目について自己裁量・つながり／将来・現在の弁別性・回答負担・誘導を編集点検。
3. 必要な修正はD-89の新しい版として追記し、旧版を破壊しない。
4. 正式な研究・分類の決裁と本番公開は独立したゲートとする。
