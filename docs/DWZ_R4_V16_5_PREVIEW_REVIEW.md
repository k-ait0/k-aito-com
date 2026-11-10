# DWZ R4 v16.9 — 既存HTTPSサイト用・公開前検証

- **状態:** REVIEW ONLY / RESEARCH_ONLY_HOLD / productionApproved=false
- **対象ブランチ:** `dwz-r4-v16-5-xserver-preview`
- **予定配置:** `/lab/dwz/index.html` と `/lab/dwz/diagnostics.html`
- **公開後の候補URL:** `https://k-aito.com/lab/dwz/` と `https://k-aito.com/lab/dwz/diagnostics.html`
- **重要:** 作業ブランチの作成だけでは公開されない。上記URLの稼働は未確認。GitHub Pagesの設定は変更せず、Xserver Staticの既存デプロイ経路を使用する想定。
- **mainへの変更:** なし。本番公開・マージは未実行。

## 本ブランチの変更

1. 研究用Web計算HTMLを既存サイトの独立した `lab/dwz/` に配置（外部スクリプト不要）。
2. 個人の実額入力を避ける警告と、ブラウザ診断ページへのリンクを追加。保存先は暗号化されない `localStorage` であり、同じオリジンの他ページと共有され得る。
3. JavaScript起動、計算、簡易／詳細、資金不足、数値境界の安全な判定保留、画面幅、任意の保存試験を行う `diagnostics.html` を配置。
4. `noindex,nofollow` と CSP (`connect-src 'none'`) を維持。サイトの sitemap、既存記事、トップ、Actions、公開設定は変更しない。
5. 金融計算Coreは不変更。数値境界の HOLD は継続保留とする。

## このセッションで実行したQA

| 試験 | 結果 | 証拠・制限 |
| --- | --- | --- |
| Chromium DOM操作 | **60/60 PASS** | 320/390/810/1280px、`set_content`、`localStorage`モック、実ボタン操作 |
| 極端入力・境界値 | **11/11 PASS** | うち1件は想定どおりの計算 HOLD |
| JavaScript構文 | **PASS** | HTMLのinline script構文検査 |
| GitHubのアプリ HTML とローカルファイル照合 | **PASS** | git blob SHA `1366058ceb4ae7a63f0060f471abcb460ac48911` |
| 診断ページのJS構文 | **PASS** | GitHub側の取得内容を構文解析 |
| HTTPS直接アクセス / Safari実機 / 本物の保存→ページ再読み込み | **未検証** | Browser/HTTPナビゲーションが `ERR_BLOCKED_BY_ADMINISTRATOR`、外部URLへのDNSアクセス不可 |
| Kaitoサイト全体の `node scripts/local-preflight.cjs` | **未実行** | 接続機能で全リポジトリを取得できない。レビュー/マージ前に必須 |
| Xserverの実デプロイ | **未実行** | 別途公開権限・本番照合が必要 |

## マージ前ゲート（未完了）

- [ ] リポジトリをcheckoutし `node scripts/local-preflight.cjs` を全件PASSさせる
- [ ] `git diff --check`、追加HTMLの静的リンク・CSPを確認
- [ ] 公開権限のある担当者が別サイトへの影響がないことを承認
- [ ] マージ後、実際のデプロイ先と公開コミットSHAの一致を確認
- [ ] iPad Safariで `/lab/dwz/diagnostics.html` を実行、結果を記録（本物の保存領域を使う試験はダミーデータ・同意の上で実施）
- [ ] 金融計算Coreの妥当性を別途承認（本番での財務判断への利用不可）

**このブランチは公開前検証のためのものであり、現時点で本番リリース対象としては未承認。**

## v16.6 追補：入力制約の不一致修正（2026-11-06）

### Chromiumで再現した不具合

1. 詳細モードで期末目標を150万円や3,500万円に変更すると、HTMLとしては有効だが、研究版Coreは `invalidNominalSlider` でHOLD。内部の英語エラーを表示していた。
2. 試算開始60歳・追加支出開始30歳を入力すると、HTMLとしては有効だが、Coreの年齢制約に違反してHOLD。内部エラーを表示していた。

### 修正内容

