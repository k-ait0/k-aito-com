# K. Aito Analytics / FINOWA｜ローリングUI v0.5 — 実装・QA記録

**2026-11-11 JST / RESEARCH_ONLY_HOLD / 未公開**

## GitHub に保存済み（このブランチ）

- `lib/analytics/rolling-lifecycle.cjs`：既定 `market_mode:'OBSERVED'` を維持し、`SYNTHETIC_DEMO` を明示的に追加。実測と仮想を相互に拒否する。
- `lib/analytics/rolling-plan-compare.cjs`：比較の来歴を継承し、仮想時に `historical_funded_fraction=null`、`demo_funded_fraction` を別出力とする。
- `scripts/test-analytics-rolling-demo-mode.cjs`：追加9件の境界・集計・混合防止試験。

ローカルの同一版で従来98件＋追加9件、**107/107 PASS**。ブラウザ画面はこのGitHubコミットにはまだ含まれていない。研究用HTMLのビルド元・試作画面・ブラウザQAは別途提供したZIPの中にある。**GitHubブランチが完全なUI実装を含んでいると誤認しないこと。**

## ローカル成果物（この会話で生成済み）

- `lab/analytics/rolling-preview.html`：自己完結した静的HTML。仮想420か月の市場経路、開始月ローリング、2生活設計案の期末資産比較、欠損月除外、25件ページ分割、選択月の不足額・不足時点、3種類の仮想経路。
- `lab/analytics/rolling-preview.template.html`、`lab/analytics/rolling-preview.app.js`、`scripts/build-analytics-rolling-preview.cjs`：画面の再生成に必要。
- `scripts/test-analytics-rolling-preview-browser.py`：390/820/1366px幅での直接DOM検証。**38/38 PASS**。
- **localhost HTTP-origin E2Eは管理環境の `ERR_BLOCKED_BY_ADMINISTRATOR` により不可。合格扱いにしない。** HTTPS配信、iPad Safari、金融計算・権利審査も未了。

## 公開ゲート

DWZ PR #70 は Draft/未マージを維持。Analytics/FINOWAへデータ配信はしていない。公開ライセンス承認のない市場データをGitHub/公開HTMLに含めない。実際の資産額を入力しない。

## 次の作業

1. ZIP内のHTMLソース・ビルドスクリプトを隔離研究ブランチに同期して再現性を確保する。
2. 完全なcheckoutで `node scripts/build-analytics-rolling-preview.cjs`、`node --test scripts/test-analytics-*.cjs`、ブラウザE2Eを実行する。
3. UIが動いた段階で、権利とQAを満たした内部市場データ用のアダプターを独立実装し、公開判定を別ゲートにする。
