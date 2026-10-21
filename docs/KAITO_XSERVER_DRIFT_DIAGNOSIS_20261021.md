# KAITO S-11 / XServer 公開HTML差分調査（2026-10-21）

## 確認済みの事実

- 不一致発生時に比較した旧mainコミット: `54a7c85321ee43006be7e37eac8e4e71940d4496`（2026-10-16）。2026-10-21にPR #51が別途mainへ統合された。
- PR #50 はマージ済み。GitHub側の「次に見る」静的生成および記事インデックス同期は成功。
- Live verification run [38863415814](https://github.com/k-ait0/k-aito-com/actions/runs/38863415814) は再実行後も **61/62一致、1件不一致**。
- 不一致: `/notes/kidp-002-whynot/`。公開SHA-256先頭 `0470063b9e0c` と main期待値 `9683649e9adf`。HTTP取得失敗はなし。
- 全ファイルが不一致ではなく、対象HTMLのみ不一致。XServerでの配備漏れ・単一ファイルキャッシュ・誤った配備元などは**未確定の仮説**。

## GitHub Actionsを使わない公開HTML診断

PR [#51](https://github.com/k-ait0/k-aito-com/pull/51) は2026-10-21にmainへマージ済み（`4e646e872a28`）。このPRに入った既存の読み取り専用診断スクリプトを正本とする。**重複していた本ブランチの補助診断スクリプトは削除済み。**

インターネット接続できるNode.js 22環境で、**最新のmain**から実行する。

```bash
node scripts/diagnose-live-page.cjs /notes/kidp-002-whynot/
```

診断スクリプトはGitHubのローカルHTMLと公開HTMLのSHA-256、HTTPステータス、レスポンスの主要ヘッダー、最初の差分位置、前後のHTML抜粋、「次に見る」の有無を取得する。読み取り専用で、デプロイやActions実行は行わない。

- 完全一致：62ファイルの本番照合と6幅ブラウザQAで最終確認する。
- 不一致：XServer Staticの**デプロイ履歴**で対象SHAと配備時刻を確認する。公開HTMLが古いのは配備漏れ・キャッシュ等のどちらによるものか未確定。
- キャッシュ疑い：通常URLとクエリ付きURLの応答差、およびヘッダーを別途比較する。クエリ差のみで原因を断定しない。

## 2026-10-21 確定した差分の正体（GitHub履歴と公開検証ログの突合）

[既存の追跡Issue #52](https://github.com/k-ait0/k-aito-com/issues/52)に、再現可能なSHA照合結果を記録した。これは **2026-10-16の本番検証ログの解釈**であり、10/21の実配信を新たに取得した結果ではない。

| 対象 | SHA-256 |
| --- | --- |
| 本番検証ログの公開版 | `0470063b9e0c2207fd322b24c2ccc82d5255572b2294dd49655475dffe97ff90` |
| PR #50 squash merge `d1ce299fbca9` のHTML | `0470063b9e0c2207fd322b24c2ccc82d5255572b2294dd49655475dffe97ff90` |
| 自動生成コミット `cd0f679329b6` と最新mainのHTML | `9683649e9adfe2101f27b295fbebf19805bd02a96273ad36f653a2b69e07f5e3` |

両版の違いは「次に見る」欄の **3つの装飾矢印に `aria-hidden="true"` があるかどうかのみ**で、後者は57バイト長い。PR統合直後のHTMLに3か所の `aria-hidden="true"` を付けると、自動生成コミット版と完全一致する。

この属性は `scripts/sync-published-content.cjs` の生成ロジックが出力している。GitHubの同期成功とXServerへの配備成功は独立しているため、自動生成された内容が公開側に届かない場合があり得る。

**未確定:** XServer自動デプロイのGitHub Actions生成コミットへの追従、デプロイ設定、個別ファイルキャッシュ。ホスティング側の記録なしに断定しない。

## 再発防止の暫定方針

1. 記事の本文・「次に見る」導線など生成ソースを変更するPRでは、マージ前にローカルで `node scripts/test-published-content.cjs` と `node scripts/sync-published-content.cjs`、関連静的監査を実行し、**生成物の差分も同じPRへ含める**。
2. 生成物をコミットした後に同じ同期を再実行し、`git diff --exit-code` で無差分を確認する。同期ソースと出力の境界を明確にする。
3. サイトへ自動配備されたSHAが「PRマージコミット」なのか「Actions生成コミット」なのか、XServerのデプロイ履歴で確認する。GitHub Actions側の成功だけで本番公開済みとはしない。
4. 診断はmain統合済みの [PR #51の読み取り専用スクリプト](https://github.com/k-ait0/k-aito-com/blob/main/scripts/diagnose-live-page.cjs) に統一する。GitHubの同期成功と本番配備成功は別々に確認する。

## 2026-10-21 ローカル再発防止ガード（新規追加）

この診断ブランチに次の2ファイルを追加した。

- `scripts/check-generated-content.cjs`：記事生成スクリプトを**OSの一時ディレクトリに複製したサイト**で実行し、元の作業ディレクトリには書き込まず、HTML／`content-index.js`／`sitemap.xml` に差分が出るか調べる。
- `scripts/test-check-generated-content.cjs`：生成結果一致、生成差分検出、ジェネレーター失敗の3ケースを検証。元のファイルを変更しないことも検証。

Windows PowerShell、macOS、LinuxのいずれもNode.js 22で実行可能。

```bash
node scripts/test-check-generated-content.cjs
node scripts/check-generated-content.cjs
```

ガードが `FAIL` を返した場合、**元の作業ディレクトリは変更されていない**。通常の同期処理を明示的に実行し、差分をレビューして同じPRへ含める。

```bash
node scripts/sync-published-content.cjs
git diff --check
git diff --stat
node scripts/check-generated-content.cjs
```

初期テストはローカルの小型フィクスチャで3ケース合格。**この会話環境からGitHubの実際のサイト一式をチェックアウトできないため、リポジトリ全体に対するガードの合格判定は未実施**。CIや本番デプロイも起動していない。

なお、このガードは `sync-published-content.cjs` が生成する記事関連成果物のみが対象であり、他のジェネレーター、XServer配備、実ブラウザ表示を検証するものではない。

## 2026-10-21 GitHub mainの実ページ監査・ローカルQA整備

GitHub接続で最新main（`54a7c85321ee`）のサイトマップ24URLを直接読み、**24ページすべてのHTMLを取得して静的照合に合格**した。

監査内容: 各ページのtitle・description、canonicalとOG URL、重複ID、ページ内アンカーのターゲット、GitHubツリー上の絶対パス参照先。検査範囲内ではエラー0件。

加えて、S-11の編集マッピングを持つ3記事の「次に見る」欄もmainと同期コードで完全一致。

本監査は**GitHub上のファイルの静的照合のみ**。相対リンクの一部、動的UI、公開XServerのHTTPレスポンスは含まれない。

### ローカル検査コマンド

- `scripts/local-preflight.cjs`を追加し、**Node.js 22のみ**で11項目の軽量検査（自動生成差分ガードを含む）を順次実行する。失敗項目は集約報告し、GitHub ActionsもブラウザQAも起動しない。
- `scripts/test-local-preflight.cjs`でチェック項目の存在、ブラウザ/ライブ検証の非実行、成功・部分失敗・例外処理をユニットテストした。
- 手元のNode.js 22環境で**両新規テストスイートが合格**。実際のリポジトリ全体についての`node scripts/local-preflight.cjs`実行は未実施（本環境からGitHubリポジトリのローカルクローン不可）。
- [README](../README.md)に「GitHub Actionsを使わないローカルQA」手順を追加。

この診断ブランチについてはPR未作成・本番未反映。別PR #51のActions削減設定は2026-10-21に`main`へ統合済み。本番公開環境は変更していない。

## XServer Staticでの確認事項（管理者操作）

公式マニュアル: https://static.xserver.ne.jp/support/manual/man_tool_server.php

1. XServer Static 契約管理 → **サーバー設定 → デプロイ履歴**で、対象の `main` 最終更新に対応する配備の成功・失敗と時刻を確認。
2. **サーバー設定 → GitHub自動デプロイ**で対象リポジトリ `k-ait0/k-aito-com`、ブランチ `main`、公開ディレクトリを確認。
3. その結果から原因を判断し、必要なら管理者判断で再デプロイ・再保存を実施する。設定変更・再保存は本資料作成時点で**未実施**。
4. 実配信とGitHubの差異が解消した後、`node scripts/live-production-check.cjs` による **62/62完全一致**と、公開Chromium **6幅・失敗0**で完了判定する。

## 運用制約

- 本診断のためにGitHub Actionsを実行しない。
- `.htaccess`、記事本文、生成インデックス、デプロイ先設定は原因が特定されるまで変更しない。
- 未実行のリポジトリ全体のローカルQAを合格扱いにしない。新しいローカルQA用コードは別途PRでレビューし、本番問題のクローズ判定とは区別する。
