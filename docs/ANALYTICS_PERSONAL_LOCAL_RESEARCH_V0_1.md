# K. Aito Analytics｜本人専用ローカル研究モード v0.1（2026-11-11決定）

## 変更した方針

当面は、本人だけが非商用・非公開で使うローカル分析ツールとして開発を進める。商用サイト向けのデータ許諾・配信ライセンスは注意事項として保持し、通常の研究・計算開発を止める理由にはしない。

**注意：** 自己利用でも、提供元の個人利用・自動取得・コピー・AI利用の条件は適用される。無断の大量取得、二次配信、顧客向け公開を許諾したことにはならない。公開GitHubに原本の値は入れない。

### 本人専用と公開用を分離

| 項目 | 本人専用 | 将来の一般公開 |
|---|---|---|
| 環境 | 1人のPC、localhost、非公開CSV | 公開URL、共有API、会員利用 |
| 公式CPIとFed USD/JPY | 正式データのローカル分析と検証を進める | 表示・配信用途を追加確認 |
| Fed 1971年DDP | 研究候補として利用、ADR未承認 | 正式チャネル変更のADRが必要 |
| World Bank Gold | 公表値は出典状態未確定として探索分析限定 | 予測区分・第三者権利を確認 |
| JPX指数 | 公式に市場指標の自己利用はライセンス不要と明記 | 商用利用・表示・再配信には条件 |
| MSCI等の有料指数 | 合法的な個人取得データまたは合成テスト値 | 契約・派生データ条件の再確認 |
| シミュレーター | 私的な研究と品質検査を優先 | 本番公開と配信権限を別途審査 |

JPX自己利用規定：https://www.jpx.co.jp/markets/indices/licence/
MSCI個人・非商用規定：https://www.msci.com/legal/index-terms
World Bank第三者権利例外：https://www.worldbank.org/ext/en/legal/terms-conditions/datasets

## 実装

- 個人用方針：research/analytics/personal_use_scope.v0.1.json
- 権利判定：scripts/analytics-rights-gate.cjs に personal-local 検査を商用判定と分けて追加。研究許可を商用表示許可に変換しない。
- 分析ツール：scripts/analytics-personal-cash-fx-cpi.py。ネットワーク接続せず、手元の本人保有CSVだけから円建て実質購買力を計算する。
- 回帰テスト：scripts/test-analytics-personal-cash-fx-cpi.py（合成データ）、scripts/test-analytics-commodity-rights.cjs（本人用と商用・公開の両モード）。
- 本番サイト・mainブランチ・Analytics本体の計算ロジックは変更しない。

### 実行コマンド（例）

~~~bash
python3 scripts/analytics-personal-cash-fx-cpi.py --personal-use --fx /private/usdjpy_monthly.csv --jp-cpi /private/japan_cpi_monthly.csv --out /private/my_sandbox_001
~~~

出力先はGit checkout外の非公開ディレクトリ。金の未確認価格を含めるなら、隔離されたCSVを個人が用意し、--gold と --gold-exploratory を明示する。金の値は確定スポットと断定せず、投資可能な金ETFのトータルリターンには変換しない。

### 実測データでの第1回自己利用分析（独立ローカル検査）

1971-01〜2026-09、日次Fed H10から集約した月末ドル円とe-Stat全国総合CPIの**共通669か月**を用いた。米ドル1単位を利息ゼロで保有したときの円建て購買力を、1971年1月=100として比較。2026年9月の指数は **12.387653**。

10年継続窓549件、20年429件、30年309件。中央値倍率は10年0.821963、20年0.605090、30年0.369933。これは**過去の購買力パス**であり、利息・為替取引費・税を反映した投資収益や将来の運用成功確率ではない。

- 元のFed候補CSV SHA-256：4aeae87dd69b33936b5afc17a02ed85eea579fefca278b10dae4544c4a8ae6cf
- 元のe-Stat CPI CSV SHA-256：18da76e236057e1f59b2e7b224bfb7b0f2186d5586139d14b26c701ba74c36cc
- 私的分析結果CSV SHA-256：9a4b6b737e993f5020960a5c76a0c48a598f4f059c5a6d4c10fc43a9cd8ea95d
- 成果物：Kaito_Analytics_PERSONAL_USDJPY_CPI_PurchasingPower_1971_2026.csv、Kaito_Analytics_PERSONAL_USDJPY_CPI_PurchasingPower_QA.json （**GitHubには数値を登録しない**）。

## 次の開発

1. 本人専用のCSV取込と簡易／詳細分析モードを作る。
2. 月次の名目・実質・外貨換算と10/20/30年ローリング比較を統合する。
3. 総収益指数（TR）と、為替・インフレ・現物・利回りモデルを厳密に区別する。
4. 商用化する段階で初めて配信/販売ライセンスの費用と契約条件を正式判定する。

**許可状態は依然ゼロ：** 公開サイト利用・第三者配信・商用計算エンジン。自己利用モードは別の研究用許可レーンである。
