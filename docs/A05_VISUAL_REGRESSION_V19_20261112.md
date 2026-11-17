# A05 v19｜実コードでの30問→結果→レポート→履歴 回帰試験

更新：2026-11-12 ｜ 対象：Draft PR #77（main・本番には未反映）

## 目的
RGBYの発色を原画加工ではなく枠線CSSに限定し、16種類の紋章・E軸補助表示は既存A05の診断・保存・10ページレポートと独立した手動プレビューとして利用する。

## 今回の新規テスト
`scripts/test-a05-visual-full-flow-v19.mjs` を追加。

1. **通常回答シナリオ**：実際の `questions.mjs` / `engine.mjs` / `app.mjs` / `report.mjs` を用い、30問へ順次回答、次へ進む、回答一覧、結果確定、RGBY切替、10ページレポート、印刷操作、履歴表示を検査。
2. **中間回答シナリオ**：30問をすべて中間4で回答。既存タイプが `withheld`・`typeId:null` となること、手動プレビューが未連動として明示されること、別モチーフへ変えても履歴スナップショットを変更しないことを検査。
3. 保存未同意では外部ストレージ関数を例外にして、暗黙のデータ保存が発生しないことを確認。

### 実行結果
GitHubから取得した該当ソースを同一のJavaScript実行環境へ読み込み、DOMとストレージを模擬した条件で **2シナリオ/2 PASS**。最初の通常シナリオでは30/30問、10ページ、履歴1件、RGBY=Gへの切替を確認。

**注意：この実行はブラウザE2Eではありません。** 新しく作成したNodeテストと等価な評価を行いましたが、リポジトリを直接cloneして `node --test` を起動したわけではありません。実ブラウザ描画、IndexedDB保存・復元、印刷ダイアログ、Safariは検証できていません。発行済みテストはチェックアウト環境で再実行する必要があります。

## 既存の保護条件
- A〜Dによる旧T01〜T16から、A/B方向・強弱による新寓意16への自動マッピングは禁止。
- C×DからRGBYへの正式対応は未確定。モチーフ・RGBY・E軸は手動操作で切替。
- 16種類のTier1 SVGは既存初稿。Tier2美術承認は0/16。
- 揺らぎは任意の装飾、初期OFF。RGBYは枠線CSSのみ。
- 旧 `engine.mjs`、`questions.mjs`、`storage.mjs`、`report.mjs` は今回変更していない。
- main未マージ、本番未公開、GitHub Actions未起動。

## 次の確認コマンド（リポジトリにアクセスできる環境）
```bash
node --test scripts/test-a05-visual-full-flow-v19.mjs
node --test scripts/test-a05-visual-integration-v18.mjs scripts/a05-visual-assets-v17.test.mjs scripts/a05-visual-preview-v16.test.mjs scripts/a05-visual-contract-v15.test.mjs
node scripts/local-preflight.cjs
```

## 未完了ゲート
- 正式A05画面のブラウザE2E（キーボード、スマホ幅、画面遷移、保存・復元・印刷）
- IndexedDB有効・無効双方での正常系、削除、障害時復帰、プライバシー監査
- Tier1 24px識別性評価とSafari確認
- 新16寓意の判定閾値・RGBY割当の正式仕様決定

上記が通過するまでDraft PRのまま保持する。
