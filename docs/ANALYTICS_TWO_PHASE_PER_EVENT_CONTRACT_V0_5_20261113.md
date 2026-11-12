# K. Aito Analytics｜本人専用の二相収支計算 v0.5｜設計と受入

2026-11-13 JST / **PERSONAL_LOCAL_RESEARCH_ONLY** / main・FINOWA・公開Analytics・DWZ本体無変更。

## 目的と実装範囲

旧DWZ（固定研究用 R4 v16.9 simulateOne）とPersonal Lab v0.5の月初／月末処理を横断監査して確定した違いを、12資産の研究専用Coreに**選択可能な二相収支処理**として追加した。税・NISA・個別ロット・手数料・実際の約定条件を再現するものではない。

対象：
- `lib/analytics/portfolio-core.cjs`：新しいオプション `monthly_phase_cashflows` を実装
- `lib/analytics/personal-multiasset-bridge.cjs`：イベント別タイミング、優先充当、予定純収支と実現純収支
- `research/analytics/personal-lab/multiasset.client.js`・`multiasset.template.html`：5列イベント入力、CSV
- `scripts/test-analytics-two-phase-event-v05.cjs`：180組合せ＋DWZ限定一致例
- `.github/workflows/analytics-historical-research-regression.yml`：旧全テストと新テストを実行

## 入力方式

旧画面の4列形式は維持する。

```text
repair,60,EXPENSE,500000
gift,180,INCOME,1000000
```

新5列形式では、臨時イベントごとに `MONTH_START` / `MONTH_END` を指定する。

```text
repair,60,EXPENSE,500000,MONTH_START
gift,180,INCOME,1000000,MONTH_END
```

- 4列での収入の既定時点は月初、支出の既定は画面の共通 `withdrawalTiming`。
- 5列指定でも既定と一致するだけなら、旧Coreの**一括処理経路**を使う（後方互換）。
- 現在の分析期間内に実際の異時点指定があれば、新しい**二相処理経路**を使う。
- 新Coreの `monthly_phase_cashflows` は年月＋月初／月末それぞれの収入・支出の4整数円を持つ。旧 `monthly_cashflows`、固定額の入出金との混在は禁止。
- 月初：収入を資産へ追加 → 支出を売却して支払う。月次騰落を反映後、月末：収入を追加 → 支出を売却して支払う。最後にリバランス。月末に入金した分へ当月リターンを遡及適用しない。

## 計算・資金保存則

各月：
- `closing = opening + start_income + end_income + market_gain - start_paid - end_paid`
- `start_due = start_paid + start_unfunded`
- `end_due = end_paid + end_unfunded`
- 総収支は**グロス**の入金・予定支出・実支払・未払額を各相で分離し、**ネット**は派生値として計算する。
- `scheduled_net = gross_income - requested_expenses`
- `realized_net = gross_income - actually_paid_expenses`
- 資金不足がある場合には `scheduled_net` と `realized_net` が必ずしも一致しない。
- 月初の未払を後から来た月末収入で、過去にさかのぼって支払済みにしない。手形／債務の後日返済を追加する機能ではない。
- 通常生活費のCPI参照月は設定した共通の月初・月末。臨時イベント額は名目額として入力され、個別のCPI自動連動はまだ行わない。
- その時点の生活費・臨時支出は `expense_priority`（臨時優先／生活費優先）に従って支払帰属する。**別の時点の支出とは混ぜない**。
- 証券を何から売るかは `withdrawal_strategy`（比例／現金優先／投資優先）が別途決める。

Core月次行 `rows[].phases.MONTH_START` / `.MONTH_END` にそれぞれの入金、予定支出、実払、未払を保持。資産別行にも期首／期末の入金・売却配分を残す。

### DWZ固定関数との照合

DWZ R4 v16.9**固定研究用**関数（本番の現行DWZを意味しない）と、単一資産、整数円で丸め差が出ない、十分な資産がある条件で照合：

- 初期資産1,000円、月初収入60円・支出20円、運用リターン+10%、月末収入50円・支出30円。
- DWZ固定関数と新Coreの期末残高：**1,164円**。
- 月中運用利益：**104円**。
- DWZの「収入支出を相殺した収支」と新Coreの「グロス入金110円／グロス支出50円／実現ネット60円」は最終資産と同じ。
- ただしDWZは同時点の入出金をネット化する。新Coreは個々の入出金を区別し、税務・費用・取得価額への将来拡張時には当該相違を必ず考慮する。

これは**DWZすべての計算条件との一致ではない**。DWZの年齢ベースのスケジュール、CPI条件、金融イベントの一部未実装、税ロット計算などは別途対応が必要。

## 受入QA

- 180通りの合成シナリオ（1・2・3・6・12資産、3売却戦略、2支出優先、通常支出2時点、3イベント構成）で月初／月末の予定・実払・未払、資産別売却、整数円の資金保存則を検証。
- 月初の不足が月末の収入によって事後解消されない例。
- 同時点の入金と出金が相殺されず別記録される例。
- 5列イベント入力の異時点経路と、4列イベント入力の旧経路の互換性。
- 既存のDWZ固定fixture 192ケース、旧Personal Labの2資産・積立・給与／年金、1〜12資産Core、権利ゲート、オフラインバンドル回帰を継続。

GitHub Actions成功： https://github.com/k-ait0/k-aito-com/actions/runs/43270036022

**入力系列の出典確認は別**。合成TRの検証は実在のJPX／NOMURA-BPIライセンス済み長期データを新たに取得したことを示さない。

## なお未完了

- 給与・年金の個別月初／月末指定：現時点では給与・年金は月初入金。臨時収入・支出のみ個別指定。
- 個々の財務イベントをDWZの生涯年齢にマッピングし、DWZの収支ネット化・ロット管理と完全互換にする移行層。
- 内部積立の現実の口座間振替・資産別の買い増し約定。
- NISA、特定口座、譲渡益、配当税、税務年次差、費用と約定価格、指数使用権限。
- 実機Safari/iPadによるファイル直接起動・CSV保存。

外部通信なしのローカル研究UIに限定し、main・FINOWA・公開Analyticsと私的原本市場データは変更・公開しない。
