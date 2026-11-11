# K. Aito Analytics / FINOWA｜月次生活設計Core v0.3

**更新日：2026-11-11（JST）**  
**状態：RESEARCH_ONLY_HOLD（公開・投資判断に利用不可）**  
**研究ブランチ：** `analytics-lifecycle-v0-3-20261111`

## 1. 今回の実装範囲

既存のv0.1月次キャッシュフローCore、v0.2シナリオ比較に、独立した`lib/analytics/lifecycle-core.cjs`を追加した。元のv0.1 Coreを変更せず、比較Coreから次の入力がある場合に新Coreを使用する。

- `pension_schedule`：月額年金の受給開始月・終了月（いずれも指定月を含む）。終了月を省略した場合は継続受給の仮定。支払源泉はモデル上の**額面収入**であり、税・社会保険控除・支給日のズレは未実装。
- `annual_expense_inflation`：生活費に適用する年率仮定。`(1+r)^(経過月/12)`で毎月複利補正。年金と臨時収支は名目固定。公式CPI履歴に連動した実績モードではない。
- `one_time_events`：指定月の一回限りの収入／支出。複数イベント同月可。支出不足は未充足額へ計上。

収支の月内時点は**期首資産＋積立＋年金＋臨時収入 → 生活費＋臨時支出 → 月次市場騰落 → 月末残高**。税・手数料・借入は扱わない。

## 2. 入力契約

```js
const {simulateLifecycleCashflow}=require('./lib/analytics/lifecycle-core.cjs');
const {makeSyntheticFlatPath}=require('./lib/analytics/cashflow-core.cjs');
const result=simulateLifecycleCashflow({
  initial_assets_yen:10000000,
  monthly_contribution_yen:0,
  monthly_withdrawal_yen:180000,
  annual_expense_inflation:0.02,
  pension_schedule:[
    {id:'public-pension',start_month:'2036-04',monthly_yen:130000}
  ],
  one_time_events:[
    {id:'home-repair',month:'2038-06',kind:'EXPENSE',amount_yen:1000000},
    {id:'cash-gift',month:'2038-10',kind:'INCOME',amount_yen:200000}
  ],
  provenance:'SYNTHETIC',
  monthly_returns:makeSyntheticFlatPath({start_month:'2027-04',months:240,monthly_return:0.002})
});
```

本例の資産・年金・臨時イベント・リターンは全て仮想値。計算結果は将来の成果を予測しない。

| 項目 | 入力条件・安全制約 |
|---|---|
| 金額 | すべて整数円、0以上。安全整数範囲を超える演算は拒否 |
| 市場系列 | v0.1と同様に最大1200連続月。`OBSERVED`と`SYNTHETIC`の混合を禁止 |
| 年率物価 | 小数で-0.5〜1.0の研究用制限。基準の生活費だけに適用 |
| 年金 | 最大20件、ID重複不可、開始／終了の逆転不可、対象月と交差しなければエラー |
| 臨時イベント | 最大500件、ID重複不可、対象期間外・不正種別・負の金額を拒否 |
| その他の金融入力 | 税率などの未対応フィールドを**受理せずエラー**。黙って計算から脱落させない |

年金の月額は本版では固定名目額であり、年金改定・支給日の2か月単位・所得税などは含まない。イベントも一回限りで、月途中の発生日や複数口座間移動の区別は未対応。

## 3. 比較Coreとの結線

`lib/analytics/scenario-compare.cjs`のシナリオ入力に前記3項目がある場合、生活設計Coreを使用。無い場合は従来のv0.1 Coreで計算する。

- 期間／月次市場パス／来歴の比較制約は従来のまま。
- `CONTROLLED`比較では市場リターン列を同一に固定し、収支条件だけを変える。
- `STRESS`では市場リターンの変更を許すが、差分を収支・市場の単独因果要因へ分解できたと表示しない。
- 比較に伴う年金・物価等の条件の正当性は金融監査が未完了。すべての出力は`publication_approved:false`。

## 4. QAの実測値

**Node.js v22.16.0、独立ファイル・ローカル実行：66/66 PASS。**

- v0.1 Core：20件（既存）
- v0.2比較Core：20件（既存）
- v0.3生活設計Core：26件（新規）

```bash
node --test scripts/test-analytics-*.cjs
```

既存Coreとの同額動作、年金開始／終了、臨時収支、インフレ・デフレ、破綻後の残高回復、比較APIの伝播、欠損や不正入力の拒否、100条件×12か月の台帳保存則を検査した。月次収支の単体検査が通っても、過去の実資産運用を再現した検証にはならない。

### 発見・修正した境界不整合

年金の終了年月が未指定のとき「シミュレーションの最終年月」を内部終了月として扱うと、開始年月がそれより未来の場合に「終了年が開始年より前」という誤判定になる。終了未指定は長期継続と解釈した上で、計算対象月との重なりを別判定するよう修正した。

また比較Coreがシナリオ用の`id`/`label`を生活設計Coreに渡して拒否される不整合を検出し、UI用フィールドを除外してから計算するよう修正した。

## 5. 未実装・禁止ゲート

- 実際の日本年金制度の税・保険料・受給開始年齢／生年月日・改定基準・支給月
- 時変の賃金・手数料・資産配分・リバランス、NISA、その他の口座・負債
- 公式CPIの過去実績との直接接続と、実測市場パスへの正式統合
- v0.1のローリングバックテストとv0.3の年金・イベントを組み合わせた統合バックテスト
- 年金控除・税・物価による実質可処分所得などの金融計算の外部監査
- Web UI、HTTPSブラウザE2E、iPad Safari実機、本番配備、公開・商用データライセンス

**PR #70を変更・マージしない。** データ取得ブランチのソース固定資料・ロック済みURL・商用表示判定を変更しない。次はAnalytics専用のダミーデータ限定UI試作と、このv0.3を使う比較画面の表示QAを優先する。
