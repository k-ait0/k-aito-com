# K. Aito Analytics｜金融収支統合契約 v0.2｜受入記録

2026-11-13（JST） / PERSONAL_SINGLE_USER_LOCAL_RESEARCH / NOT RELEASED

## 目的と対象

監査報告 docs/ANALYTICS_CROSS_ENGINE_DISCREPANCY_AUDIT_20261113.md で確認した差異に対し、新しい本人専用12資産Coreアダプターの「支出の支払内訳」「旧年金期間の明示変換」「比較期間外の生活イベント」の3項目を調整した。DWZ本体・Legacy Core・旧Personal Lab v0.5は変更していない。

対象：
- lib/analytics/personal-multiasset-bridge.cjs （金融イベント／支払帰属）
- research/analytics/personal-lab/multiasset.template.html （選択操作・月次一覧）
- research/analytics/personal-lab/multiasset.client.js （UI・結果CSV）
- scripts/test-analytics-personal-cashflow-contract-v02.cjs （新規合成回帰）

## D04：通常生活費・臨時支出の支払充当順序

expense_priority = EVENT_FIRST | LIVING_FIRST。未指定時の既定は EVENT_FIRST（旧Personal v0.5と同じ臨時支出優先）。

EVENT_FIRST：同じ月の臨時支出を入力順で支払い、残額を通常生活費に充当。
LIVING_FIRST：通常生活費を先払いし、残額を入力順に臨時支出へ充当。

各月・各支出イベントについて due/paid/unfunded を整数円で監査。以下を必須の恒等式とする：
- living_due + event_due = Core gross requested_withdrawal
- living_paid + event_paid = Core gross paid_withdrawal
- living_unfunded + event_unfunded = Core gross unfunded
- scheduled = paid + unfunded

例：元本100円、生活費1,000円、修繕費100円、リターン0。
- EVENT_FIRST：修繕実払100円、修繕未払0円、生活費実払0円、生活費未払1,000円。
- LIVING_FIRST：修繕実払0円、修繕未払100円、生活費実払100円、生活費未払900円。
両者とも実出金100円、総未払1,000円、期末残高0円。

注意：優先するのは「支払の帰属区分」。証券の現金優先／投資優先の売却方法は変えていない。Coreは引き続き保有額比例売却を行う。法定の弁済優先や現実の銀行支払順序も意味しない。

## D05：年金終了月の明示移行

新ブリッジは start_offset を含み end_offset_exclusive を含まない半開区間で統一。旧 rolling-portfolio-lifecycle Core は end_offset_months を含む。そのため自動で同じ意味だと仮定しない。

migrateLegacyInclusivePensions(旧配列, 期間月数) を明示呼出しした場合のみ、旧終了月に1を足した新形式へ変換。旧0〜12（両端含む）で月100円は13回・1,300円。新0〜13（13は含まない）で同じ13回・1,300円。終端省略時の最終月、無効な期間、重複IDを検査する。

これは旧Coreや保存済み年金入力の破壊的修正ではない。入力形式に応じた変換処理が必要であり、恒久的な schema_version 管理は残課題。

## D11：期間外の生活イベントを記録して除外

臨時イベントは経過月0〜1199の範囲で許可。分析期間Nか月以上のイベントは、その分析では未発生として計算結果には反映せず、skipped_events_after_horizon にID・時点・種別・額を保持する。

12か月の分析で18か月後の贈与・修繕は2件除外、24か月の分析なら18か月目に両方を反映する。ローリング窓も除外件数を保持。イベント経過月1200以上、負金額、ID重複は引き続きエラー。

## UI・CSV

多資産ローカルUIに「臨時支出優先」「通常生活費優先」を追加。月次台帳に生活費・臨時支出の予定額／実払額／未払額を表示。結果CSVに以下を追加：

- living_expense_paid_yen / living_expense_unfunded_yen
- event_expense_paid_yen / event_expense_unfunded_yen
- event_payment_allocations（イベントID:予定:実払:未払を | で連結）
- expense_priority / outside_horizon_events

## テスト

scripts/test-analytics-personal-cashflow-contract-v02.cjs：144通りの合成条件（資産数1/2/4/12、期間1/12/24か月、給与条件、充当順序2通り、臨時支出額）で資金保存則を検証。複数イベントの入力順、旧年金期間からの明示移行、期間外イベント、異常入力の拒否も検証する。

その他、DWZ固定単一資産フェーズ照合、旧2資産、12資産、CSV読込品質、出典・権利ゲート、単一オフラインHTML構築の既存回帰を継続。

GitHub Actions合格：
https://github.com/k-ait0/k-aito-com/actions/runs/43254567309

この証拠は合成データによる数値検証であり、正式な株式・債券指数TR、税務法令、本人の実取引を検証したものではない。

## 継続課題

P0：月初・月末の位相差、DWZ同月ネット処理とCoreの総額処理、現金優先／投資優先の売却、CPI参照月、年齢と月番号の対応、取得価額と課税ロット、特定口座・NISA・売買費用、資金源の分類。

給与・年金から金融口座へ回したお金を「給与等の資産流入」と「別の外部積立」の双方に入力すると、現行のモデルでは二重計上となる。今回の実装はそれを自動排除するものではない。月額積立は独立の外部入金として集計される。

P1：期末リバランス・資産別端数・完全損失率・実機Safari・適法に取得した月次TR原本の本人利用での受入試験。

main / FINOWA / 公開Analytics / DWZ本体 / 非公開指数原本 / 商用ライセンス登録は変更していない。

## Chromium E2E追加検証（2026-11-13）

GitHub Actionsの検証済みArtifact 13961586947から出した同一バイトの単一HTMLを、Playwright＋Chromium（ヘッドレス）の実ブラウザーで実操作。原本HTMLのSHA256：8353332de5c9f1cb56e70535f398324aa7c65c51f59d7a1ebf70a7c31d275c4d。

- 合成デモ初期3資産、12資産への切替で月次120行・ローリング481開始月の計算と結果表示成功。
- 単一資産、元本100円、通常生活費1,000円、臨時支出repair 100円の実ブラウザー実行とCSV保存により、EVENT_FIRSTでは生活費実払0・未払1,000、臨時実払100・未払0、LIVING_FIRSTでは生活費実払100・未払900、臨時実払0・未払100を確認。両者のCore出金100円・不足1,000円は一致。
- 経過180か月後（15年後）の臨時収入イベントは10年の期間設定では除外記録なしを許さず、画面の「期間外イベント1件」を確認。20年へ切り替えると「0件」を確認し、計算継続可能。
- 390px幅でdocument水平はみ出しなし（390/390）、JavaScript例外0件、外部HTTP(S)リクエスト0件。
- ファイルのfile:// URLへの直接ナビゲーションは管理ポリシーによるERR_BLOCKED_BY_ADMINISTRATORで不可。**同一HTMLをPlaywright set_contentで実ブラウザーに展開**して検証した。iPad Safari実機の直接ファイル起動を証明してはいない。
- 新旧の正式な価格・TR原本を公開GitHubに載せておらず、実市場での税引後運用結果の根拠とはしない。

検証に使用した元HTMLは上記Actionsで生成。main/公開サイトの更新なし。
