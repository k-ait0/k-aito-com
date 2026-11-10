# GitHub Actions利用最小化｜全リポジトリ横断監査台帳

**基準日：2026-10-27（JST）｜台帳 v1.0.0**

## 全体原則

- GitHub Actionsは原則として使わず、通常の開発・テスト・ビルド・静的QA・生成処理をローカルまたは必要な代替環境で行う。
- 自動起動（`push`、`pull_request`、`schedule`、`workflow_run`など）は明示的な安全例外のみ。単にActionsが起動しないことを品質PASSとしない。
- 手動起動でもmain書込み・配信設定・消費時間があるため、**一般的な承認済みQAと区別**する。操作にはユーザーの明示許可、対象SHA、理由、実行結果を要求。
- ブランチ保護・必須ステータス・実際の請求残高はGitHub連携の権限制約により全件確認できていない。承認前に管理者が確認する。

## 監査対象の全27ワークフロー（4リポジトリ）

| Repository | 手動専用 | 自動例外 | 合計 | 最新状態 |
| --- | ---: | ---: | ---: | --- |
| `k-ait0/k-aito-com` | 11 | 0 | 11 | mainはすべて`workflow_dispatch` |
| `k-ait0/finowa-plus` | 1 | 0 | 1 | mainは`bootstrap-repo.yml`のみ、手動 |
| `k-ait0/finowa-deplo` | 11 | 2 | 13 | mainの`finowa-production-verification.yml`がmain push、`finowa-public-indexing-gate.yml`が限定PRで自動 |
| `k-ait0/finowa-inheritance-rc12` | 1 | 1 | 2 | mainの`production-monitor.yml`が30分間隔のscheduleを保持 |
| **合計** | **24** | **3** | **27** | **約88.9%が手動専用** |

注：手動専用率は24÷27の単純なファイル数比率。Actionsの実行回数・課金額・runner分の削減率ではない。過去・他ブランチのワークフローや外部CIは含まない。

## 書込み可能な手動ワークフロー（要レビュー）

