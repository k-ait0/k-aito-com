# K. Aito Analytics v0.25 — Published-vintage CPI as-of research

- 新規Core: `lib/analytics/cpi-published-vintages.cjs`, `lib/analytics/rolling-portfolio-cpi-asof.cjs`
- 非公開オフラインCLI: `scripts/run-analytics-private-cpi-asof-v25.cjs`
- テスト: `scripts/test-analytics-cpi-published-vintages-v025.cjs`, `scripts/test-analytics-cpi-asof-cli-v025.cjs`
- 仕様: `docs/ANALYTICS_CPI_PUBLISHED_VINTAGE_ASOF_V0_25.md`
- 合成実行例: `examples/cpi-asof-v025-SYNTHETIC.json`
- v0.24コードは変更せず、新機能は独立した研究モード。真の公表日時・履歴原本がない場合は歴史的as-of分析と称しない。
- 本番・main・PR #70は無変更。
