# K. Aito Analytics | CPI公表時点（as-of）研究計算 v0.25

**2026-11-13（JST） / ローカル・研究専用 / 正式指数への置換なし**

## この変更で新しくできること

v0.24 の `LEGACY_SAME_MONTH` / `CASHFLOW_BOUNDARY` は最終確定済み（またはその後改訂された）指数値を参照し、過去の各決済日時点でその値が公開されていたかは検査しない。本 v0.25 はこの計算を**変更せず**、別Core `runRollingPortfolioCpiAsOf()` を追加する。公表日付き**全履歴スナップショット**を入力し、決済日の前日までに公表された最新の一つを選び、その時点で実際に入手できたと*入力に記載された* CPI水準だけで毎月の生活費を決める。

**注意：** 公表日・アーカイブのSHAをユーザーが入力するだけでは、その事実は独立確認されたことにならない。真の過去時点再現には、公開時の歴史的ファイルそのもの、正確な公表日、異なる基準年への改定・再リンクの整合、元データのハッシュ照合が必要。現行の2025年基準・後日遡及修正の系列1本に、過去の架空公表日を付与することは厳禁。`historical_funded_fraction` は実測入力モードでもnullとしている。

## 仕様

- `cashflow_timing=MONTH_START`: 当該市場月の初日。`MONTH_END`: 当該市場月の末日。月次収益率の年月ラベルは終端月。
- `published_on` は ISO 日付 `YYYY-MM-DD`、存在する暦日だけ受理。**同日の公開は日内時刻不明のため採用せず**、厳密に `published_on < settlement_date` のスナップショットのみ使用。日内公表時刻はこのモデルでは扱わない。
- CPI各公表版 `cpi_vintage_snapshots[]` は `vintage_id`, `published_on`, `origin`, `source_id`, `series_id`, `series_kind`, `unit`, `seasonal_adjustment`, `levels[]`。観測元月を含め、各版の連続月次CPI履歴が必要。公表日と同月以降の月次CPIを含むレコードは拒否。
- 検索した最新公表版から、`MONTH_START` は決済月の**前月以前**、`MONTH_END` は**当月以前**で、同版内の最新の有効な月を選択する。これにより直近月が未公表なら前々月以前を使うことがある。
- 各ローリング開始月で、最初に利用できた観測月を基準CPI月として固定。毎月の生活費は `base_living_expense × (当該公表版の最新CPI / 同じ公表版に記録された基準月CPI)` で計算し整数円に丸める。**版Aの基準指数と版Bの最新指数を直接割らない。** 版Bに基準月が含まれない場合は、版Aへフォールバックせず、その開始窓を除外。
- 年金・一時収入・一時費用は生活費インフレの対象外。市場運用と月初/月末の会計処理はv0.24計算Coreに従う。元入力と台帳の独立照合監査を全窓に実行。
- 推計・代理の申告 (`proxy`, `estimated`) や未定義入力項目、シリーズID・基準年・由来の混在、CPI欠損・前倒し公表、重複版・同日内多版は**エラー**。完全な公表版が存在しない、または基準月を含まない窓は除外理由ごとに集計し、勝手に補完しない。
- 研究用選択肢 `market_mode=OBSERVED_RESEARCH` では各版に `source_snapshot_sha256` を要求するが、これは**利用者による申告**でありこのCoreはファイル実体を検証しない。結果は `cpi_source_archive_authenticated_here=false`, `actual_release_dates_independently_verified=false`, `publication_approved=false` とする。

## 実行（Node.js 22.16、オフライン）

```sh
node --test scripts/test-analytics-cpi-published-vintages-v025.cjs scripts/test-analytics-cpi-asof-cli-v025.cjs
node --test scripts/test-analytics-*.cjs
```

同梱の `examples/cpi-asof-v025-SYNTHETIC.json` は**完全な合成データ**。PCのGit checkout外の個人ディレクトリにコピーしてから次を実行（ファイルの送信はしない）。

```powershell
node scripts/run-analytics-private-cpi-asof-v25.cjs `
  --input 'C:\AnalyticsPrivate\cpi-asof-v025-SYNTHETIC.json' `
  --inspect-only

node scripts/run-analytics-private-cpi-asof-v25.cjs `
  --input 'C:\AnalyticsPrivate\cpi-asof-v025-SYNTHETIC.json' `
  --out-dir 'C:\AnalyticsPrivate\out'
```

入力と出力はcheckoutの外の絶対パスに制限し、入力にシンボリックリンクを認めない。私的詳細結果は`0600`（POSIX）で新規作成し同名を上書きしない。標準出力は原数値を含まない件数・状態・SHAのみ。WindowsのファイルACLは`0600`で保証できないため、実際の保存フォルダーにも本人だけのアクセス権を設定する。

## 合成データでの動作例（実市場結果ではない）

毎月生活費1000円、初期残高10,000円、運用リターン0、2026年1〜3月の仮想CPI版がそれぞれ2025年12月15日・2026年1月15日・2026年2月15日に公表されたと仮定。月初の最初の基準は2025年11月CPI100。各月の参照CPI100→110→121、生活費1000→1100→1210円。最終残高**6690円**を算出。これは公表日の選択・改訂版内除算の実装検証に過ぎない。

## 現状のブロッカー（独立管理）

1. **実測as-of分析は未実施。** 過去の日本CPIの実際の公表時点別アーカイブ（vintageごとの全歴史、基準年と取得元が固定されたもの）は未確保。現行e-Statから取得する2025年基準の最終系列だけでは、1980年当時などの情報集合は再現できない。
2. 円建て実測分析には既存のFed H.10・日本CPI暗号化原本のユーザー秘密鍵下での復号・SHA照合、旧Shiller正本または正式変更手続きが依然として必要。
3. 実際の公表ラグ・季節調整・異基準年への連鎖接続・リビジョン履歴を年次で追跡する資料の調査とデータ管理者QAが必要。過去の公表日や時点値を推測で補間しない。
4. 税/NISA/手数料・実際の配当権利落ち日などは引き続き未実装。重複ローリング窓を独立の確率とみなさない。
5. GitHub Actionsの暗号化原本Artifactは2026年11月18日に失効予定。本人の永続保管確認が別途必要。

**v0.25 は計算手続きの先読み防止であり、歴史的な公表情報そのものの真正性を証明したものではない。** main・本番・DWZ PR #70への変更は行わない。