| Repository | ワークフロー | 操作 | 対策 |
| --- | --- | --- | --- |
| KAITO | `build-notebook-photo.yml` | 生成画像をmainへpush | Draft PR [#64](https://github.com/k-ait0/k-aito-com/pull/64)で確認文字列と対象main SHAを照合 |
| KAITO | `sync-published-content.yml` | 生成インデックス類をmainへpush | 同PRで確認文字列・対象SHA、無承認rebaseとpush再試行を削除 |
| FINOWA+ | `bootstrap-repo.yml` | v23アーカイブ展開、ワークフロー自身の削除、mainへのpush | Draft PR [#4](https://github.com/k-ait0/finowa-plus/pull/4)で確認文字列・対象SHAを照合 |

3件とも**mainの保護はまだ変更されていない**。Draft PRは承認・マージされていないため、新しいガードが本番操作へ適用済みと誤認してはならない。

## リポジトリ別の進行中PRと完了条件

### KAITO
- [Draft PR #64](https://github.com/k-ait0/k-aito-com/pull/64)：手動main書込みの承認ガード、ローカル監査、改訂履歴を追加。
- A05 [Draft PR #61](https://github.com/k-ait0/k-aito-com/pull/61)：当該ブランチの`kidp-wave-a-browser-qa.yml`は2026-10-27時点ですでに手動専用。旧ポリシーの「自動起動が残存」という警告は訂正済み。マージ直前には再監査する。
- 残作業：Node実環境で`node scripts/local-preflight.cjs`を実行、YAML検証、mainブランチ保護確認、レビュー。

### FINOWA+
- [Draft PR #4](https://github.com/k-ait0/finowa-plus/pull/4)：bootstrapの書込みゲートとローカル検証。
- 残作業：実Nodeでローカルpreflight、アーカイブ展開内容の独立QA、main保護を確認。**実bootstrapは明示承認があるまで実行しない**。

### FINOWA本体
- [Draft PR #247](https://github.com/k-ait0/finowa-deplo/pull/247)：ローカル公開前後ゲート・SHA/ハッシュ照合・24時間の証跡期限・fail-closed・検証記録。
- 2つの安全例外（mainのXServer配信確認、限定PRの公開インデックス保護）は現状維持。
- [Issue #239](https://github.com/k-ait0/finowa-deplo/issues/239)：ジョブ開始前failure。ユーザー提示の画面には支払い失敗またはspending limitに関する警告があった。**どちらが該当したか未確認**。課金設定は承認なく変更しない。
- 残作業：実コンテンツによる`--local`検証、XServerの配信SHA照合、`--production`実走、PDF独立QA等。

### 家系簿 Pro
- [Draft PR #5](https://github.com/k-ait0/finowa-inheritance-rc12/pull/5)：外部監視移行計画、証跡テンプレート、切替判定スクリプト。
- [Issue #4](https://github.com/k-ait0/finowa-inheritance-rc12/issues/4)：監視予定ジョブが連続skipped。本番監視が動作した証拠は未確認。
- 外部監視はUptimeRobot Free等を候補とするが、実モニター・通知先・本番URLは未登録/未確認。外部の監視成功と通知試験後までGitHub Actions scheduleを廃止しない。
- 残作業：承認済み正規公開URL、Down/Up通知テスト、24時間実績、運用責任者、公開SHA照合。

## 優先順位と安全境界

1. **P0**：現在の本番監視が`skipped`である家系簿 Proの監視実稼働・通知確保。
2. **P0**：FINOWAのActionsジョブ開始前失敗と、公開後SHAを照合する独立QAの確立。
3. **P1**：KAITO/FINOWA+のmain書込みガードPRの実Node＋YAML検証・レビュー。
4. **P1**：各リポジトリの必須チェック・ブランチ保護確認。
5. **P2**：代替手順の実運用の証跡が揃った自動例外を、**別PR・明示承認**で段階的に廃止。

## この台帳の適用範囲・注意

本台帳は現時点のGitHubリポジトリの確認結果と進行中PRを示す。**4つのDraft PRのmainへの統合、本番公開、外部監視登録、課金設定の変更を意味しない。** 実行テストがV8/依存モックである場合はNative Node.jsや実本番チェックとして扱わない。

## 追記式改訂履歴
- 2026-10-27 v1.0.0：4リポジトリ／27ワークフローの集計、3自動例外と3手動main書込み、4つの改善Draft PR、残P0/P1作業を一元化。

## P0追加：GitHubサーバー側で強制される保護の不足（2026-10-27）

- 4リポジトリの`main`はbranch APIの`protected: false`を確認。参照権限・公開状態と具体的な導入手順は`docs/GITHUB_MAIN_PROTECTION_ROLLOUT_20261027.md`に記録。
- KAITOはpublicで保護ルールをFreeから利用可能。FINOWA+・FINOWA本体・家系簿 Proはprivateで、GitHubプラン条件とRuleset APIの制限により現行接続からは適用できない。
- `confirm`入力は認証ではない。ローカルhookは有効化しないと動かず、APIコミットを止めない。したがって既存ガードだけでmainが保護されていると誤認しない。
- Actionsの自動必須ステータスを設定すると請求枠・ジョブ失敗時にPRが停止し得るため、まずPR必須、force push/削除禁止、ローカルQA証跡の運用を優先する。
- 中央の追跡Issue：[KAITO #63](https://github.com/k-ait0/k-aito-com/issues/63)。

### 追加改訂履歴
- 2026-10-27 v1.1.0：branch APIの全4件保護無効、public/privateとプラン制約、横断導入計画を追加。

## v1.2.0追補｜全4リポジトリのローカル実走とサーバー側保護の状態（2026-10-27）

- GitHub連携でアクセス可能なリポジトリは`list_repositories`で**4件**であることを再確認（この接続で認識できない別リポジトリは対象外）。
- 4 mainブランチは全て`protected:false`。KAITOのみpublic、他の3件はprivate。連携のGitHub repo metadataではadmin権限がtrue。公開KAITOはFreeから保護可、privateの規則適用はGitHub Pro/Team等のプラン条件による。中央の追跡先は[Issue #63](https://github.com/k-ait0/k-aito-com/issues/63)。
- KAITO Draft PR #64：GitHub原本SHAが一致する2 writerワークフローと検査JSを隔離し、Node v22.16.0で書込み監査・回帰テストPASS。GitHub実ブランチの11/11 workflowを全数確認（手動11／自動0）。`docs/KAITO_MANUAL_MAIN_WRITE_QA_20261027.md`。
- FINOWA+ Draft PR #4：Node v22.16.0＋Python 3.13.5で`scripts/local-preflight.cjs`の**5/5 PASS**。危険なtar直接展開をPython 3.12+のデータフィルタ付き展開へ移行し、Python 7件PASS。**実v23圧縮アーカイブの内容は未確認**。`docs/FINOWA_PLUS_BOOTSTRAP_SAFETY_QA_20261027.md`。
- FINOWA Draft PR #247：最新版JavaScriptのGitHub blob SHAを照合、実Node＋**合成Python検証器**の公開前後結合PASS。未追跡ファイル・前回PASSの無効化・証跡期限切れを拒否することを確認。実コンテンツ／本番XServer SHAは未照合。`docs/FINOWA_LOCAL_RELEASE_GATE_QA_20261027.md`。
- 家系簿 Pro Draft PR #5：実Nodeの監視切替回帰試験**10/10 PASS**、実テンプレートのCLIは**21条件不足でBLOCKED**。`docs/EXTERNAL_MONITOR_CUTOVER_QA_20261027.md`。
- 家系簿 Proの[2026-10-27 11:18 JST scheduled Run #40437651483](https://github.com/k-ait0/finowa-inheritance-rc12/actions/runs/40437651483)もJobが**skipped**。外部監視URL・通知試験は未実施、監視成功は未証明。Issue #4更新。
- 4 PRはすべてDraft・未マージ・mainと競合なし。**Actionsの新規起動、main更新、公開設定、GitHub料金変更、外部監視サービス登録はしていない**。

### 追記式改訂履歴
- 2026-10-27 v1.2.0：実Node/Python QA、全接続リポジトリ一覧、main保護・料金プランの実査、監視run継続スキップを集約。