- 期末目標のHTML入力範囲を研究版Coreと合わせて **0～3,000万円、100万円刻み** に変更。詳細モードのエラー表示も同じ制約を日本語で説明。
- 追加支出開始年齢は **試算開始年齢以上かつ追加支出終了年齢より小さく** する必要がある旨を入力時に説明。
- 計算Core・ストレスモデル・保存仕様には変更なし。既存の「浮動小数点境界の判定保留」も維持。
- 診断ページに期末目標の刻み不一致と追加支出開始年齢の不一致を検査する2項目を追加。

### 実行済みQA

| テスト | 結果 | 留意点 |
| --- | --- | --- |
| Chromium画面操作（既存ケース） | 60/60 PASS | 4画面幅、`set_content` + storageモック |
| 境界値 | 11/11 PASS | 想定通りの安全HOLD 1件を含む |
| 新規・入力制約回帰 | 22/22 PASS | 390/810px、失敗表示・正常入力・保存阻止 |
| 静的検査 | 26/26 PASS | JS構文、CSP、入力・リンク、Git blob照合 |

**HTMLのGit blob SHA:** `128ce62e7d973161479612662432df44896070d3`（GitHubと検証済みローカルファイルが一致）。

**引き続き未完了:** リポジトリ全体の `node scripts/local-preflight.cjs`、HTTPS配信経由でのネイティブ`localStorage`永続性、iPad Safari実機、Xserver配備。リポジトリ取得は`github.com`のDNS解決に失敗したため、全体QA未実行。

**マージ禁止:** 公開許可が出るまでPRはDraftのまま維持。金融計算Coreの正式承認とは分離。

## v16.7 追補（2026-11-06）— 研究版の共通入力検証

**再現:** 開始60歳・追加支出開始30歳など研究版Coreが拒否する値では、基本計算では日本語入力エラーだが、年齢比較／市場ストレス／臨時支出比較では英語の内部 `R2_LEGACY_HOLD` が表示されていた。

**修正:** `app.mjs`相当の `capture()` に `validateSharedResearchFields()` を追加。期末目標（0〜3000万円／100万円刻み）、開始・終了年齢、追加支出開始・終了年齢の前提を、基本計算・3比較・明示保存で共通検査。計算Core自体は無変更。比較結果が入力変更時に無効化されることは既存処理により確認できたので、変更しない。

**回帰実績（新しいHTMLに対する試験）**
- 共通入力検証：26/26 PASS（390px/810px）
- 既存Chromium画面操作：60/60 PASS（320/390/810/1280px）
- 境界値：11/11 PASS（HOLDを含む既定どおりの検出）
- 従来の入力制約：22/22 PASS
- 合計119/119 PASS（上記四つの異なるテスト群の合計）
- **追加80件ランダム試験は時間制限で中断。合格件数に加算していない。**
- Git blob SHA：`aa58e2a2ebbc37cb405209e3c3e7613e01d355c6`。ローカルファイルとGitHub上のソースが一致。

**未完了:** リポジトリ全体の `node scripts/local-preflight.cjs`、実際のHTTPS経由の保存・リロード、iPad実機Safari、Xserverデプロイ。GitHub全体のcheckoutはDNS解決に失敗。PRはDraft・未マージのまま維持する。

## v16.7 metadata hotfix — PR #70 公開前監査（2026-11-06）

**実際のサイトQAとの不一致を発見・解消。** `scripts/site-static-check.cjs` はnoindexの試験ページでも `<meta name="description">` を必須とするが、新規追加した `lab/dwz/index.html` と `lab/dwz/diagnostics.html` に不足していた。両方に正確な説明文を追加した。

- 対象：既存サイト全HTML **47ページ**の静的参照先 **420件**をGitHubのツリー内で照合し、欠落 **0件**。対象のGitHub `main` ツリーは338項目、うち280ファイル。
- 同47ページの `site-static-check.cjs` 相当の **460メタデータ／リンク／SEOアサーション**を実行し、**460/460 PASS**。
- 新規2ページは、同スクリプトのタイトル・説明・viewport・ID重複・内部アンカー・`noindex` / sitemap非掲載・相対参照の条件に **2/2ページ PASS**。検証時の対象GitHub HEADに対するblob:
  - `lab/dwz/index.html`: `a4b4eac1d69b94f71dc270c38d55f72609b9e4eb`
  - `lab/dwz/diagnostics.html`: `6dbeb9080d1b000b4df2a9f98021eb5793ecad7b`
