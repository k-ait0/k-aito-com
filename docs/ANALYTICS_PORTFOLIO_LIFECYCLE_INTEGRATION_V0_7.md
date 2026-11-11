# K. Aito Analytics / FINOWA｜複数資産×生活設計×ローリング統合 v0.7

**2026-11-11 JST｜RESEARCH_ONLY_HOLD｜本番公開・投資判断・第三者配信に未承認**

## 今回の統合

- `lib/analytics/portfolio-core.cjs`：固定の月次積立・取崩に加え、月ごとに異なる`monthly_cashflows`を受け付ける。固定と変動設定の同時指定・null・月不一致・未対応項目を拒否する。既存の固定方式は変更しない。
- `lib/analytics/rolling-portfolio-lifecycle.cjs`：相対開始月の年金・インフレ・臨時収支を月別に展開し、1〜12資産の月次運用・リバランス・全開始月のローリング分析に接続。
- `lib/analytics/rolling-portfolio-compare.cjs`：同一市場パスで最大8つの生活設計・配分・リバランス方針を比較。
- `lib/analytics/private-historical-adapter.cjs`：取得担当からの**非公開・正規化済み・円建て月次リターン**の受入契約。取得元ID・リターン種別・通貨・来歴・権限申告・月次観測を審査。勝手な欠損補完と代替系列切替をしない。

### 計算順序

月初残高 + 月初積立 + 年金 + 臨時収入 → 生活費（年率インフレを月次複利換算） + 臨時支出 → 資産別月次リターン → 期末リバランス。年金などをいったん投資してから支出を保有比率で按分する研究用 gross-flow 仮定。税・社会保険・NISA・売買手数料・為替換算・複数口座・借入は未対応。

ローリング生活設計では`offset_months=0`が各市場開始ウィンドウの初月。歴史年月を年金受給開始の実年月として誤解釈しない。欠損月を跨ぐウィンドウは失敗の分母から除外する。過去の成功件数・頻度を将来の成功確率とは呼ばない。

### データ取得担当への入力仕様

正本：`research/analytics/source_registry.v0.2.json`。`preparePrivateMonthlyMarket({series,source_registry})`に正本レジストリを明示して渡す。

各 series の必要条件：正本の`asset_id`、固定`source_id`、`return_kind`（原則正式TR）、`currency:'JPY'`、`return_unit:'DECIMAL_MONTHLY'`、出典URL・発行者・取得日時・原本SHA256、`data_qa_passed:true`・`private_research_authorized:true`・`observed:true`。各月は`{month:'YYYY-MM',origin:'OBSERVED',monthly_return:0.01}`。

旧Shiller系列を使う場合は正式S&P500 TRの代替として黙って挿入せず、明示した`source_mode:'EXPLICIT_RESEARCH_FALLBACK'`、`return_kind:'RESEARCH_APPROX_RETURN'`に限る。金スポット、商品価格、金利、債券利回り、CPIなどを投資可能なTRとして入力することは禁止。必要な為替変換・実質化は別担当のQA済み工程で実施する。

**安全境界：** このアダプターは自己申告のデータ形状・取得元ID・リターン種別を検査するだけで、原本のSHA一致・実際の商用許諾・FX元系列・指数計算法の正しさを独立には証明しない。結果は常に`publication_approved:false`、`source_rights_approved:false`。

## 2026年11月11日時点の実データ保有状況（別チャット・研究枝の監査記録）

- Shiller 1980-01〜2023-06の522か月（概算USD配当込み、研究専用）。
- 日本CPI：2系列・計1,643観測。
- Fed USD/JPY：1971-01〜2026-10の670か月、取得チャネルADR未承認。
- World Bank Pink Sheet：71列・延べ50,514観測を監査。金は802か月の原本があるが定義・第三者権利で隔離。71商品は投資商品のTRではない。
- 資産12クラスの正式な60年TRセット・公開利用承認は未完了。非公開原本は**このCore開発環境に未搬入**。v0.7の実市場統合QAを合格とは扱わない。

## 検証

``bash
node --test scripts/test-analytics-*.cjs
``

Node.js 22.16.0：既存147件 + 新規61件 = **208/208 PASS**（ローカル）。欠損月の除外・元Coreとの一資産数値一致・**521月次リターン→30年完全窓162件**・日付/金額/権限の不正入力を検証。仮想値を使ったテストであり、長期実市場データをロードした検証ではない。

公開用確認ページはユーザーとの合意により当面追加しない。DWZ PR #70、`main`、Xserver、GitHub Actions、データ取得担当の研究枝は変更しない。次はデータ担当との非公開インポート検証と金融計算の丸め・キャッシュフロー時点・手数料モデルの監査。
