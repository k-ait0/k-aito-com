# GitHub Actions最小化ポリシー

2026-10-26 v1.0.0｜対象：k-ait0/k-aito-com

## 大原則
**全11ワークフローは手動実行（workflow_dispatch）のみ**。開発・実装・テスト・ビルド・静的解析はローカルを優先。PR、push、label、schedule、workflow_runによる自動実行を許可しない。セキュリティと本番公開の検証を省略するのではなく、必要な実行を対象SHA確認後に責任者が手動で起動する。

| ワークフロー | 従来の自動トリガー | 現在 |
|---|---|---|
| browser-qa.yml | 既に手動 | 手動のみ |
| build-image-assets.yml | push | 手動のみ |
| build-notebook-photo.yml | main push | 手動のみ |
| kidp-live-deployment-readiness.yml | PR | 手動のみ |
| kidp-p0-participant-journeys.yml | PR | 手動のみ |
| kidp-wave-a-browser-qa.yml | PR | 手動のみ |
| live-production-check.yml | main push / workflow_run | 手動のみ |
| mono-base-qa.yml | PR / label | 手動のみ |
| origin-diagnostics.yml | main push | 手動のみ |
| seo-audit.yml | PR / main push | 手動のみ |
| sync-published-content.yml | 既に手動 | 手動のみ |

## 再発防止とローカル検証
- 11件全数と未知のworkflow追加を scripts/check-actions-manual-only.cjs で検査。ポリシーを緩める変更もfail-closed。
- node scripts/local-preflight.cjs を通常のPR前検証として実施する。GitHub Actionsには依存しない。
- ローカルフックは任意で git config core.hooksPath .githooks を実行して導入。pre-commitではポリシー検査、pre-pushではローカル事前検査。clone直後に自動有効化はされず、API経由のコミットも対象外。
- AGENTS.md にAI開発の標準方針を記載。まとめたコミットとローカルのテストを原則とする。

## 本番・障害対応
必要なQAはActions画面のRun workflowで手動実行する。対象ブランチ・コミットSHA・実行理由・実行ID・結果を記録する。公開後の live-production-check.yml による本番反映確認は**手動の必須工程**とする。未実施のまま公開成功と宣言しない。画像生成や公開記事同期の書込権限は残るため実行時に確認する。

## 未実施のGitHub側保護
mainの保護・変更レビュー必須化・必須チェック変更は、現在の接続権限で確認/更新できていない。ブランチ保護で必須チェックが残っていると手動化後にPRがpendingになる可能性がある。Rulesetの確認と、必要なら有資格の別レビュアーを設定する。

## 他PRへの影響
2026-10-27時点でA05 Draft PR #61の`kidp-wave-a-browser-qa.yml`も`workflow_dispatch`のみであり、自動PR/push起動は確認されなかった。従前の「PR #61に古い自動起動が残る」という記載は解消済みの状態として訂正する。PR #61は多数の製品変更を含むため、マージ直前の独立したActionsトリガー検査と開発QAは引き続き必要。A05の診断実装・研究・リリース承認はこの運用変更に含めない。

## 例外と改訂履歴
自動起動の例外は**0件**。追加にはユーザーの明示承認、理由、コスト、代替手段、期限、変更履歴、独立レビューが必要。
- 2026-10-26 v1.0.0：9件の自動トリガーを削除して11件を手動専用化。ローカルガード・AI運用・Gitフックを追加。手動の本番QAは維持。

## v1.1.0追補：書込み可能な手動ワークフローを限定（2026-10-27）

- `build-notebook-photo.yml` と `sync-published-content.yml` は`contents: write`でmainにpush可能なため、単に手動起動とするだけでは誤操作リスクが残る。
- 両ワークフローに`confirm`（固定の確認文字列）と`expected_main_sha`（レビュー済みmain SHA）を入力必須化。選択ブランチはmainのみ。
- 実行時に`git rev-parse HEAD`で対象SHAを確認し、異なれば作業を中断。対象SHAは確認時点でのmainをGitHub画面などで独立照合する。
- 公開記事同期で、push失敗後に`git rebase origin/main`を繰り返す処理を削除。後続コミットを無承認で取り込まず停止する。
- `scripts/check-main-write-workflows.cjs` と回帰試験を`scripts/local-preflight.cjs`に追加。未知の`contents: write`ワークフローを検出。
- **推奨運用はローカル生成→PRレビュー**。手動Actions自体は原則使わない。今回の改修はActions利用を承認するものではない。
- 現行mainの11ワークフローは引き続き手動専用。自動起動は0件のまま。

### 改訂履歴（追記）
- 2026-10-27 v1.1.0：main書込み可能な手動2件に確認文字列・期待SHAゲートを追加。同期処理の自動リベースを廃止し、ローカル回帰監査へ組み込む。

### 調査履歴追記（2026-10-27）
- A05 Draft PR #61の実際のブランチ`feature/a05-d23-modular-diagnostic-20261025`のワークフローを再確認し、`workflow_dispatch`のみと判定。旧来の自動起動復活懸念について、現時点で事実と異なる記述を訂正した。マージ後の状態を保証するものではない。

### v1.1.1追補：入力ブロックの厳密検証（2026-10-27）

ローカル書込みゲートで、`confirm`の`required: true`が抜けても後続の`expected_main_sha`の`required: true`を誤参照して合格する可能性を除去。`confirm`と`expected_main_sha`それぞれのYAML入力ブロックに`required: true`／`type: string`が存在することを独立して検証する。変異テストを追加し、V8依存モックで回帰試験PASS。Native Node／Actions実行は未実施。

- 2026-10-27 v1.1.1：入力ごとの承認必須性の監査を強化。Actions自動起動0件を維持。