- HTML修正後のChromium画面試験は **60/60 PASS**（320/390/810/1280px、localStorageモック、各計算・比較・保存）。
- `scripts/sync-published-content.cjs` は記事・sitemap・掲載済みページを更新し、全HTML横断更新は`/content-index.js?v=...`のキャッシュ識別子だけである。新規2ページには該当トークンがないため、今回の追加ファイルは生成スクリプトの書換対象にならないと判定。
- **注意:** 以上はGitHub上のファイル取得に基づく限定検証。完全なチェックアウトでの `node scripts/local-preflight.cjs` を実行できたわけではない。サイト内の他14工程を一括PASSとみなさず、本番公開/実機Safari/HTTPS E2Eは引き続き保留。

メタデータのみの修正で、金融計算Core・保存ロジック・公開設定は変更していない。PRは引き続きDraft・未マージ。

## 第16.9版｜判定保留後に古い理由が残る問題の修正（2026-11-06）

**再現事実：** 有効な入力（開始40歳／終了120歳／初期資産1億円／利回り0％等）で `FLOAT_THRESHOLD_AMBIGUOUS` の安全HOLDが発生後、正常入力に変更・再計算しても、`#output.dataset.reason` が前のHOLD理由を保持した。結果表示と機械可読なDOM状態が不整合。

**UIのみの修正：** `invalidateStaleResult()`、復元時の `fillCapture()`、基本計算の `submit` 開始時に`delete output.dataset.reason`を追加し、`data-status`と一緒に古い理由をクリアする。計算Core・市場ストレス・保存内部の処理は変更なし。

**本セッションで再実行した実測（Chromium set_content＋localStorageモック）：**

| テスト群 | 成功件数 |
| --- | ---: |
| 既存ブラウザ操作（320／390／810／1280px） | 60/60 |
| 共通入力チェック | 26/26 |
| 入力・数値境界 | 11/11（安全HOLD含む） |
| 既存入力制約 | 22/22 |
| 新しいHOLD→編集→正常再計算→保存→HOLD→復元 | 30/30 |
| 追加ランダム80条件 | 80/80 正常終了、JS例外0 |
| **合計** | **229/229 PASS** |

選定した別の20条件も実行し、19条件正常終了、1条件は設計どおりの数値境界HOLD。

**GitHub上の最新アプリGit blob SHA：** `f15d2ca56b65450e9a590f34bdcbe0d8959d1e59`（テスト済みローカルHTMLと一致）。診断ページにも「HOLD理由クリア」2チェックを追加。

**未完了ゲートは不変：** 全リポジトリ `node scripts/local-preflight.cjs`、HTTPSオリジンの実E2E／localStorage永続性、iPad Safari、Xserver配備。PR Draft・未マージ。正式な金融計算Coreの妥当性承認は別工程。

## 2026-11-06 | 再読み込みを伴うブラウザ保存診断（未実機実行）

- `lab/dwz/diagnostics.html` の任意の深い保存試験を改善：既存の`dwz-r4-compare-v11-capture/0.1.0`が無い場合のみ、ダミーの条件を明示保存し、同一オリジンのiframeを **URL再読み込み** して、新文書から保存値を読み直し、復元・自動再計算を行わないこと・削除まで検証する。
- 既存データがある場合はSKIP。保存値が別タブ等で変化したときは削除せず、作成した値と一致する場合のみ後片付けを行う。
- 標準診断は一時キーにのみアクセス。実資産・年金額は入力しないこと。
- **静的/構文15項目 15/15 PASS**：構文、CSP、meta、iframe再読込手順、保存競合対策、参照DOM ID、オプトイン条件など。これは実際のSafari E2Eではない。
- 診断Git blob SHA: `ce135fd88f45708414eff99fb286c7e9a1eb9eef`。金融計算HTML Git blob SHA: `f15d2ca56b65450e9a590f34bdcbe0d8959d1e59`、**アプリ本体は無変更**。

