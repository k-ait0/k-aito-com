# K. Aito Analytics v0.24 | 月初・月末 / CPI参照時点の差異解消

研究用バックエンドのみ。`main`・本番・DWZ PR #70・データ元台帳は変更しない。

- 修正Core 6: `portfolio-core.cjs`, `portfolio-ledger-audit.cjs`, `portfolio-input-audit.cjs`, `rolling-portfolio-lifecycle.cjs`, `rolling-portfolio-cpi.cjs`, `rolling-cpi-benchmark.cjs`。
- テスト1: `scripts/test-analytics-cashflow-cpi-phase-v024.cjs`。
- 仕様書1: `docs/ANALYTICS_CASHFLOW_AND_CPI_SETTLEMENT_PHASE_V0_24.md`。
- `cashflow_timing` は省略時 `MONTH_START`（従来互換）、明示 `MONTH_END` で市場騰落の後に当月の資金収支。
- `cpi_reference_policy` は省略時 `LEGACY_SAME_MONTH`（v0.13互換）、明示 `CASHFLOW_BOUNDARY` は月初=m-1、月末=mの最終改訂CPIを参照。
- CPIの公表日時を使った先読みなしのシミュレーションではない。
- **679/679件 PASS**（655既存＋24新規）、追加テスト内で240経路の独立手計算比較。
- 検証対象は合成データ。暗号化のFed/eStat/Shiller実原本の復号・照合は未完了。
