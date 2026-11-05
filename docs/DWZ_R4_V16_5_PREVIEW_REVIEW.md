# DWZ R4 v16.5 — 既存HTTPSサイト用・公開前検証

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
