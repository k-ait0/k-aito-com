# A05 v21｜PR #76（診断v2）× PR #77（16寓意）の統合監査

更新日：2026-11-12（JST）／状態：**検証用ブランチ・未承認・本番反映なし**

## 0. 根拠と固定した起点

- 診断・設問の候補原本：Draft PR #76 `feature/a05-v2-modules-20261108`、開始時 HEAD `89db844f8ce55c3a85ae74db6635c53a2ee46121`。
- 16寓意・Tier1・RGBY枠線の表示候補：Draft PR #77 `feature/a05-visual-contract-v15-20261111`、開始時 HEAD `aac1dbc587041e7eb2ee76fb6c2ea06cac7a5db1`。
- 本統合検証ブランチ `integration/a05-v2-visual-v21-20261112` は、PR #76の上にPR #77の変更35ファイルを**1コミットで重ねた独立した作業コピー**。PR #76／#77／mainは変更していない。
- 自動診断表示への連動は**未実装**。結果画面には「診断判定とは未連動」と表示する。新しいタイプと旧T01〜T16を番号順に対応させない。

## 1. 比較して確認した事実

| 論点 | PR #76 診断v2 | PR #77 ビジュアル |
|---|---|---|
| 30問 | `A05-Q-2.0.0-draft`。基本A〜Eの各6問、左右方向固定 | 設問は変更しない |
| 採点 | `A05-S-2.0.0-draft`。方向判定の暫定域は絶対値33.3%以下 | 採点計算は変更しない |
| 16タイプ | A〜Dの方向の組合せからT01〜T16 | A・Bの方向と強弱による16寓意を将来想定 |
| グループのRGBY | `types.mjs` のG1〜G4はA/B由来、色順B/G/R/Y。旧色コードも別 | 明示したR/G/B/Y、4色のCSS枠線。C/Dとの正式割当は未決 |
| E軸 | `wealth` はmoney/time/neutral/withheld | Eアイコンはmoney/time/null。neutral/withheldはアイコン無が適切 |
| レポート | `A05-REPORT-0.2.0-draft`、10ページ | 現状は旧タイプのレポートを保持し未連動 |
| データ | 既存履歴スナップショットは版別に検証し、旧版を自動再採点しない | 表示用手動選択はスナップショットに保存しない |

**結論：** 両者はプログラム上は共存可能。ただし、旧16タイプと新16寓意の意味付けは両立しておらず、C/D→RGBYの正式配色も存在しない。**コードを重ねることと正式な診断統合は別**。

## 2. v21で実行した統合スモークQA

1. PR #76のv2質問・採点・レポートとPR #77のUIを同じJS環境に読み込み、既存の30問回答→結果→RGBY切替→10ページレポート→履歴、および全問中間回答の2シナリオ通過。
2. `scripts/test-a05-v2-visual-compat-v21.mjs` を新設。ソースから検査し、**6契約テスト/6通過**：
   - v2質問・採点・レポートのバージョン共存
   - 旧16タイプがすべて検証可能で各10ページレポートを維持し、Txxをモチーフに変換しない
   - 旧スナップショットの自動移行を抑止
   - すべて中間回答なら `typeId:null`／`wealth:neutral`、アイコン未割当
   - 16×4×2＝128の表示はあくまで手動・独立
   - 結果画面に旧タイプIDからの暗黙マッピングがない
3. **制限：** JSコード評価であって、チェックアウトしたNode実行、ブラウザE2E、IndexedDB保存・復元、Safari実機QAはまだ実施していない。合格を拡大解釈しない。

## 3. 重大な運用ブロッカー：Actions自動起動と台帳の不一致

PR #76の `.github/workflows/a05-research-browser-qa.yml` には `on: pull_request` が存在する。
一方 `AGENTS.md` と `docs/GITHUB_ACTIONS_POLICY.json` は **workflow_dispatchのみ・自動トリガー例外0** を要求し、台帳の `expectedWorkflowFiles` は11件だが、統合ブランチ上の実ファイルは12件。

- 自動起動ワークフロー：**12件中1件**（A05 research review browser QA）。
- ポリシー例外を認めたり、新しいPRの開設で意図せずActionsを起動したりしない。
- 手動専用化と12件への台帳登録は、既存のポリシー変更手順・承認を経て**別の小さな修正コミット**で対処する。今回、ワークフローと台帳には手を加えない。
- 本統合ブランチは**PR未作成**。Actionsも起動しない。

## 4. 提案する開発分掌と正式統合ゲート

**原本の分掌（提案、未承認）**
- PR #76：質問文と測定上の研究・採点規則・レポートの版管理の原本候補。
- PR #77：16寓意・Tier1 SVG・RGBY枠線・表示UIの原本候補。
- 統合ブランチ：双方を検証する場。元PRに統合試験の仮実装を混ぜない。

**決裁が必要な論点**
1. 新16寓意をA/B方向＋強弱で公式に定義するか。強弱境界はどこか、境界／判定保留をどう扱うか。
2. C/Dの組合せを4色にどう割り当てるか。旧G1〜G4の色との重複・誤認をどう避けるか。
3. 新分類結果を旧T01〜T16と併存表示するか、段階的に置き換えるか。既存履歴は新判定に変換しない。
4. Tier2は本番承認0/16のため、Tier1中心の軽量版を先に公開候補とするか。

**公開条件**
- 正式な出題30問の承認とスコア・分類契約を版付きで固定する。
- 16タイプ・128表示・保留/境界に対する単体・統合・履歴互換テストを満たす。
- Actionsポリシーの不一致を解消し、`node scripts/local-preflight.cjs` を合格させる。
- `scripts/qa_a05_browser.cjs` を実チェックアウトで実行し、IndexedDB・30問・履歴・印刷・スマホ表示を検証する。
- 人間の公開承認、mainマージ、公開後HTTPS検証は別ゲート。いずれもこの作業では行わない。

## 5. 再実行用コマンド（統合ブランチで実施）

```bash
node --test scripts/test-a05-v2-visual-compat-v21.mjs scripts/test-a05-visual-full-flow-v19.mjs scripts/test-a05-visual-integration-v18.mjs
node --test scripts/test-a05-v2-contract.mjs scripts/test-a05-engine.mjs scripts/test-a05-report.mjs scripts/test-a05-storage.mjs
node scripts/local-preflight.cjs
node scripts/qa_a05_browser.cjs
```

※ 現在 `local-preflight` はワークフロー自動起動と11/12台帳不一致を解消するまで**合格見込みがない**。コマンド例は実行済みの意味ではない。
