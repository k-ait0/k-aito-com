# A05 D-97｜D-96非診断プレビューの実行QAと公開ゲート

2026-11-06（JST）／PR #61（Draft・未マージ）／本番未公開

## 今回の結論

**D-96の画面を原本そのままで実行し、Node回帰テストとChromiumの操作・レスポンシブ検査を通過した。** 非診断のセルフリフレクションとしての実装品質を一段階前進させた。

ただし、通常URL型E2Eはローカルブラウザの管理ポリシーで遮断されたため未確認。iOS Safari・VoiceOver・表現の編集承認も未完了。**公開承認を意味しない**。

## 1. QAに使ったソースの真正性

GitHubコネクタで feature/a05-d23-modular-diagnostic-20261025 の次のファイルを取得し、QAコンテナへ**同一バイト列**で再現。GitのBlob形式SHA-1を計算しGitHub上のshaと一致した。

| 原本 | Git Blob SHA-1 | 結果 |
|---|---|---|
| `projects/kidp/life-design-lab/a05/reflection-d96.html` | `8f424f7ba206cab3dcd779779de5a2cf84568699` | 一致 |
| `scripts/test-a05-d96-reflection.mjs` | `7f392605f9562951abffcdaa0c8490643f94d955` | 一致 |

従って、QA結果は独自に作った類似実装ではなく、**現在の開発ブランチの原本**に対応する。

## 2. 実際に実行した検証

### Node.js v22.16.0

`node --test scripts/test-a05-d96-reflection.mjs`を、Git Blob SHAが一致する原本で直接実行。

- 4テストPASS、失敗0
- HTML・ソース上に回答フォーム、保存・送信API、旧タイプ採点APIがないこと
- 架空8ケースを正しく切り替えること
- 4段階の進む・戻る・再開始の境界条件
- 未承認・非診断・無得点の説明

### Chromium実ブラウザ（Python Playwright）

`/usr/bin/chromium`へ原本HTML全文を `page.set_content` で注入し、ブラウザのDOM/レンダリング/入力イベントを使って検証。

| 画面幅 | 架空8ケース | 4段階操作・再開始 | キーボード・フォーカス | 横あふれ | ページ例外 |
|---|---|---|---|---|---|
| 320px | PASS | PASS | PASS | なし | なし |
| 390px | PASS | PASS | PASS | なし | なし |
| 820px | PASS | PASS | PASS | なし | なし |
| 1280px | PASS | PASS | PASS | なし | なし |

- ブラウザのリクエスト観測：0件（外部通信なし）。`page.set_content`環境での結果であり本番ネットワーク構成の検証とは異なる。
- 新規画面への再マウント後、初期状態へ戻ることを確認。実URLのブラウザ再読み込み試験ではない。
- HTML原本に`localStorage`/`sessionStorage`/`indexedDB`/`fetch`などの呼び出しがないことを検査。**about:blank上で永続ストレージAPIを開いて結果を得る試験ではない**。
- ページの390pxレンダリング画像を取得し視認。

### 実施できなかった項目

- localhost経由のURL型遷移、`file://`遷移：管理ポリシーにより `net::ERR_BLOCKED_BY_ADMINISTRATOR`。URL型E2Eは**未合格のまま**。
- ユーザー実機のiOS Safari/VoiceOver、画面読み上げの手動検査、コンテンツレビュー、外部公開環境の構成確認。
- 心理測定の妥当性はD-96非診断モードには主張しない。

## 3. GitHubへ追加したQAフォールバック

`scripts/qa_a05_d97_reflection_injected_browser.cjs` を追加し、原本のGit Blob SHAをまず検証してから、Playwright Chromeの`setContent`で4画面幅・架空ケース・案内進行・キーボード・横あふれ・外部通信なしを検査する手順とした。

既存`scripts/qa_a05_d96_reflection_browser.cjs`（通常URL型E2E）は**維持**。手動起動のみの`.github/workflows/kidp-wave-a-browser-qa.yml`に補助的なinjectedテストを登録した。

今回の`qa_a05_d97_reflection_injected_browser.cjs`自体は**GitHub ActionsでもローカルNode Playwrightでも未実行**（このコンテナにはNode版Playwrightがなく、Python版で同等操作を実施）。CIを走らせたとは記載しない。

## 4. A05の製品化順序

| 対象 | 現状 | 公開判断 |
|---|---|---|
| D-96非診断セルフリフレクション | 原本HTMLでNode 4/4・Chromium 4画面幅PASS | **編集・アクセシビリティ・実URL環境・製品責任者の公開承認待ち** |
| D-95 2領域の心理的弁別 | 仮説・認知面接プロトコルのみ | 実際の研究・個人情報の収集を開始しない |
| 30問・16タイプ本体 | 機能プロトタイプは存在、尺度の妥当性なし | 科学的検証・設問承認・版移行等が必要。本番公開は独立ゲート |
| KIDP P0先行プロトタイプ | 変更せず | A05 D-97とは別管理 |

D-96の文章候補は暫定案であり、妥当な心理尺度や研究結果としての表現を追加しない。

## 5. 残作業（優先順）

1. **D-96の公開用文章の編集決裁**：2問が概念重複や誤認を招かないか、非診断と明示したまま使えるか。
2. **通常URL型E2Eとセキュリティ／レスポンシブQA**：実際の静的サイトでの取得・遷移・更新・ページ移動、最低限のHTTPヘッダーを確認。
3. **アクセシビリティ最終検査**：実機Safari、画面読み上げ、拡大200％／400％、コントラスト、フォーカスの流れ。
4. **正式な公開判断**：本番サイトの導線追加・PRマージ・公開を個別に承認する。心理尺度や参加者研究は別に扱う。

## 変更禁止条件

旧30問 `questions.mjs`、D-87/D-90の質問セット、タイプ一覧、既存の履歴／スコア、研究G1承認状態、P0の既存公開画面は変更しない。ユーザーデータ収集・v0.3の採用・旧回答の自動再採点・相性予測の公開なし。

## 版履歴
- D97-001：GitHub原本SHAを照合したNodeネイティブ4/4とChromium注入型4幅QAを実行。管理ポリシーのブロックと未実施項目を分離。
