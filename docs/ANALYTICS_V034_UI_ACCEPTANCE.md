# K. Aito Analytics v0.34｜オフライン研究UIの改善と自動受入

記録日：2026-11-18 JST。研究ブランチ：`analytics-offline-ui-polish-v0-34-20261118`。比較基準：v0.33 `33e4cc0142e823ed5f08788456e9a8aca6c90c90`。

## 範囲と変更内容

- **既存Coreは無変更**：`lib/analytics/*.cjs` の計算・監査・CPIロジックを再実装していない。
- UI JS：`research/analytics/offline-preview-v032.browser.js`
  1. スマホ表示（<=500px）ではグラフ座標系を `340×252` に切替。縦軸ラベル領域と14 SVG pxの目盛りを確保。
  2. 画面幅変更で直近の年次グラフのみ再描画し、再計算Coreを呼び出さない。
  3. フォーム条件が編集されたときは表示中の旧結果・グラフ・監査表示を消去して `STALE` と表示。計算ボタン押下後だけ結果を再表示。
  4. 無効入力時は該当欄を `aria-invalid=true` にし、欄名を含むエラーメッセージを表示してフォーカス移動。
- CSS：`research/analytics/offline-preview-v032.css`
  1. スマホの見出しサイズ・ブランドマーク寸法を調整し、見出し末尾の不自然な一文字折り返しを解消。
  2. 入力エラー時の視認性、モバイルのグラフ縦横比、表示状態別の配色を改善。
- 自己完結HTML：`research/analytics/K_Aito_Analytics_Offline_Preview_v032.html` を既存のビルダーで再生成。旧ファイル名は下位互換のため維持する（HTMLの内容はv0.34）。
- 新規テスト：`scripts/test-analytics-offline-preview-v034.py`（従来14ケース＋新規5ケース）。
- 研究ブランチ専用CI：`.github/workflows/analytics-offline-browser-v034.yml`。公開リリース、mainへの変更、PRのマージをしない。

## 実測結果

GitHub Actions：https://github.com/k-ait0/k-aito-com/actions/runs/44223466195

| 種別 | 結果 | 根拠 |
|---|---|---|
| v0.32既存Analytics Node回帰 | **920検出 / 917 PASS / 3 SKIP / 0 FAIL** | 同一runのNode.js 22 `node --test scripts/test-analytics-*.cjs` |
| 実ブラウザ自動E2E | **19 / 19 PASS** | Ubuntu 24.04 / Playwright / Chromium / `file://` / オフライン |
| 再現ビルド | **PASS** | `node scripts/build-analytics-offline-preview-v032.cjs` 後の `git diff --exit-code` |
| ネットワーク漏出 / ページ例外 | **0件 / 0件** | Playwrightのイベント記録 |
| 画面幅別横方向溢れ | **375, 390, 1280pxで0** | E2EのDOM計測 |
| 見出し折り返し | **320, 375, 390pxで1行** | E2E UI-15 |
| モバイルグラフ目盛り | **320, 375, 390pxで14 SVG pxの8目盛り表示** | E2E UI-16 |
| リサイズ追従 | **390→1280→390px PASS** | E2E UI-17 |
| 条件変更後の旧値無効化 | **PASS** | E2E UI-18 |
| エラー欄の特定・フォーカス復旧 | **PASS** | E2E UI-19 |

GitHub Actions成果物（期限付き）：Artifact `14391293866` — `analytics-v034-browser-qa-synthetic-only`。実行JSONと390px・1280pxの日本語フォント環境スクリーンショットが含まれる（保持期限はGitHub側のArtifact設定に従う）。

**注意：**回帰テストの`3 SKIP`は旧v20の実データ保全関連の明示的スキップ。実データの所有者秘密鍵受入や本番承認を完了したことにはならない。旧報告の「920/920 PASS」は正確には「917 PASS、3 SKIP、0 FAIL」である。

## 受入ゲート

- `B07-A=PASS` — 合成専用オフライン試算UIと独立Core監査（継続）
- `B07-B-AUTO=PASS` — Chromium自動オフライン操作受入19/19（v0.34追加分も含む）
- `B07-B-MANUAL=NOT_COMPLETE` — 所有者PC/スマホの手動操作、Safari/Edge実機確認、目視受入が未完了
- `B07-C=NOT_COMPLETE` — 既存サイトへの統合未実施
- `B02=PARTIAL` — 暗号化6件の非公開Drive保全・再ダウンロード一致はv0.33で確認、独立第二保管は未確認
- `B03-B06=BLOCKED` — 所有者ローカル秘密鍵の復号・原本列/出典確認・円建て実データQAはまだ行っていない
- `B08=NOT_APPROVED` — 本番配備・データ利用権・正式公開審査

## 本人の手動受入チェック（公開前）

1. ダウンロードしたHTMLをWindows Edge/Chromeの`file://`で開き、オフラインで計算が動くか確認。実在の資産額や平文データは入力しない。
2. 画面幅375～390px相当のスマホ実機で見出し・グラフの目盛り・ボタン・入力エラーを確認。iPad Safariは別枠で確認。
3. 入力条件変更直後に古い資産残高が非表示になることと、再計算後に新結果と監査PASSが表示されることを確認。
4. 結果が既存Coreと一致することは自動監査で保証するが、実データの真正性は別のB03～B06受入で検証する。
5. 手動PASS証跡（ブラウザ版・OS・端末幅・日時・スクリーンショット等）が揃うまで`B07-B`全体を完了扱いにしない。

## 変更禁止範囲・残課題

`main`、本番サイト、Draft DWZ PR #70、秘密鍵、暗号化原本の公開、マーケットデータの正式認証には変更を加えていない。版数v0.34では操作性のみを完成させ、サイト統合・実データ受入には進めていない。公開には本人承認が必要。
