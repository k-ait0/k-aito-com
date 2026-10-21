# KAITO S-11 / XServer 公開HTML差分調査（2026-10-21）

## 確認済みの事実

- main の最新確認コミット: `54a7c85321ee43006be7e37eac8e4e71940d4496`（2026-10-16）
- PR #50 はマージ済み。GitHub側の「次に見る」静的生成および記事インデックス同期は成功。
- Live verification run [38863415814](https://github.com/k-ait0/k-aito-com/actions/runs/38863415814) は再実行後も **61/62一致、1件不一致**。
- 不一致: `/notes/kidp-002-whynot/`。公開SHA-256先頭 `0470063b9e0c` と main期待値 `9683649e9adf`。HTTP取得失敗はなし。
- 全ファイルが不一致ではなく、対象HTMLのみ不一致。XServerでの配備漏れ・単一ファイルキャッシュ・誤った配備元などは**未確定の仮説**。

## Actions使用なしの診断

インターネット接続可能で、この作業ブランチをチェックアウトした端末から実行:

```bash
node scripts/diagnose-live-html-drift.cjs
```

このスクリプトは読み取り専用で、以下を行う。

1. `main`相当のローカル対象HTMLと公開HTMLのハッシュを比較。
2. 通常URLとキャッシュ回避クエリ付きURLを比較。
3. 差分の最初のバイト位置、前後のHTML抜粋、`次に見る`の有無を表示。
4. `Cache-Control`、`ETag`、`Age`、`Via`、`X-Cache`等のヘッダーを表示。

このブランチには診断用ファイルが追加されているが、対象HTMLは `main` と同一。作業ブランチ上の診断結果で本番の最新状態が確認できるとは限らないため、実行前に `main` から分岐した最新版であることを確認する。

## 判定

| 結果 | 優先する確認 |
| --- | --- |
| 通常URLは不一致、クエリ付きURLだけ一致 | CDN・キャッシュの動作 |
| 両方不一致、ハッシュが同一 | XServerデプロイ履歴、連携先main、公開ディレクトリ、サーバー側キャッシュ |
| 両方一致 | 本番検証 `62/62` を再実施 |
| 2つの応答が異なるが双方不一致 | HTTPキャッシュ、リライトルール、異なる配備版の混在 |

クエリ付き応答の一致・不一致だけでキャッシュ原因を断定しない。

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
4. 診断が必要な場合は、既存の [Draft PR #51の診断スクリプト](https://github.com/k-ait0/k-aito-com/blob/a80fea0b5af8/scripts/diagnose-live-page.cjs)を優先してもよい。本ブランチの診断スクリプトは**キャッシュ回避URLとの比較を追加した補助版**であり、両者を無条件にmainへ統合しない。

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

## XServer Staticでの確認事項（管理者操作）

公式マニュアル: https://static.xserver.ne.jp/support/manual/man_tool_server.php

1. XServer Static 契約管理 → **サーバー設定 → デプロイ履歴**で、対象の `main` 最終更新に対応する配備の成功・失敗と時刻を確認。
2. **サーバー設定 → GitHub自動デプロイ**で対象リポジトリ `k-ait0/k-aito-com`、ブランチ `main`、公開ディレクトリを確認。
3. その結果から原因を判断し、必要なら管理者判断で再デプロイ・再保存を実施する。設定変更・再保存は本資料作成時点で**未実施**。
4. 実配信とGitHubの差異が解消した後、`node scripts/live-production-check.cjs` による **62/62完全一致**と、公開Chromium **6幅・失敗0**で完了判定する。

## 運用制約

- 本診断のためにGitHub Actionsを実行しない。
- `.htaccess`、記事本文、生成インデックス、デプロイ先設定は原因が特定されるまで変更しない。
- この調査ブランチは `main` にマージしない。確定した対処と本番確認結果を記録してから別途判断する。
