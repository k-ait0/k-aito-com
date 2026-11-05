# DWZ R4 v16.7 — 既存HTTPSサイト用・公開前検証

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
