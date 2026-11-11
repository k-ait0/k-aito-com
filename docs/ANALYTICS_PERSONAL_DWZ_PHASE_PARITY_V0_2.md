# K. Aito Analytics / Personal Lab v0.2 — DWZ 月次計算の照合

**実装状態: PERSONAL-ONLY, RESEARCH, NO PUBLIC DATA/NO COMMERCIAL RELEASE**

対象：
- 本人専用UI：research/analytics/personal-lab/index.html
- 照合したDWZ：DWZ R4 v16.9研究プレビュー、`dwz-r4-v16-5-xserver-preview`、`lab/dwz/index.html` blob `f15d2ca56b65450e9a590f34bdcbe0d8959d1e59`
- 比較関数：research/analytics/fixtures/dwz_simulateOne_r4_v16_9_research_fixture.js（DWZの`simulateOne`を抽出した、**研究用の不変比較サンプル**）
- 自動照合：scripts/test-analytics-dwz-withdrawal-phase.cjs（192件の合成データ、実運用データはコード/CIに含めない）

## 1. 仕様差分と修正

| 論点 | v0.1 | v0.2 | DWZとの関係 |
|---|---|---|---|
| 引出し順序 | 月末のみ。リターン反映後に引出し | **月初と月末を切替可能**。月初は運用リターン反映前、月末は反映後に引出し | DWZ `phase('BEGINNING_OF_MONTH') → market return → phase('END_OF_MONTH')` と対応 |
| 支払回数 | 月0の基準値に続くNか月の月末でN回 | 月初では月0〜N−1にN回、月末では月1〜NにN回。**どちらもN回** | 初期観測月とDWZ市場リターン月の1か月ずれを明示的に補正 |
| 資金不足 | 残高が0になった瞬間を失敗扱い | **未払額（予定引出額−実払額）が正の場合だけ失敗**。全額支払い後に残高0でも完遂可能 | DWZ `cashShortfallThisMonth`、`cumulativeCashShortfall` と照合 |
| 資金枯渇 | `ruinMonth` は残高ゼロと混同 | `depletedMonth`＝最初の残高0、`firstShortfallMonth`＝最初の未払発生。旧`ruinMonth`は後者の別名として保つ | DWZ `firstShortfallAgeMonths` に対応 |
| CPI連動 | 引出し月のCPI / 開始月CPI | **引出し発生日のCPI**を使用。月初・月末で最初の支払月が変わる | DWZ `CPI_LINKED` に対応 |
| 残高監査 | 期末残高と引出総額だけ | 月次 `due`、`withdrawn`、`shortfall`、`investment_return` を記録し、資金恒等式 `期末残高 = 初期資金 + 累積運用損益 − 累積実引出額` を検証 | DWZの月次 `totalAssets` / `investmentReturn` / `withdrawalsThisMonth` を比較可能 |
| 月次欠損 | CSV読込時に検査 | CSV検査に加え、**直接呼出し時も連続性を検査** | 過去データが飛んでいても月次リターンと誤認しない |
| 10年→30年切替 | 古い開始月が範囲外でも保持され画面にエラー | **長期化で無効になる開始月を最初の有効月に戻す** | UI特有の入力不整合を修正 |
| 既存DWZ金融Coreへの接続 | なし | 直接接続なし。**単一資産の計算順序と台帳だけ検証済み** | DWZ Draft / Core未正式承認を維持 |

## 2. 単一資産月次台帳の厳密な計算

研究UIが持つ月次系列 `P_0 ... P_N` は、各月末（FXは最終有効日）等の原値であり、月間の価値倍率 `q_i=P_i/P_(i−1)` を作る。これをDWZの入力用月次収益率 `r_i=q_i−1` と対応付ける。

引出時点を `BEGINNING_OF_MONTH` とすると
1. 月0の初期資金から月初引出しを実行する。
2. `q_1` の運用変動を反映し、月1に到達する。
3. 月1（次の月初）に引出しを行う。
4. 最後の引出しは月N−1、その後は `q_N` を適用して月Nを期末とする。

`END_OF_MONTH` では
1. 月0の初期資金を保持し、`q_1` を反映。
2. 月1で最初の月末引出し。
3. 同様に月Nで最後の月末引出し。

いずれも N=12×対象年数回。残高不足の月は支払可能額だけ引き出し、残額を未払として累積。借入れ・マイナス残高は認めない。停止後の市場変動で0円が自然増殖することもない。

**正確に0円となった最終支払**はその期の予定額を全額支払ったなら成功。残高0は警告・評価項目であり、未払発生と同義ではない。

## 3. 自動QAと実ブラウザーQA

- scripts/test-analytics-personal-ui.cjs：合成の669か月、月次連続性、CSV原産地、10/20/30年窓、月初月末、残高ゼロ、支払不足、CPI連動、元本恒等式、履歴欠損、30年実行可能窓309件などを検証。
- scripts/test-analytics-dwz-withdrawal-phase.cjs：**192/192件 PASS**。DWZ側の実際の固定`simulateOne`関数を検証VMで実行し、月次と最終残高・実支払額・支払不足額・運用損益・初回不足月の一致を確認。
- 独立ローカルChromiumで本人専用HTMLを描画：初期12000円、月100円、円現金名目固定、10年の120回払いは月末1981-01／月初1980-12に残高0でも**未払0で完遂**。初期10000円では初回不足月を表示。実Fed/CPI CSVの1971-01〜2026-09／669か月、基準100→2026-09の12.39、30年の開始月309件。JS例外と外部通信要求は0。
- 公開のGitHub Actions： https://github.com/k-ait0/k-aito-com/actions/runs/43064712145
- ユーザーがHTMLを保存して自己利用できる。source/dataの商用・公開権利は一切変更していない。

## 4. 正式なDWZ統合の残作業と境界

DWZの金融Coreは研究版 `0.2.1-phase1-beta`、最終金融計算の承認は未了。**今回は「同じ単一資産・入出金条件を与えたときに月次順序が一致する」という検証のみ。**

将来の拡張対象：
- 株式・債券・REITの適法取得済み実TR、現金・為替・金参考価格の異なるreturns種別への正規化。
- 2資産以上の保有、売却順序、リバランス、キャッシュバッファ、税/NISA、投資口座、手数料・スプレッド。
- 給与・年金、追加支出・臨時キャッシュフロー、目標残高、実質資金安全余裕（DWZ既存設計から段階的移植）。
- 浮動小数点境界や表示丸めに対する円単位監査。現行v0.2は内部で浮動小数点数を保持し、CSVでは小数第2位へ表示丸めしている。正規の会計台帳・課税計算としては未承認。
- DWZ Draft PR #70は別ブランチのまま。main、FINOWA、公開Analytics本番は変更しない。

**重要:** 単一資産の$USD現金には金利を含まない。GoldはWorld Bank公表水準で各月の予測判定未確認、投資可能TRではない。FX/CPIの欠損を補間しない。本人専用ローカル計算であっても提供元の規約は遵守する。