### 実機受入フロー

1. `https://k-aito.com/lab/dwz/diagnostics.html` が実際に配信されていることを確認する（現時点では配備も到達確認も未実施）。
2. Safari/iPadで通常診断を実行し、FAILの有無と画面幅を確認。
3. **既存保存データがない試験用ブラウザ**で「アプリ本体の保存・復元・削除」を明示選択して再実行し、`再読込後の保存値一致`、`再読込後のアプリ復元`、`復元後は自動計算せず手動待ち`、`再読込後のアプリ保存削除` を確認する。実資産は入力しない。
4. 結果をコピーし、PRのレビュー記録に残す。iframeが制限されるホストでは診断不可。アプリを直接開く動作確認に切り替える。

サイト全体の `node scripts/local-preflight.cjs` は、この環境ではcloneのDNS制限があるため依然未実行。GitHub Actionsは手動起動のみの運用であり、ユーザーの明示承認なしに起動しない。PR Draft・未マージを維持。

## 2026-11-06 | 独立したオフライン退行防止チェック（PR #70）

- `scripts/dwz-preflight.cjs` を追加（Node.js 22、標準モジュールのみ、読み取り専用）。金融Coreの固定SHA256、非UI 26モジュール数、HTML/CSP/SEO、簡易・詳細/保存/JSON UI、HOLD理由リセット、診断ページの明示保存・再読み込み・競合対策を判定。
- 完全なリポジトリ上では `node scripts/dwz-preflight.cjs` で28項目を実行する。既存の `node scripts/local-preflight.cjs` は変更せず、引き続き別途実行が必要。
- **GitHub登録済みスクリプトのblob SHA `3f3954c741fb147801a8715e348a77c5c83cbe32` とローカル実行物が一致**。ローカルv16.9 HTMLを用いた `--app-only` 実Node.js試験は **17/17 PASS**。
- 計算Core改変、CSP通信許可、期末目標制限の緩和、HOLD理由消去の削除、説明メタデータの削除をそれぞれ注入して、**5/5件で期待どおり非ゼロ終了**。チェックの不具合検出能力を確認。
- GitHub経由でアプリHTMLと診断HTMLを取得し、ファイル読み込み・SHA256を模擬したV8実行では **28/28項目 PASS**。これは実Node.jsのfull checkout試験ではない。固定ハッシュはローカルのNode.jsで別途検証済み。
- **公開ゲートの状態は不変：** 14工程のサイト全体`local-preflight`、完全リポジトリ上の追加チェック、実HTTPS永続保存、iPad Safari、本番デプロイのいずれも未完了。PRはDraft・未マージ。

## 2026-11-06 | WebKit／隔離コンテキスト対応（E2E未実行）

- E2Eコードで、アプリ本体と診断ページのBrowserContextが同一だった問題を修正。完全に独立した新規BrowserContextを診断用に作成し、開始時に保存キー2件が空であることを検証。診断ページの外部通信要求0件も明示検証。
- `DWZ_BROWSER_ENGINE=webkit` を追加し、Chromiumと同じlocalhost-originシナリオをWebKitでも実行可能にした。Chromium専用フラグはWebKitに渡さない。
- 手動QA専用ブランチのworkflowにWebKitのインストール・テスト工程を追加。既存6画面ブラウザ試験、全14工程、DWZ28項目、診断ガード単体11件を維持。workflowは`workflow_dispatch`のみ、ジョブ上限25分。
- **実行済み（ローカル）:** 修正版E2EのNode.js構文PASS、診断ガード11/11 PASS、接続遮断を模したChromium/WebKitのエンジン選択・終了コード3の負例2/2 PASS。モックを用いた遮断試験は**本物のブラウザE2E合格ではない**。
- E2E Git blob SHA: `45f8c8358a6fe6a88d26a801e6ad20df00aa4c48`。PRブランチと手動QAブランチで同一。
- **未完了:** GitHub Actionsの手動起動、localhost経由の実WebKit/Chromium、サイト全体preflight、Xserver HTTPS、iPad Safari実機QA。Linux WebKitはiPad Safari実機の代替合格ではない。
