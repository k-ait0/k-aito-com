# Analytics v0.5 仮想ローリング UI — 再現用実装記録

**2026-11-11 JST / RESEARCH_ONLY_HOLD / 公開未承認**

## 復元されたソース

- `lab/analytics/rolling-preview.template.html`: 静的UI・CSS、noindex、外部通信禁止CSP
- `lab/analytics/rolling-preview.app.js`: 仮想の月次市場経路、条件入力、グラフ、表、25件ページネーション
- `scripts/build-analytics-rolling-preview.cjs`: v0.1～v0.5計算モジュールを外部通信なしで単体HTMLにバンドル
- `lab/analytics/rolling-preview.html`: 再生成済みの完全オフライン試作画面
- `scripts/test-analytics-rolling-preview-browser.py`: ChromiumのDOM動作検証（Playwright + Linux Chromiumが必要）

これらは研究用の同一ブランチに保存した。生成HTMLはGitHub上のテンプレート・JS・計算Coreから**文字列一致で再構成できることを確認済み**。商用サイト用の配布経路・iPadでの動作保証・本番公開は未承認。

## 動作仕様・境界

- 決定論的な420か月の**完全仮想**市場経路に対し、15年を選択すると241開始月を比較。
- 一つの架空の観測を欠損させると、その月を跨ぐ開始期間を計算対象から除外し、失敗として数えない。欠損区間をグラフ線で結ばない。
- 年金受給開始・仮定インフレ・臨時支出はシミュレーション開始からの相対期間で表す。
- 投資判断や実額の入力は不可。過去データと混同しないよう`market_mode:'SYNTHETIC_DEMO'`を明示。

## 再現コマンド

```bash
node scripts/build-analytics-rolling-preview.cjs
node --test scripts/test-analytics-*.cjs
python scripts/test-analytics-rolling-preview-browser.py
```

Node.js 22ユニットテストは**v0.6において147/147 PASS**。HTMLに対するChromiumの直接DOM動作検証は**38/38 PASS**。いずれも本番金融計算承認やiPad Safari QAの代替ではない。

**localhost・HTTPS-origin E2Eは環境のブラウザ遷移制限で未合格**。検証コードでローカルHTTPサーバーが起動しても、ページロードは`set_content`によるDOM直読込であり、実際のURLをロードするE2Eと区別する。

DWZ PR #70、`main`、市場データ取得元・権利審査状態は変更しない。確認用ページの公開はユーザー方針に従い、統合機能が揃うまで保留する。
