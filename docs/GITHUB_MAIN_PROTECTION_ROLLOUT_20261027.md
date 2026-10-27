# GitHub mainブランチ保護｜Actions非依存の段階的導入計画

作成日：2026-10-27 / 初版 v1.0.0 / 対象：ユーザーが管理する4リポジトリ

## 実際のGitHub状態（2026-10-27、branches/main API）

| Repository | main HEAD | `protected` |
| --- | --- | --- |
| `k-ait0/k-aito-com` | `3761211bf329d3a37685b144b19c82e1e8f3dd32` | `false` |
| `k-ait0/finowa-plus` | `b041a6eac619aa9523c4f109703db1f5ae2c5750` | `false` |
| `k-ait0/finowa-deplo` | `05fbc153ae1d36a129a05d7528859ec999fec23e` | `false` |
| `k-ait0/finowa-inheritance-rc12` | `6e944b3b52bbc961a5a928d093eb171051a97d64` | `false` |

このレスポンスはブランチの保護状態を示すが、別途組織やリポジトリで適用される**すべてのRulesetの設定内容・例外を一覧取得したものではない**。Ruleset/branch protectionの詳細管理APIは現接続では確認/変更できていない。完全に保護がないと断言する前に管理画面で確認する。

## なぜ優先度P0か

- どのmainも現在`protected: false`。Actionsを使わないローカルテストやAI作業ルールは、権限を持つGit pushやGitHub API編集を**強制的に止める仕組みではない**。
- KAITOの`build-notebook-photo.yml`と`sync-published-content.yml`、FINOWA+の`bootstrap-repo.yml`は手動専用でもmainへのpush処理を持つ（変更Draft PRで確認文字列・SHAのフェイルクローズを追加）。
- 確認文字列は秘密の認証ではない。操作権限はGitHubの権限設定と保護ルールで制御する。

## 導入ポリシー案（GitHub Actions増枠不要）

**最低限の構成（ユーザー・運用者の確認後）**

1. 既存の保護ルール、Ruleset、例外・外部deploy integrationを管理画面で確認する。
2. `main`だけを保護対象にして、**PR経由の変更必須**を有効化する。権限者による直接pushを原則禁止。
3. **force pushとbranch deletionを許可しない**。
4. **GitHub Actionsの成功をRequired status checksに登録しない**。現行のActions自動起動を最小化した状態で永久pendingになることを避けるため。
5. 独立レビュー担当者がいるなら1名以上の承認を要求。**単独開発で別のレビュアーがいないなら必要承認数を0にしてPR経由だけ強制**し、ローカルQAの証跡・内容レビューを運用手順で確保する。0名では独立レビューを保証しない。
6. スタッフ・bot・外部deploy用のbypassは原則付与しない。どうしても必要な場合は理由、期限、対象権限を限定し、記録する。
7. `Do not allow bypassing`とRequired Reviews等の強制オプションは、現在の管理者・レビュー体制でマージ不能にならないか試験してから有効化する。

**プラン上の制約**：GitHubの公式案内では、公開リポジトリの保護はFreeでも利用可能。一方、非公開リポジトリの保護はGitHub Pro/Team等の対象プランが必要。現在の各リポジトリの公開/非公開区分・契約プランの全条件は未確認。制約がある場合も**課金プランを無断変更しない**。

公式資料：
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets

## 外部システム・ワークフローへの影響

- FINOWA本体・KAITOの公開がmainへのマージ後のpushを監視している場合、**PRマージに伴うmain更新は継続**できる。ただし外部サイトの自動反映・Webhook・XServer設定は未確認なので、影響調査が必要。
- 上記手動main書込み3ワークフローは**PR必須化すると通常の直接pushが失敗する**。事前にローカル生成→独立PRへ運用を切り替えるか、それらをレガシー例外として明示的に実行停止扱いにする。PR #64/#4のSHAガードだけでは保護ルールの代用にならない。
- 家系簿 Proの監視予定ジョブはGitHubブランチ保護とは独立。外部監視が稼働するまでscheduleを廃止しない。
- FINOWA本体の限定PR`finowa-public-indexing-gate.yml`を保護設定のRequired checkへ追加すると、請求・利用制限でジョブ未起動時にマージ不能になるおそれ。現段階では必須化しない。

## 安全な導入順（各リポジトリ個別承認）

| 順 | 対象 | 前提 | 合格条件 |
| --- | --- | --- | --- |
| 1 | FINOWA+ | ブートストラップ実行停止、ローカル検査確認、権限とプラン確認 | 試験PRを使って直接push禁止・PRマージ可を確認 |
| 2 | KAITO | 手動main書込み2件の代替を確認、Web公開フロー確認 | サイト更新がPR経由で継続でき、ローカルQAを実施 |
| 3 | 家系簿 Pro | 本番運用・外部監視の障害切分けを優先 | 非公開情報/運用機能を妨げずPR経由で安全に更新 |
| 4 | FINOWA本体 | XServerの公開フロー・旧必須チェック・ジョブ停止理由を精査 | PRマージから公開までの全工程とロールバックが成立 |

## 実施前・実施後チェック

- [ ] 管理権限／公開/非公開と利用プラン／Rulesetを確認
- [ ] 必須チェックなし・PR経由・force pushと削除禁止の方針を確認
- [ ] ソロ開発か独立レビュアーがいるか確定（承認数の設計）
- [ ] 書込み可能な手動ワークフロー・XServer・公開インテグレーションへの影響を確認
- [ ] 管理者が設定を保存（現GitHub連携では実施できない）
- [ ] **安全な試験PRで検証**し、直接pushを伴う実試験は本番mainに対する事故リスクがあるため扱いを事前承認
- [ ] `branches/main`およびRulesetの状態を再取得
- [ ] 実施結果・適用者・UTC時刻・対象コミット・例外・ロールバックを追記

## 状態

**4/4リポジトリが未設定または保護未確認（branch API上は保護無効）。本計画は導入指示・承認ではない。** 4つのDraft PRはマージせず、Actionsの起動・本番・課金設定の変更を行わない。

## 追記式改訂履歴
- 2026-10-27 v1.0.0：4 mainブランチのprotected=falseを実査し、Actions必須チェック非依存の段階的保護計画を作成。
