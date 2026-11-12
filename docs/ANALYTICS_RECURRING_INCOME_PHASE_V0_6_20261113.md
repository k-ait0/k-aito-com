# K. Aito Analytics｜Personal Multi-Asset v0.6｜継続収入の二相計算・DWZ年齢変換

2026-11-13 JST / **PERSONAL_ONLY_RESEARCH** / 公開禁止・商用利用未承認

## 完成範囲

v0.5の「個別臨時イベントにMONTH_START/MONTH_ENDを設定可能」という仕様を、給与と年金の複数継続ストリームへ拡張した。従来の4列入力、給与と年金の月初処理、イベント優先順位、月初/月末の資産売却順、整数円保存則は維持する。変更は研究ブランチのみ。

主なファイル：
- `lib/analytics/personal-multiasset-bridge.cjs`：継続収入の位相指定、段階別総収入、DWZ年齢ストリーム変換
- `research/analytics/personal-lab/multiasset.client.js`：給与・年金の4列/5列入力、CSV明細
- `research/analytics/personal-lab/multiasset.template.html`：入力説明、月末入金の運用タイミング
- `scripts/test-analytics-recurring-income-phase-v06.cjs`：180ケース＋DWZ固定関数
- `scripts/test-analytics-personal-multiasset-dom.cjs`：画面用の正常/異常5列入力テスト
- `.github/workflows/analytics-historical-research-regression.yml`：上記回帰を必須化

## 1. 継続収入のスキーマ

給与・年金それぞれのレコード：

```text
id, start_offset, end_offset_exclusive, monthly_yen [, timing]
salary,0,120,100000,MONTH_END
pension,0,120,60000,MONTH_START
```

`timing` は `MONTH_START` / `MONTH_END` に限定。5列目を省略すると`MONTH_START`（従来の意味）になる。`start_offset`以上・`end_offset_exclusive`未満の各月に指定額を計上する。終了月は含めない。ストリームごとのID重複・範囲外・負金額・不明時点は拒否。

収入は単なる注記ではなく、月次の相に振り分ける：
- 月初の給与・年金・外部積立・月初臨時収入 → 月初支払 → 当月リターン
- 月末の給与・年金・臨時収入 → 月末支払 → リバランス

月末収入を月初支出へ遡及利用したり、当月の市場収益率を月末入金へ適用したりしない。二相の必要がない4列だけの従来設定では従来計算経路を継続する。入力した期間内に月末継続収入が実際に存在する場合だけ、二相計算を有効化する。

CSVは `salary_yen`, `pension_yen` の総額に加え、`salary_month_start_yen`, `salary_month_end_yen`, `pension_month_start_yen`, `pension_month_end_yen` を列として保持。総額は各相の和に一致。

給与・年金からの積立を `INTERNAL_FROM_SALARY_PENSION` と指定した場合、資産への追加入金は発生せず、内部予算計上のみ行う。各月の積立額が給与＋年金の合計を超えると従来どおり拒否する。月末収入由来の内部積立は、月初の現物資金として扱われない。**口座間の実際の買付・送金を実行する機能ではない。**

## 2. DWZ年齢ベース期間の変換

`migrateDWZAgeIncomeStreams(streams,{simulationStartAgeMonths,horizon_months,kind})` を追加。古いDWZ定義の `startAgeMonths`／`endAgeMonths`（終了月除外）と `BEGINNING_OF_MONTH`／`END_OF_MONTH` を、今の相対月と `MONTH_START`／`MONTH_END` に明示変換する。

- 開始前から続いている収入は分析開始月にクリップし、期間内の残額だけを取り込む。
- 分析期間外の収入は黙って置換せず、`excluded` に `ENDED_BEFORE_START`、`STARTS_AFTER_HORIZON` などの理由を返す。
- 終了が省略された収入は、今回の分析期間末までで区切る。元の無期限シナリオを改変しない。
- `escalationModel` が `NONE` 以外（特に `CPI_LINKED`／`CUSTOM_PATH`）は**自動変換しない**。価額基準や年齢とCPIの参照月が確定するまで、誤った一定額への変換を拒否する。
- 本変換はDWZスキーマの一部に対する機能であり、DWZ本体の全入力形式・金融イベント・税ロットを移行するものではない。

## 3. 回帰試験

- 新規180通り：資産数1/2/3/6/12、給与と年金の月初/月末指定、売却方法3種、支出額3種の組合せ。すべて合成データ。
- 1資産・元本100円・月リターン+10%・給与100円：月初給与なら期末220円、月末給与なら期末210円。
- 月初年金30円、月末給与100円、元本100円、月初支出150円、運用変化0：月初の支払130円／未払20円、月末給与100円、期末残高100円。
- 旧4列の給与・年金入力は二相処理を起動せず、従来計算と一致する。
- 終了月が除外されること、分析期間外の月末給与を計上しないこと、未知のタイミングを拒否することを検証。
- DWZ R4 v16.9の固定研究用関数で、開始年齢480か月、月初年金30円＋支出20円、月リターン+10%、月末給与100円＋支出50円のケースは**両方期末1,161円**、運用益101円。年齢から相対月への変換結果を比較した。
- 既存のイベント別二相テスト180通り、旧DWZ固定テスト192ケース、2資産・積立・再配分・出典権利・オフラインビルドの一連のテストも継続成功。

GitHub Actions成功： https://github.com/k-ait0/k-aito-com/actions/runs/43273309315

## 4. Chromium実ブラウザー受入

CI生成の単一HTML（SHA-256 `2b391d587a69b48ddeeed0971738f0b07b6785896c636bd604e517106af91394`）をChromiumへ `set_content` でロードし、実際に画面で12資産・10年を計算してCSVをダウンロードした。

- 合成市場600月・12資産・120月・481完全開始窓。
- 月初年金60,000円・月末給与100,000円、初月の収入相をCSVと照合。
- 実ダウンロードCSVの120データ行・12資産期末残高列を確認。
- 4列形式へ戻すと従来一相経路へ戻る。無効な給与5列目では計算とCSV保存を停止。
- 元本100円・月初年金30円・月末給与100円・月初生活費150円の例で、初月未払20円、期末残高100円を確認。
- 390pxのスマホ幅で水平方向オーバーフロー0、JS未処理例外0、外部ネットワーク要求0。
- `file://` への直接遷移は検証環境の管理者設定により `ERR_BLOCKED_BY_ADMINISTRATOR`。HTMLの直接起動は**未確認**。ブラウザーにHTML本文を設定しての動作は確認済み。

## 5. 未完了

1. DWZのCPI連動給与・年金、相対年齢・暦年月を含む本格移行と全レコードの出典管理。
2. 口座間資金移動・金融商品の買付、ロット取得価額・税・NISA・手数料。
3. 年金の実際の支給日（月初/月末二択では表せない）や税引後の実収入。
4. JPY建てで合法的に利用できる公式長期株式・債券TR値、およびiPad/Safariの直接HTML起動QA。

本作業ではmain、FINOWA、公開Analytics、DWZ本体、非公開の本人市場値、秘密情報、商用ライセンスゲートの承認状態は変更していない。
