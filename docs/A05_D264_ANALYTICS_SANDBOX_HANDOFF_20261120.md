# A05 D264｜設問品質・16タイプ集計基盤：オフライン検証受入（2026-11-20）

## 状態

**TECHNICAL_SANDBOX_QA_PASS／PRODUCTION_DB_NOT_CREATED／NO_RESPONDENT_DATA_COLLECTED／REVIEW_THRESHOLD_NOT_APPROVED**

Ver.2.2は独立プレビュー公開済み。D264はそこでの回答を受信する機能ではなく、D261設計を前提に、将来合意済みの提出データを扱う際の**集計・DB整合性・編集レビュー候補生成**をオフラインで試験するもの。ユーザー承認済みVer.1、Ver.2、Ver.2.1、Ver.2.2および通常版D242は一切変更しない。

- D264研究ブランチ：`research/a05-analytics-qa-d264-20261120`
- CI初回技術合格：<https://github.com/k-ait0/k-aito-com/actions/runs/44565777206>
- テスト対象DB：GitHub Actionsの**破棄されるPostgreSQL 16サービス**のみ
- 研究コード：
  - `scripts/a05-d264-quality-rollups.mjs` — 集計と手動レビュー候補提案
  - `scripts/test-a05-d264-quality-rollups.mjs` — 7ケースの合成データテスト
  - `research/a05/analytics/d264_integrity_patch_draft.sql` — D261のSQLに対する未適用の整合性補強草案
  - `research/a05/analytics/d264_ephemeral_postgres_qa.sql` — 一時DBの正例・負例テスト

## 集計で保証すること

1. 最初の30問の`SCALE_7(1〜7)`、`SKIP_UNKNOWN`、`SKIP_NOT_APPLICABLE`を混同しない。7段階の中間4はスキップではない。
2. 追加Y/Nの`YN_YES`、`YN_NO`、`YN_UNSURE`と未回答`NOT_ANSWERED`を混同しない。
3. 分母は**完了セッションで実際に提示した設問版の件数**。50問バンクの非出題設問は分母に入れない。設問改訂revision、診断バージョン、回答形式も区別する。
4. 日本時間（Asia/Tokyo）の日単位で、D261`daily_question_counts`/`daily_type_counts`の形に対応した数値を生成する。
5. 16タイプは、`BASE_30`と`FINAL_AFTER_YN`を分ける。未確定タイプを16タイプに比例配分せず、**全完了者分母**と**単独分類者分母**の両方を表示できる。
6. `submissionId`と`idempotencyKey`で同一提出の重複計上を防止し、内容矛盾のある再送を棄却する。
7. 個々の回答・個人識別用IDを集計出力に含めない。なお、今は本物の回答者の提出データは存在せず、サーバーへの自動送信もない。

## 将来の設問レビュー候補（未承認の暫定ルール）

`D264_PROPOSED_REVIEW_POLICY`：`minQuestionExposures=100`、`unknownRateAtLeast=0.25`、他の設問（同じquestionnaireVersionで同一questionIdの改訂版を除く）の出題加重平均より`10pp`以上高く、他設問の出題数`>=100`。

上記は編集検討用の**仮基準**であり、現在の設問の入替承認、機械学習による有害性判定、心理測定上の品質基準、公開サイトへの自動反映を意味しない。抽出結果は`manualReviewCandidates`に`EDITOR_REVIEW_ONLY`としてのみ生成。実際の期限・母集団選定・統計的誤差・季節変動は編集レビュー前に定義が必要。

**合成テスト例：** 150件出題、うち45件がUNKNOWNなら率30%。他設問のUNKNOWNが0%の場合は編集候補に入る。99件のみ、35/150=23.3%、他設問も同程度のUNKNOWN率なら、今回の仮基準では候補にしない。

## PostgreSQL 16で実際に検証した制約

- D261スキーマのCREATE TABLEおよび2集計VIEWを、一時DBへ適用。
- D264追加草案：設問定義の回答形式(`SCALE_7`/`YN`)と実回答の形式を複合外部キーで照合。30問の順番1〜30、追加Y/Nは1〜8へ制限。
- 30問時点の分類にY/N補完を宣言させない、BASE_30の日次集計にY/N由来の分類を混入させない。
- 無関係な回答形式や9問目のY/N、BASE_30へのY/N混入、出題総数と選択総数が合わない日次集計を実際のSQL INSERTで棄却。
- 集計ビューでUNKNOWN率2/5=40%、中間回答率1/2=50%、16タイプの全完了者率と単独分類者内率を比較。
- **SQLは草案**。`ALTER TABLE`もGitHub Actions一時DBでのみ実行。既存の実運用DBやGitHub Pagesには触れていない。

CI確認：D261 Nodeテスト7件、D264 Nodeテスト7件、PostgreSQL本体のスキーマ・集計・負例チェックPASS。CIステップ`A05_D264_SYNTHETIC_ROLLUPS_AND_EPHEMERAL_POSTGRES_PASS`。

## 本番収集への厳格なゲート

**現段階で収集エンドポイントを追加しない。** 以下が整うまでDBへの実回答保存を開始しない。

- 回答送信の利用目的・取得項目・任意同意（初期OFF）を画面で明示し、回答開始とデータ提供を別の意思決定にする
- 保持期間、削除/訂正の実務、本人特定を避けた削除申出の方法、退会不要の利用を決定
- IP・UA等のアクセスログを回答データと結合しない。Web/API層のアクセスログ自体も別途把握して保護する
- サーバー側で設問版・30問完了・最大8Y/N・一意提出・同意署名を検証し、クライアントの判定結果を無検証で信頼しない
- DB認証情報はサーバー側だけに置き、最小権限と管理者2要素認証・監査ログ・バックアップ方針を定義
- 低件数集計を一般公開しない。集計から個人の回答を再構成できないかを審査
- 収集前にユーザーが明示した設計・プライバシー方針に合意する

**未実装：** 本番用サーバー・本番DB、API受付、永続化、権限・同意UI、削除申出の運用、管理画面、設問の自動入替。DB草案のCREATEや合成試験が通過したことと本番稼働済みは同義ではない。
