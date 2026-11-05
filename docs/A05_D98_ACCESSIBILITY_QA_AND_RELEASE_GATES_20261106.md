# A05 D-98｜非診断ミニ体験のアクセシビリティ修正・実行QA

実施日：2026-11-06（JST）／対象PR #61（Draft）／**本番未公開・文章編集承認は未了**

## 1. 今回実装した内容

旧版D-96を上書きせず、`projects/kidp/life-design-lab/a05/reflection-d98.html` を追加。非診断の独立プレビューのまま、次の修正を行った。

1. **スキップリンク**：「本文へ移動」を最初のキーボード操作で利用可能にし、フォーカス時だけ画面内に表示する。`<main id="main-content" tabindex="-1>` に移動。
2. **見出し構造**：動的な振り返りタイトルを段落から `h3` へ修正。進行状況を `aria-describedby` で結び、操作後に見出しへフォーカスを移す。
3. **ケース切替の通知**：記事全体の複数要素をライブリージョンにする方式から、内容をまとめて更新する単一 `role="status" aria-live="polite" aria-atomic="true"` へ変更。画面内には名称・説明・考える点を残す。
4. **強制配色モード**：`forced-colors: active` にフォーカスと左ボーダーを対応。
5. **JavaScript無効時**：操作ができない旨と、静的な2つの問いは閲覧可能な旨の `noscript` 案内を追加。

回答フォーム、分析タグ、外部スクリプト、個人データの保存・送信、16タイプの採点は存在しない。D-95の2文章候補と架空ケースを定性的な自己理解の体験として見せる画面であり、心理測定の妥当性を主張しない。

## 2. 原本一致

- 旧D-96 Git Blob：`8f424f7ba206cab3dcd779779de5a2cf84568699`（未変更）。
- 新D-98 Git Blob：`83a45c66f1847635d00f7add38913738964f1577`。
- 新D-98 Nodeテスト Git Blob：`14ba1ffddb2692b78193216d3a86d16f72dcad1a`。
- 検証用コンテナのファイルとGitHubの原本SHAが一致するため、**実行結果は開発ブランチの原本に対応する**。

## 3. 実行したQAと結果

### Node v22.16.0（ネイティブ実行）

`node --test scripts/test-a05-d98-accessibility.mjs` をGitHubと同一Blob SHAの原本で実行。

- **5/5 PASS、失敗0**。
- 原本SHAとデータを収集・保存しない契約
- ランドマーク、スキップリンク、正しい見出し、ライブ通知の構造
- 架空8ケースと通知文の一致
- 4段階の操作・フォーカス移動・初期化
- 非診断・未承認・無得点の表示と文面保全

### Chromium（Python Playwright／実ブラウザDOM・操作）

同一HTML原本を `page.set_content` で読み込み、ブラウザの表示・イベントを実行した。

| 画面幅 | ケース8件 | 4ステップ | キーボード／フォーカス | 横あふれ | 外部リクエスト／JS例外 |
|---|---|---|---|---|---|
| 280px | PASS | PASS | PASS | なし | 0／0 |
| 320px | PASS | PASS | PASS | なし | 0／0 |
| 390px | PASS | PASS | PASS | なし | 0／0 |
| 820px | PASS | PASS | PASS | なし | 0／0 |
| 1280px | PASS | PASS | PASS | なし | 0／0 |

追加試験：
- 最初の `Tab` でスキップリンクへフォーカスし、`Enter` で `main#main-content` へフォーカスが移ることを確認。
- ケース切替時にライブ通知が更新されることを確認。ただし**実スクリーンリーダーの発話の自然さは未検証**。
- `select` のアクセシビリティツリー上の名称が「例を切り替える」であることをChromiumから確認。
- `forced-colors: active` でボーダー表示が残り、横方向のあふれがないことを確認。
- 主要テキスト色8組のWCAG計算式によるコントラスト比は**4.61〜12.13:1**。すべて通常文字のAA基準4.5:1以上。**全状態・全要素の網羅的なWCAG適合監査ではない**。
- 280px検証は狭いビューポート試験であり、実際のブラウザ400％拡大を完全に代替しない。

### 留保と未実行

- URL型E2E（`page.goto`）は、コンテナのlocalhost等へのナビゲーション制限があり未確認。HTML注入QAをURL型E2E合格とは扱わない。
- Node版Playwrightを使う `scripts/qa_a05_d98_accessibility_browser.cjs` はGitHubへ追加・CI登録したが、**そのファイル自体の実行は未実施**。Python Playwrightでほぼ同条件を実行した。
- iOS Safari・VoiceOver・TalkBack・実際の400％ズーム・各OSのハイコントラスト設定による手動QAは未実施。
- WCAG AA完全準拠は未判定。公開コンテンツの編集承認も得ていない。

## 4. QA成果物

- 新HTML：`projects/kidp/life-design-lab/a05/reflection-d98.html`
- Node実行済み：`scripts/test-a05-d98-accessibility.mjs`
- Node Playwrightのブラウザテスト：`scripts/qa_a05_d98_accessibility_browser.cjs`（**登録のみ・未実行**）
- 手動QAワークフロー：`.github/workflows/kidp-wave-a-browser-qa.yml` に上記2件を追加。`workflow_dispatch` のみ維持。

## 5. 製品公開の判断

| ゲート | 現状 |
|---|---|
| 非診断体験のHTML作成・操作・レスポンシブ／キーボード検証 | **限定的な実行QA PASS** |
| 2つの暫定的な問いの編集判断 | **未決** |
| 通常URLによるE2E・サーバー配信・ヘッダー確認 | **未実施** |
| Safari・VoiceOverなど支援技術実機 | **未実施** |
| 最終公開・導線追加・PRマージ | **未承認・未実行** |
| 旧30問・16タイプの正式な心理尺度公開 | **別ゲート・NO-GO** |

**次の工程**：非診断画面の文言を一般利用者向けに修正する是非の編集レビューと、実配信環境での公開前QA。研究参加者の募集や新診断の得点化へは進まない。

## 変更禁止条件

旧30問、D-87/D-90の質問JSON、既存の16/32タイプ、履歴、D-95研究G1は保全。D-98を本番に接続しない。PR #61はDraftのまま維持。

## 履歴

- D98-001：公開前のアクセシビリティ改善、Node 5/5、Chromium 5画面幅・操作・コントラストの限定QA。
