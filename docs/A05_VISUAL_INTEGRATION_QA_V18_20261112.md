# A05｜v18 表示統合・回帰監査（2026-11-12）

## 対象
Draft PR #77：既存A05の結果画面に、16寓意のTier1 SVG・RGBY枠線・E軸マーク・揺らぎ（初期OFF）を**明示的に手動指定するプレビュー**として統合。既存T01〜T16判定との自動連動は禁止。

## 今回確認できたこと
- 実際の `app.mjs` をモックDOMで実行し、既存結果のタイプ名、5軸、レポートボタンが維持されることを確認（表示・状態検査12/12）。
- 赤→青への手動切替で表示枠色が変わり、診断スナップショットは一切変更しない。
- 表示用関数の16×4×2＝128組合せに対応し、旧`T01`をモチーフとして受け付けない。
- 16個のTier1 SVG個別ファイルがPR上に存在し、表示関数から名称に対応したパスが生成される。
- Chromiumの隔離した紋章テストでは、16画像読込、RGBY枠、PCとスマホ幅、reduce-motionを確認（v17段階）。
- 今回の変更は表示機能に限定。保存や採点アルゴリズムの変更なし。
- 再実行可能な統合テストを `scripts/test-a05-visual-integration-v18.mjs` に追加した。

## 注意：検証の区分
`app.mjs`の実コードをモックDOM上で実行した検証は、**実ブラウザE2Eの代替にはならない**。
またテストスクリプトをGitHubへ追加したが、GitHub ActionsやNodeによるリポジトリ全体の一括実行は未実施。今回のモックDOM検査12/12はツール内JavaScript上で評価した件数。

## 次のローカル検証コマンド
```bash
node --test scripts/a05-visual-contract-v15.test.mjs scripts/a05-visual-preview-v16.test.mjs scripts/a05-visual-assets-v17.test.mjs scripts/test-a05-visual-integration-v18.mjs
node scripts/local-preflight.cjs
```
その後、Chromium実サイトE2Eで「30問回答→完了→結果→プレビュー→レポート→履歴」、保存未同意時の動作、設定変更時の再描画、画面幅／アクセシビリティを確認する。

## リリースゲート
- タイプの正式な対応規則、C×D→RGBY、E中間値は未確定。旧判定の自動紐付けを行わない。
- Tier1は初稿16/16。Tier2本番美術承認0/16。Tier2の制作が不要とは判断していない。
- GitHub Actionsは手動のみ。**今回起動なし**。
- Draft PRを維持し、mainマージ・本番公開は行わない。
