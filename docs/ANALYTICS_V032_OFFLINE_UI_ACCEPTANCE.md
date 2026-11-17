# K. Aito Analytics v0.32｜オフライン試算UI・第一段階の受入記録

**2026-11-18 JST／研究ブランチ専用／本番非公開**

## 開発目的

v0.31のB07（画面統合・手動受入未完了）に対し、実データQAを待つ間でも、実装済みの**同一計算Core**を使って操作できる、ネットワーク不要な試算画面を作る。合成データの試算を、実測バックテストや正式版の結果と誤認させない。新たな「観測済みデータ受入経路」は作らない。

## 生成物

- `research/analytics/K_Aito_Analytics_Offline_Preview_v032.html` — 1枚で開ける合成データ専用UI。サーバー・外部CDN不要
- `lib/analytics/offline-preview-v032.cjs` — シナリオ生成と既存Coreへの厳格な入力変換
- `research/analytics/offline-preview-v032.browser.js` — 画面操作・残高グラフ・エラー表示（個人情報等の送信なし）
- `research/analytics/offline-preview-v032.template.html` / `.css` — 自己完結のHTMLとスタイル
- `scripts/build-analytics-offline-preview-v032.cjs` — 既存CJS依存関係だけを厳格に同梱、インラインCSPのSHA-256を固定
- `scripts/test-analytics-offline-preview-v032.cjs` — 入力・Core間一致・DOM操作・CSP・再現ビルドの21件のテスト

## 操作できる範囲

| 項目 | 仕様 |
|---|---|
| 初期資産／月次積立／毎月の生活費 | 整数円。負値、文字列、未対応項目を拒否 |
| 分析期間 | 10・20・30年（Coreは1〜30年の整数にも対応） |
| 想定年率リターン | 固定想定または初年度-30%の合成ショック、翌年度以降は設定年率 |
| 想定CPI変動 | 連続複利の**合成系列**、実際の指数ではない |
| 決済時点 | 月初・月末。既存`simulatePortfolio`に変更なし |
| 結果 | 固定生活費と合成CPI連動生活費の最終残高、初期・最終生活費、資金不足月数、未払い総額、年次折れ線図 |
| 内部一致 | `simulatePortfolio`、`auditPortfolioAgainstInputs`を双方のケースに実行。CPIケースは`runRollingPortfolioCpiLinked`とも一致確認 |
| 情報セキュリティ | 外部通信・外部CDNなし。厳格CSPに`connect-src 'none'`・`form-action 'none'`。キー・平文CSVの入力欄なし |

## 検証結果と限界

- v0.30既存899件とv0.32新規21件の**合計920件にPASS**（Node 22.16.0）。
- CJS計算Core、月次台帳監査、CPI連動Coreの三者一致。合成データの30年試算・資金不足・デフレ・月初月末処理・数値異常を検証。
- 自己完結HTMLをVM上の擬似DOMで実行し、初期描画、フォーム送信後の再計算、無効入力時の過去結果の非表示を検証。
- JavaScript/CSSの**実際の埋込バイト列**に対するCSP SHA-256もテスト。
- **ブラウザーの実画面での目視・クリックによる手動受入は未完了。** 擬似DOMテストを実ブラウザE2Eと呼ばない。
- `market_mode='SYNTHETIC_DEMO'`を固定。実市場・円相場・2025年基準の公表版CPI、原本SHA、API取得、税・手数料・実際の事業/年金情報は含まない。合成CPIの月初・月末処理は**公表時点の再現ではない**。
- 外部の一般公開・商用使用を承認していない。原本と入力権利の検証・保有資産の課税ロットなどは未完了。

## 完成ゲートの扱い

- B07を **「完了」にはしない**。サブゲート`B07-A`「実Coreを使った合成オフライン試算UI」がPASS。`B07-B`「実ブラウザー操作/手動受入」は未完了、`B07-C`「別の実画面/本番への統合」は未完了。
- B02所有者管理下の永続保管、B03所有者秘密鍵による復号・認証、B04実CSV列構造検証、B05正本照合、B06円建て実測QAは依然未完了。
- v0.31の暗号化原本6件統合ZIPは別成果物として渡してある。**開発ZIPに暗号化原本や秘密鍵を含めない。**
- `main`、本番サイト、Draft DWZ PR #70、既存の正式データ出典ロックは無変更。

## Windowsでの開き方

開発ZIPを展開し、`research/analytics/K_Aito_Analytics_Offline_Preview_v032.html`をブラウザーで直接開く。通信接続不要。ソースから再生成する場合、Node.js 22で `node scripts/build-analytics-offline-preview-v032.cjs` を実行する。
