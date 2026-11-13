# K. Aito Analytics | 月初・月末収支 / CPI参照時点を明示する研究契約 v0.24

**2026-11-13（JST）｜研究ブランチのみ。main / DWZ PR #70 / 公開サイト変更なし。**

## 1. 確認した構造的な差異と修正

v0.23以前の `simulatePortfolio` および独立監査2種はすべて「月初入金→月初出金→月次市場リターン→月末リバランス」の順序を前提としていた。旧月初仕様を一切変更せず、入力 `cashflow_timing` を**省略すると `MONTH_START`**、明示的に `MONTH_END` を指定すると**月次市場リターン→月末入金→月末出金→月末リバランス**になるよう修正した。

| 入力 | 運用順序 | 計算主体 | 市場リターン対象元本 |
|---|---|---|---|
| 省略・`MONTH_START`（従来互換） | 入金→出金→市場騰落→リバランス | 整数円・資産別 | 月初出金後の残高 |
| `MONTH_END`（新規明示） | 市場騰落→入金→出金→リバランス | 整数円・資産別 | 月初残高のみ |

「市場の `YYYY-MM` ラベル」は、その暦月の市場収益期間の**終端の月**を表す。日次配当・実際の資金決済日時までは再現しない。月末に取得した入金は当月市場リターンを享受しない。月末に出金すると、当月市場収益による残高から充当される。月末リバランスは別のフラグを立てているわけではなく、従来どおり指定周期・閾値で実行する。税・手数料を含まない。

例：期首100円・月次+100%・月次入金100円・月次出金50円（単一資産）。
- `MONTH_START`: `(100+100-50)×2=300円`
- `MONTH_END`: `100×2+100-50=250円`
- 月末の利益で引出し可能な場合：期首100円、+100%、月末150円出金なら50円残る。一方月初150円の出金では50円不足する。

## 2. 台帳・独立監査

月初と月末の両方式を `portfolio-core.cjs`、`portfolio-ledger-audit.cjs`、`portfolio-input-audit.cjs` で対応させた。
- 月初の `invested_before_return_yen` = 期首残高＋入金－実支払出金。
- 月末の `invested_before_return_yen` = 期首残高。
- 月初の `pre_rebalance_yen` = `invested_before_return_yen + investment_gain_yen`。
- 月末の `pre_rebalance_yen` = `invested_before_return_yen + investment_gain_yen + contribution_yen - paid_withdrawal_yen`。
- 資産別の `before_rebalance_yen` も、月末では `round(期首資産×(1+リターン))+資産別入金－資産別出金` に変更した。
- **監査修正：** 月末出金は市場収益後に充当するため、期首残高より大きな出金を、運用収益で支払えた正当なケースを拒否しない。逆に損失後の資金不足は厳密に判定する。
- 監査対象の元入力とレポートの `cashflow_timing` が一致しない場合、内部残高が整合していても入力照合監査を拒否する。

## 3. CPI参照月は独立した明示契約

`rolling-portfolio-cpi.cjs` と `rolling-cpi-benchmark.cjs` は `cashflow_timing` と `cpi_reference_policy` を受け取る。

| `cpi_reference_policy` | `MONTH_START` に使用するCPI | `MONTH_END` に使用するCPI | 注記 |
|---|---|---|---|
| `LEGACY_SAME_MONTH`（省略時互換） | 市場月mのCPI | 市場月mのCPI | 月初に同月の確定CPIを使うため参照先行の危険あり |
| `CASHFLOW_BOUNDARY`（新規） | 市場月m-1のCPI | 市場月mのCPI | 収支決済時点の月を表すが、公表日時ベースの再現ではない |

CPI参照は各ローリング開始窓で `最初の収支決済参照月` を基準に再設定し、年金・一時所得・臨時費用は名目金額で維持する。必要なCPI月が欠損すると**その窓を除外**し、過去月・未来月の指数を推測補完しない。`cpi_start_reference_month` と `cpi_end_reference_month` を各窓に記録する。年率固定インフレとの比較では、同じ市場窓と同じ cashflow timing のみを比較する。

**重要**：いずれも後から確定・改訂された月次CPIを使う遡及シナリオであり、当日までにCPIが公開されていたかどうかを再現しない。`MONTH_START + CASHFLOW_BOUNDARY` でも、前月CPIが当月初に公表済みとは限らない。この実装はイベント時点のCPI履歴公表日 / 改訂時点のデータを持たないため、無先読みのバックテスト・リアルタイム運用と称してはならない。`cpi_release_time_lookahead_possible:true` を必ず表示する。

## 4. 自動検証

```sh
node --test scripts/test-analytics-cashflow-cpi-phase-v024.cjs
node --test scripts/test-analytics-*.cjs
```

- v0.23の**655件**の既存テストが、旧仕様の既定値を保持したままPASS。
- v0.24の**24件**の追加テストがPASS（計**679/679**）。
- 市場騰落+100%で月初/末の差、-100%で月末入金が消滅しないこと、複数資産リバランス、収益で賄う月末出金、監査の偽装、欠損CPI月、固定率CPI公平比較をテスト。
- **独立の240件の乱数生成・単一資産経路**を月初/末で手計算ループと突き合わせ、月次払い・市場騰落・不足総額の一致を検査。乱数系列は固定シードで再現可能。
- テストはすべて合成データ。日本CPI/Fed原本のSHA照合、出版許諾、円建て実歴史運用結果は未完了。

## 5. 実装外、引き続き必要な作業

- 旧Shiller研究正本の未照合、Fed USDJPY・eStat日本CPIの**秘密鍵管理下での原本復号・バイト照合**。
- 11月18日にGitHub Actionsの元暗号化Artifactが失効するため、ユーザー自身の永続ストレージへ5件の暗号化バックアップ保管を確認。
- Personal Lab / DWZの既存画面に旧仕様と新仕様の明示UIを実装する工程（本v0.24では未変更）。
- 税/NISA/売買コスト、年齢と暦日、年金の総額明細、実際の物価指数公表ラグの研究。

本成果は、計算契約の不一致修正であり、投資助言・月次CPIの公表タイミングを再現した実測バックテストではない。
