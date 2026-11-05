# A05 D-100｜CSP対応・公開前QA・公開判定（NO-GO）

2026年11月6日（JST）／PR #61 Draft／**未マージ・本番未公開・編集承認未了**

## 今回の結論

**非診断ワークの技術検証は進展したが、本番公開判定は NO-GO。**

D-99を残したまま `projects/kidp/life-design-lab/a05/reflection-d100.html` を独立作成。D-99のJavaScript・CSSは**完全同一**とし、2つのインラインブロックのSHA-256に対応するCSPを `meta http-equiv` で適用した。開発上の版表示のみD-100へ変更。

| 項目 | SHA |
|---|---|
| D-99原本のGit Blob | `2e5dbd2de9fed346516892a5cad78310eab8f868` |
| D-100原本のGit Blob | `0ed6a91d5a0dc57a74cc45569b1b5c1969b22ccb` |
| D-100のCSS SHA-256（Base64） | `WNRNkkb6vFk9eJ18XDaBNe4v8J4k645kHLF0rXfqRAY=` |
| D-100のJS SHA-256（Base64） | `POmtdK4VtMg0QPjZCyiUG8M3tybjpo99g3R+a7RH5yU=` |

CSP（検証したHTMLのmetaタグと同値）：

```text
default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-src 'none'; connect-src 'none'; img-src 'none'; style-src 'sha256-WNRNkkb6vFk9eJ18XDaBNe4v8J4k645kHLF0rXfqRAY='; script-src 'sha256-POmtdK4VtMg0QPjZCyiUG8M3tybjpo99g3R+a7RH5yU='
```

**注意**：CSP metaの挙動をブラウザ内で検証しただけで、公開サーバーが同じHTTPヘッダーを返しているとは確認していない。CSPの `frame-ancestors` はmetaでは設定できず、必要ならサーバーのHTTPヘッダーで指定する。実サーバーのヘッダー適用可否も未確認。

## 1. 実際に実行した検証

### Node.js ネイティブ

GitHubのBlob SHAと一致する `scripts/test-a05-d100-preflight.mjs` をNode.js v22.16.0で直接実行、**5件PASS**。内容は：

- D-99とD-100のBlob一致と旧版非破壊
- JS/CSS原本が変更されていないこと
- 埋込CSPのSHA-256がJS/CSSの実バイト列から計算した値と一致すること、`unsafe-inline`・`unsafe-eval`不使用
- 入力、送信、保存、得点化・16タイプ分類の追加がないこと
- 日本語、スキップリンク、見出しとライブ通知の維持

### Chromium実ブラウザ（Python Playwright、HTML直接読み込み）

- **280・320・390・820・1280px：5/5 PASS**。
- 8つの架空ケース・4段階の操作・再開始・印刷用の4問表示：各画面幅でPASS。
- CSP違反0件、ページ例外0件、外部リクエスト0件。
- **改ざん検査：PASS**。JSへコメントを追加して元のCSPハッシュを維持すると、ブラウザが当該スクリプトを実行拒否しCSP違反を記録。
- これは `page.set_content` による **ブラウザDOM・イベント・CSPの検証**であり、通常URL型E2Eでも本番HTTPヘッダーQAでもない。

実行証拠は `docs/A05_D100_RELEASE_PREFLIGHT_20261106.json` と、ローカルの `csp_validation.json` に記録。

### 登録したが実行していないもの

- `scripts/qa_a05_d100_csp_browser.cjs`：GitHub上のNode Playwright版のCSP／改ざん回帰試験。**そのスクリプト本体の実行は未確認**。
- `scripts/test-a05-d100-gates.mjs`：公開が未承認の間はNO-GOを維持する回帰テスト。作成・QAワークフロー登録済みだが、**このスクリプト本体のNode実行は未確認**。
- GitHub Actionsの`workflow_dispatch`：起動していない。PR/pushの自動トリガーは新設しない。

## 2. 公開可否を分ける9ゲート

| ゲート | 観点 | 状況 | 公開の障害 |
|---|---|---|---|
| G01 | 原本と回答非収集 | PASS | 解消 |
| G02 | CSP適用・改ざん拒否 | **PASS_LIMITED** | HTTPヘッダー未確認 |
| G03 | 得点・タイプ・保存なし | PASS | 解消 |
| G04 | 8ケース・4ステップ・印刷 | PASS | 解消 |
| G05 | URL遷移・キャッシュ | BLOCKED_BY_ENVIRONMENT | **残** |
| G06 | HTTPヘッダー・ホスティング | NOT_TESTED | **残** |
| G07 | Safari・VoiceOver等 | NOT_TESTED | **残** |
| G08 | 一般向け文言・2問いの編集承認 | PENDING_HUMAN_APPROVAL | **残** |
| G09 | PRマージ・本番公開・導線追加の承認 | PENDING_HUMAN_APPROVAL | **残** |

G02を完全なPASSとして扱わない。最終判定は **NO_GO_PRODUCTION** とする。**既存の30問診断・16タイプ公開の科学的承認とは別の判断**である。

## 3. 公開する場合に必要な実配信検証

1. ユーザーが明示承認したステージング／配信対象に限定して、直接のURLナビゲーション、再読込、戻る／進む、キャッシュと画面の更新挙動を確認。
2. ブラウザDevToolsまたはHTTP取得で、実レスポンスの`Content-Security-Policy`と他のヘッダーを確認。既存サイト側のヘッダーがmetaより厳しく、ハッシュで許可されたコードをブロックしないか確認。必要なら`frame-ancestors 'none'`等を**HTTPヘッダー側で**適用。
3. iOS Safari/VoiceOver、拡大表示、必要なスクリーンリーダー読み上げを実機確認。
4. D-99/D-100の問いの一般向け編集承認と公開対象・導線の決裁を別々に取得し、その後初めてリリース手続きを検討。

**自動マージ・自動デプロイ・noindex解除・回答収集は行わない。**

## 4. 成果物

- `projects/kidp/life-design-lab/a05/reflection-d100.html` — 開発版CSP適用HTML
- `scripts/test-a05-d100-preflight.mjs` — 実行済み（5/5 PASS、GitHub原本SHA照合）
- `scripts/qa_a05_d100_csp_browser.cjs` — CI登録済み・Node版ブラウザテスト自体は未実行
- `scripts/test-a05-d100-gates.mjs` — CI登録済み・Node版実行未確認
- `docs/A05_D100_RELEASE_PREFLIGHT_20261106.json` — 機械可読の公開判断と証拠
- `.github/workflows/kidp-wave-a-browser-qa.yml` — **手動起動のみ**の既存ワークフローへ登録

旧D-87/D-90、旧30問、16タイプ／32派生、診断履歴、D-95の研究承認状態、本番導線は変更しない。

## 次のD-101

追加の編集資料を量産するのではなく、ステージングの実URLに対する検証可能性・支援技術QA・公開意思決定の3点に作業を絞る。実URL型の検証に必要な情報が揃わない場合は、承認前に実施できる保全テストのみ行う。
