# KAITO｜手動Actions main書込みガード実Node検証（2026-10-27）

対象：Draft PR #64 / ブランチ `policy/manual-write-gates-20261027`。

## 実行環境

- Node.js v22.16.0、Git 2.47.3、Python 3.13.5 + PyYAML 6.0.3。
- GitHub連携で取得したファイルを隔離ディレクトリに再現。以下のGit blob SHAを`git hash-object`で照合。
  - `scripts/check-main-write-workflows.cjs`：`3515dfd1f505a684bed3f696f0d147f67cf08d85`
  - `scripts/test-main-write-workflows.cjs`：`8b8c49af21c66ed4d8869e6e9366d20689da2620`
  - `build-notebook-photo.yml`：`1108b6c0119782b15ee732156ee2141d17ce6440`
  - `sync-published-content.yml`：`79b18169d01799e744731845b20e5dec694c8d9c`

## 検証結果

- `node scripts/check-main-write-workflows.cjs`：**PASS**（書込み2件を認識）。
- `node scripts/test-main-write-workflows.cjs`：**PASS**（承認文字列・SHA・main ref・権限等の変異試験）。
- 2件のYAML構文と`workflow_dispatch`/2入力/1ジョブの構造：**PASS**（PyYAML BaseLoader使用。通常のYAML 1.1ローダーは`on`をbooleanへ変換するため不使用）。

注意：隔離コピーには、実際に変更する2つのワークフローをGitHub原本と完全一致で配置し、**その他9件は手動専用の最小fixtureで代用**した。したがって11件を数えるローカル監査ロジックは実走したが、11件すべての最新GitHub原本で総合監査した結果ではない。実際の全サイト`scripts/local-preflight.cjs`、ブラウザQA、本番確認は未実行。

## セキュリティ上の限界

- `confirm`は公開される確認文字列であり、秘密の認証情報ではない。Actionsを起動できるGitHub権限自体を付与・削除する仕組みではない。
- SHA照合はmainの取り違えを防ぐが、本番保護は別途Ruleset/ブランチ保護とレビューが必要。
- 今回のPRは既存11ワークフローの自動起動を増やさない。実Actions、git push、本番公開は一切実施していない。

## 今後の完了条件

- [ ] 実リポジトリの全11件とローカル`scripts/local-preflight.cjs`を実行
- [ ] mainの必須レビュー/必須チェック設定をGitHub管理者が確認
- [ ] PR差分を独立レビューし、必要な承認後に統合を検討

## 改訂履歴
- 2026-10-27 v1.0：実Node単体回帰・手動書込みYAML原本SHA照合・制限事項を記録。
