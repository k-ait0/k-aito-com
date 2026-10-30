# A05 R1｜開発引き継ぎ v0.2（S5試作＋起動不具合修正後）

更新：2026-10-30 JST。旧版 `docs/A05_R1_DEVELOPMENT_HANDOFF_V01_20261030.md` は作成当時の履歴として保持。本資料を後続工程の現状参照に使う。

## 最新状態

- ブランチ：`feature/a05-r1-s5-manual-comparison-preview-20261030`（本番・main・Draft PR #61は変更しない）
- S0正式方針：6/6。S1：2/8。S2/S3/S4/S5/S6/S7/S8正式受入：0。**本番NO-GO**。
- S4 v0.4：全136組の暫定コピー原本（`docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json`）。P0/P1はv0.3の24組を保全、P2/P3は112組。
- S4 v0.5：先行8組のAI個別改稿＋104組の機械構文候補（`docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json`）。**AI生成原案・未承認**。説明112件・質問336件の完全一致重複は0。ただし104組は文法・場面の定型的反復が残る。
- S5：`projects/kidp/life-design-lab/a05/r1-s5-offline.html` に全136組とv0.5候補112組を埋込。タイプ手動2選択、4軸構造、改稿切替、2列同時比較、スマホ向け1列、収集・保存なし。
- 2026-10-30に検出した重大な起動不具合（112件の候補なのに `byAlternative.size===8` と検査）を112件へ修正。Chrome QAの `variantPairs` 未宣言も修正。**GitHub実ファイル再取得による13/13静的整合は確認。ただし実ブラウザ・Nodeの実行結果はない**。
- 詳細：`docs/A05_S4S5_V05_112PAIR_INTEGRATION_QA_20261030.md`。
- 正式受入の唯一の正規原本：`docs/A05_R1_RELEASE_GATE_LEDGER_V01_20261029.json`。S5-STARTUP-DEFECT-003追記済み。

## 次の実施作業

1. **独立した実行環境でネイティブテストを動かす。** 同一ブランチをcheckoutし、ルートで `node scripts/run-a05-r1-local-preflight.cjs`。Chrome/Playwrightがある環境で `node scripts/qa_a05_r1_s5_offline_browser.cjs`。テスト失敗を修正してから技術合格候補へ。
2. S4：16組の先行審査を `docs/A05_S4_V04_SEMANTIC_REVIEW_PILOT_16_V01_20261030.json` のC1〜C7で一次・独立二次に分離。104組の機械生成文章を無審査で主原本へ上書きしない。
3. S1：B2-P/SDT、A/C/Dの操作的定義、旧T-IDの利用範囲、独立審査の責任者について製品判断を取得。S3：2026-10-29 v1.0原本の現物照合。S2科学レビューとS5〜S7品質確認を並走。
4. S8製品オーナーの明示決裁がない限り、公開・マージ・本番サイトへの組込を行わない。

## テストと公開の注意

この実行環境ではGitHubへのDNS解決が不可で、ローカルのChromiumナビゲーションも管理上拒否された。コードをGitHubへ保存できたこととブラウザ上で動いたことは別。GitHub Actionsの実行・自動発火をしない。未承認の科学的な相性判定、点数、予測、人格の自動分類を復活させない。


## 追補｜S4 v0.6・S5模擬DOM実行QA（2026-10-30）

- 実GitHub上のS5制御JSを隔離V8+模擬DOMで実行。256順序選択・136組・改稿112組・224表示比較と4件の安全側停止を確認。**本物のDOM/Chrome/SafariでもネイティブNodeでもない**。
- 保存先：`scripts/test-a05-r1-s5-controller-runtime.mjs`（実コードをNode VMとDOMダブルでテストする実行スクリプト）。ローカル実行結果はまだ未取得。
- `docs/A05_S4_V05_REPEAT_14GRAM_AUDIT_20261030.json` で高反復104/104（中央値80.0%、平均79.1%）を検出。人手編集・科学検証済みと扱わない。
- `docs/A05_S4_V06_HIGH_REPEAT8_INDIVIDUAL_REWRITE_PILOT_20261030.json` に上位8組の個別AI改稿を保存。同じ反復検出で高反復104→96組。v0.5／v0.4原本は未変更。
- S4/S5/S6正式受入はすべて0、本番NO-GO、GitHub Actions使用なし。
- 次：現地PCで `node scripts/run-a05-r1-local-preflight.cjs`、Chrome/Playwright、Safari/VoiceOver実査、その後8組の人手評価結果を見て残り96組の個別改稿基準を確定。
