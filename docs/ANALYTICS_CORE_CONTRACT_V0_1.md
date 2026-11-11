# K. Aito Analytics / FINOWA 共通キャッシュフローCore v0.1（研究版）

**記録日：2026-11-11（JST）**  
**状態：RESEARCH_ONLY / NOT_PRODUCTION_APPROVED**  
**配置方針：既存DWZ PR #70、本番サイト、`analytics-historical-v0-1-20261110` のデータ取得コードを変更しない。**

## 1. 採用済み境界・現在の事実

- **Analytics（B）**：月次台帳、シナリオ比較、ストレス、感応度、実際の市場履歴、ポートフォリオ、資産寿命を扱う詳細製品。予定URL `k-aito.com/lab/analytics/`。**まだ公開製品ではない**。
- **FINOWA（C）**：少数入力のかんたん試算と金融教育用の説明。今後同じ計算Coreを呼ぶ設計とする。FINOWA用UIはこのブランチには作らない。
- **DWZ R4 v16.9**：PR #70、Draft・未マージ。固定利回り主体の研究用ブラウザ試作。従来Coreの金融妥当性ゲートは未承認。比較UI・保存・仮想ストレスは「実装済み」だが、税・社会保険・NISA・複数口座の完成を示すものではない。
- **歴史データ担当**：別研究ブランチ。12資産クラス＋補助6区分（内部8系列）、原則60年の月次目標、出典固定、権利審査。現在公表に許された系列数は0。実データ収集をこちらで重複させない。
- 旧DWZの `HistoricalDatasetBundle` / `MarketPaths` / IndexedDBなどについては本ブランチに取り込まず、実体とライセンス／依存関係を検査できてから再利用可否を判定する。

### ユーザー指定の完成目標と調査区分

| 部分 | 現状 | 次の作業 |
|---|---|---|
| 01 ダッシュボード | 設計方針のみ、Analytics側実装未確認 | 出力指標の共通契約と表示層 |
| 02 キャッシュフロー | DWZ試作あり。独立月次Core **本ブランチに新規追加** | 年金・臨時イベント・生活費変化・税／手数料は別契約 |
| 03 シナリオ比較 | DWZ比較UIは存在。共通Core連携は未実装 | 複数ケースの同一条件比較、差分集計 |
| 04 感応度・ストレス | DWZ仮想経路UIは存在。共通Core連携は未実装 | 支出・利回り・インフレ・暴落の変更を明示 |
| 05 過去データ | 取得側で整列／範囲検査コードあり。本ブランチに**ローリング台帳計算を新規追加** | 認定済み系列とのデータ結線・権利ゲート |
| 06 資産・負債管理 | Analytics側未実装 | 口座・通貨・負債・借入計算の設計 |
| 07・08 | 引継ぎ指示末尾欠落により名称を未確定とする | 原資料を確認後に追記。勝手に仕様を補わない |

## 2. 実装物・責務境界

- `lib/analytics/cashflow-core.cjs`：Node.js/CommonJSの**依存なし・I/Oなし**の研究用関数。UIや実データ取得、税制は内包しない。
- `scripts/test-analytics-cashflow-core.cjs`：Node.js 22の標準 `node:test` で実行する独立自動テスト。実際の指数値や研究用Shillerデータは含めない。
- 計算は**整数円**で、毎月の利息／値上がりを `Math.round` で円単位へ四捨五入する。これはv0.1の研究用暫定ルールであり、将来の端数処理・税制基準とは別。
- 月次タイミングは **月初資産 + 月初積立 → 月初取崩 → 月次騰落を適用 → 月末資産**。債務超過による負の資産は許さず、未充足の引出額を別に記録する。
- `status=FUNDED` は指定した期間中の引出を全額満たしたことだけを示し、将来の成功保証を意味しない。
- 未対応：税金、社会保険、NISA、複数口座、相続、物価連動支出、年金、為替換算そのもの、資産クラス別配分、リバランス、売買手数料、臨時資金、変動キャッシュフロー。これらの結果を本Coreの出力として表示しない。

## 3. 計算API（v0.1）

### `simulateMonthlyCashflow(input)`

```js
const {simulateMonthlyCashflow,makeSyntheticFlatPath} = require('./lib/analytics/cashflow-core.cjs');
const result = simulateMonthlyCashflow({
  initial_assets_yen: 10000000,            // 必須。非負・整数・安全整数
  monthly_withdrawal_yen: 100000,          // 必須。非負・整数
  monthly_contribution_yen: 0,             // 任意。デフォルト0
  provenance: 'SYNTHETIC',                 // 'SYNTHETIC' | 'OBSERVED'
  monthly_returns: makeSyntheticFlatPath({ // デモのみ。実際の市場データではない
    start_month: '2026-01', months: 360, monthly_return: 0
  })
});
```

- 月次リターンは `{month:'YYYY-MM', monthly_return:0.01, origin:'SYNTHETIC'|'OBSERVED'}` の**時点を合わせた月次総リターン（小数）**。
- 初月には最初に適用する月次リターンを指定する。`2026-01`は「2025-12月末→2026-01月末の変動」を意味する。月次リターンは内部で推計・複製しない。
- 連続月を必須とし、重複・逆順・空白月・NaN・数値文字列・代理値（`proxy:true`）・推計値（`estimated:true`）・誤った`origin`を拒否する。
- `monthly_return` は -1.0〜10.0 の研究用安全範囲。-100%は許すがそれ以下の損失は禁止。境界は今後の金融監査で見直す。
- 出力には各月の台帳、`ending_assets_yen`、`first_shortfall_month`、`total_unfunded_yen`、`status`、`publication_approved:false`を含む。

