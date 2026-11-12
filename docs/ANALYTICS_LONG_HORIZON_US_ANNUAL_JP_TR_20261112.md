# K. Aito Analytics｜長期米国資産年次研究・日本株式TR正式取得候補（2026-11-12）

**本人専用・非商用・研究ブランチのみ。公開向け正式指数の取得元は変更しない。**

## 1. NYU Stern 1928〜2025：新規の実取得

原典：https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html
NYU Stern / A. Damodaran教授が複数の元データから整備した研究用年次収益表。Webの旧タイトルは1928-2024と表記されているが、2026年1月5日更新の本文は2025年末まで98年分を収録する。

7系列：米国大型株・小型株・短期米国債券（3か月T-Bill）・10年米国国債・Baa社債・不動産・金。全686件の年次観測を取得。NYUの学術研究系列はS&P DJIの公式配信TR、Bloombergの正式債券指数とは**別物**。1957年以前の株式系列は歴史的な再構成を含む。年次を月次に補間して史実と偽らない。

- 元HTML SHA256：127c772f0fea8763391dbf2c1c7d3ecd3a07ca2b23f81ab47af58b529e2b5647
- 私的正規化CSV SHA256：582c2ccdc6abe75f3e118cd61628f4d428fed9acbd1ec275c811699fe1c5b440
- 年次開始窓：10年89件、20年79件、30年69件。
- 原表取得と検証：scripts/research-acquire-damodaran-annual.cjs
- 公式NYUページ取得・暗号保管の成功Run：https://github.com/k-ait0/k-aito-com/actions/runs/43149434554
- 暗号化アーティファクトID：13913241236（保持期間7日）。AES-256-GCM＋既存ユーザー管理RSA公開鍵。秘密鍵、平文原値はGitHubへ配置せず。
- この対話の非公開環境で実際に復号・認証・CSVのSHA照合が完了。

## 2. 54年分のJPY実質年次分析

研究用のFed Board H.10 DDP 1971年候補のUSDJPY月内最終営業日値、e-Stat日本CPI全国総合の12月値に接続。取得元Fed DDPのADRは承認前の**研究候補のまま**。

年次JPY総収益倍率 = (1 + NYU米ドル年次収益率) × (当年12月のJPY/USD ÷ 前年12月のJPY/USD)。
JPY実質総収益倍率 = 上式 × (前年12月の日本CPI ÷ 当年12月の日本CPI)。
60/40は毎暦年初の株式60%、10年米国国債40%への固定配分で、年次で再調整する計算。取引費用・税を含まない。

1970年12月のFed研究候補FXは存在しないため1971年の年次JPYリターンは算出せず、1972〜2025年54年分を採用。30年の完全開始年は1972〜1996年、25件。

| 30年の年率実質CAGR | 25件の中央値 | 最悪の30年CAGR |
|---|---:|---:|
| 米国大型株研究系列100% | 7.895% | 3.725% |
| 米10年国債研究系列100% | 4.477% | 1.336% |
| 年次60/40 | 7.022% | 3.292% |

これらは重複する歴史的ウィンドウの記述統計であり、将来の利益保証・成功確率・個別ETFのTRではない。米ドル年次データから月次の取り崩し履歴を作らない。

再現用Node：scripts/analytics-annual-personal-jpy.cjs（オフライン・SHA固定・合成データで回帰検証）。私的な独立Python実計算：analytics_personal_annual_research_v0_1.py。平文CSV・結果は本番や公開GitHubに配置しない。

## 3. JPX / J-Quants 配当込みTOPIX

配信対象指数の公式一覧：https://jpx-jquants.com/ja/spec/idx-bars-daily/indexcodes
API：https://jpx-jquants.com/ja/spec/idx-bars-daily
プラン：https://jpx-jquants.com/ja

- コード6000 = 配当込みTOPIX終値（2010年1月4日以降）。
- コード0000 = TOPIX価格指数（配当込みではない）。
- コード6095 = 税引後配当込みTOPIX（2015年10月26日以降）。6000とは混合不可。
- 指数のAPI取得はStandard以上。掲載月額はStandard税込3300円で過去10年、Premium税込16500円で過去20年。ただし6000の実在する履歴は2010年以降なので30年データは得られない。
- 取得用エンドポイント：GET https://api.jquants.com/v2/indices/bars/daily 、本人のAPIキーを x-api-key ヘッダーに指定し、code=6000で本人の契約範囲のデータを正規取得。
- 本人の認証・契約なしにデータの自動取得はしない。**配当込みTOPIX実数値は現段階で未取得**。
- scripts/import-analytics-jquants-topix-tr-personal.cjs を実装。本人が適法に入手したV2 JSONを入力し、コード6000の終値から月末の最終営業日の値へ変換する。重複・欠損月・誤コード・非正値・最終月未確定を拒否する。
- 正式な本人用CSVへ変換：JPX_TOPIX_GROSS_TR_6000、JPY、INDEX_TOTAL_RETURN、OBSERVED、source=JPX。
- 合成ファイルを使った回帰はGitHub Actionsで検証。実ユーザーのJ-Quants API実データを読み込んだテストではない。

本人取得済みJSONの例：

    node scripts/import-analytics-jquants-topix-tr-personal.cjs --import /ABS/PRIVATE/exported_jquants_6000.json 2026-09 /ABS/PRIVATE/topix_private_202609 --personal-use

## 4. 日本債券の候補と未解決事項

NOMURA-BPI総合の月次公式ページ：https://www.nfrc.co.jp/SMI/QR/index/BPI/NOMURA_BPI_M_J.html

公式表示に累積投資収益指数・前月末からのTOTAL/CAPITAL/INCOME収益率がある。ただしこれは直近月の単一スナップショットであり、数十年の過去月次時系列が正式取得できたことを意味しない。連続した長期時系列は未取得である。

## 5. 次の開発判断

1. 私的な年次研究比較は実データで進められる。毎月の引出しを扱うDWZ月次モデルに、年次データを月次として流用しない。
2. 本人向けTOPIX配当込みコード6000は、有効なAPIキーとStandard以上の契約が得られた際に正規に取得して取込検証する。ない間は合成テストで開発を進める。
3. 日本債券・正式米国指数の権利・実際の取得は保留中。正式指数の取得元ロックをNYU学術研究系列へすり替えない。
4. 所有者の非商用個人利用を前提に、公開時の権利注意事項だけ保持する。main、FINOWA、公開Analytics、DWZ PRは変更しない。