### `runRollingCashflow(input)`

`simulateMonthlyCashflow` と同じ資金条件に加えて `horizon_months` を指定する。`monthly_returns` はすべて `origin:'OBSERVED'` でなければならない。

- 観測リターンの**連続した月だけ**を対象に、各開始月から指定月数の全ウィンドウを走査する。
- 欠損月をゼロ、前月値、推計値で埋めない。欠損を跨ぐ候補を`excluded_windows_due_to_missing_months`に集計し、**失敗の分母に入れない**。
- 有効ウィンドウが0件の場合、`status=INSUFFICIENT_CONTIGUOUS_HISTORY`、`observed_funded_fraction=null`。不明を0%と偽らない。
- `observed_funded_fraction=FUNDED件数／有効開始月数`は**過去の条件付き事後割合**であり、将来の成功確率、独立試行の推定値ではない。隣接する開始月のウィンドウは高度に重複する。
- 521件の連続した月次リターンに360か月窓を適用すれば162開始月となる。これはデータ整合性の簡易検証に用いる（値の実運用成功件数ではない）。

## 4. 歴史データ担当とのインターフェース契約

データ担当から本Coreへ渡す際は、**実データそのものではなく、内部認定ゲートを通った月次リターン**を研究環境内で渡すこと。現段階の公開GitHubへ元のShillerやライセンス未確認の指数値を追加してはいけない。

**最低限の月次データ列**：

| フィールド | 必須 | 例／基準 |
|---|---|---|
| `month` | 必須 | `1980-02`、時間軸の月末帰属が確定 |
| `monthly_return` | 必須 | 0.0123、名目・円換算済み・分配金取扱いを固定した小数 |
| `origin` | 必須 | `OBSERVED`。混合・代理値は渡さない |
| `proxy` / `estimated` | 推奨 | true の系列は実測モードで拒否 |

**Coreに入力する前に別途照合すべき系列台帳メタデータ**：

`source_id`, `asset_id`, `source_url`, `publisher`, `retrieved_at`, `content_sha256`, `license_review_at`, `series_rights`, `site_use_approved`, `currency`, `return_type`, `fx_method`, `inflation_method`, `start_month`, `end_month`, `missing_months`, `revision_date`, `data_qa_state`。

- **出典の自己申告だけで認定しない**。`origin:'OBSERVED'`は単なる入力ラベルであり、公的データの真正性・権利を本Coreが証明するものではない。変換・認定・公開制御は別レイヤーで実施。
- 通貨がUSDのままなら日本円の資産寿命と混ぜず、既存 `scripts/align-analytics-historical-series.cjs` のように**為替、円CPIの整列・QA**を前処理で完了すること。USD価格系列、円CPI、FXが欠落したら停止する。
- 指数のPR/TR/スポット/金利モデルは明示。指数利用許諾がないならサイト公開は0件のまま。現在の`source_registry.v0.2.json`と`ANALYTICS_SOURCE_POLICY_V0_2.md`を正本とする。
- 将来のデータコネクタは、取得ブランチの整列結果を本入力形式へ変換し、同じ連続月検査を行う。自動的な別取得元フォールバックは禁止。

## 5. 実行・検証

```bash
node --test scripts/test-analytics-cashflow-core.cjs
```

- v0.1時点のローカル実行：20件 PASS。外部データ未使用、localhostブラウザE2E未実施。既存DWZと数値一致を保証するテストではない。
- 実装を製品の計算Coreと認定するには、端数／騰落計上タイミング／数値精度／破綻後の扱い／ライフイベントの会計定義をレビューし、DWZ既存ケースとの横断テストを追加する。
- `node scripts/local-preflight.cjs`、DWZのHTTPS実機試験・Safari試験・手動GitHub Actions・公開確認は**このブランチのユニットテスト合格では代替されない**。

## 6. 次の開発順序

1. 本Coreに対する**複数シナリオ比較API**と月次結果差分を追加（共通対象と計算タイミングを固定）。
2. 年金・追加支出・収支イベント・物価連動・複数資産のリバランス契約を個別に定義する。混在実装せず金融計算の独立した検証ケースを作る。
3. Analyticsの別UIを表示専用として構築し、研究用・実測・代理モデルの識別をUIで保持する。FINOWAにはシンプルな設定だけを公開する。
4. 歴史データ側のQA合格後に内部データアダプターを結線。歴史・ライセンス・データ公開の承認は別ゲート。
5. 並行してDWZ PR #70の独立全リポジトリpreflight／localhost-origin/WebKit／実iPad Safari／HTTPS／金融計算Core監査を進める。ユーザー承認前にマージ・本番公開しない。

**変更管理：** この文書はCore側の研究仕様。データ取得元の固定正本を変更するものではない。07・08モジュールの名称と責務は原本が確認できるまで保留とし、既存の6モジュールは勝手に削除・置換しない。
