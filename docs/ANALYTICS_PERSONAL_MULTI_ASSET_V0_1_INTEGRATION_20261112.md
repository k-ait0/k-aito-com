# K. Aito Analytics｜1〜12資産の本人専用Core・ローカル画面統合 v0.1
2026-11-12 / RESEARCH_ONLY_HOLD / PERSONAL_SINGLE_USER_LOCAL_RESEARCH / NOT_APPROVED_FOR_PUBLICATION

## 実装成果

従来のPersonal Lab v0.5は残したまま、別のAnalytics Portfolio Core v0.7研究ブランチから以下4つの純粋計算ファイルを**内容を変更せず**歴史データ研究枝に取り込んだ。

- lib/analytics/cashflow-core.cjs
- lib/analytics/portfolio-core.cjs
- lib/analytics/rolling-portfolio-lifecycle.cjs
- lib/analytics/rolling-portfolio-compare.cjs

その上で本人専用の統合アダプター lib/analytics/personal-multiasset-bridge.cjs を新設し、資産1〜12、給与・年金の複数期間、臨時INCOME/EXPENSE最大500件、月次積立、月初生活費、年率の物価仮定または実測CPI、定期／乖離率リバランス、全開始月のローリング比較を接続。市場収益率は円建て・月次の整数円ポートフォリオ計算に入力する。個別資産の円保有額と総額の資金保存則を検証し、欠損月は補間しない。

## UI・配布

- UIテンプレート：research/analytics/personal-lab/multiasset.template.html
- ローカルUIイベント・本人保有CSV読込・計算・CSV保存：research/analytics/personal-lab/multiasset.client.js
- 一体型HTMLの生成：scripts/build-analytics-personal-multiasset-ui.cjs
- GitHub ActionsでCoreコードとクライアントを**単一HTML**にバンドルし、7日間保持のArtifactsへ出力する。外部JS・CSS・CDN・APIへの通信機能を含まない。CSP default-src/connect-src/object-src noneを検査する。
- 個別の1〜12資産配分、月額費用・積立、給与と年金の複数行、臨時イベントの複数行、10/20/30年、リバランスなし・定期・乖離率に対応。
- 開発者が持つ市場値をHTMLへ埋め込まず、純合成デモを内蔵。本人の保有する**JPY建て月次INDEX_TOTAL_RETURN**の正規化CSVをローカルFile APIで複数（最大12）読み込み可能。必要な場合、CPIも別のローカルCSVで読み込む。
- CSVの最低13か月・出典登録・通貨JPY・正の指数水準・連続月・系列ID・原本SHA形式・origin OBSERVEDを検査。各系列の同一性はユーザー申告であり実発行元の署名検証ではない。USD建ての指数はこの新UIでは**読み込まない**。使用するなら別途QA済みの円換算が必要。
- 現金0%利回りモデルはTR指数と区別し、金スポット、価格指数、年次学術研究系列を投資可能月次TRとして誤って利用しない。
- 結果CSVは各月の資産別期末残高と収支区分、出典元・系列ID、not_for_publicationを記録。生の指数原値は含まない。

## 金額・時点の契約

新UIは元Analytics Core v0.7の「**期首入金 → 期首予定支出 → 各資産へ月次収益率を適用し整数円に丸める → 期末リバランス**」を使用。

旧Personal Lab v0.5は「月初／月末の予定出金を選択可能、小数円を内部保持、最終月の残高はN+1境界点」であり、新Coreの月末出金・円未満端数の動きと一致を保証しない。両者を強制的に統合して過去の結果を静かに書き換えてはいない。

- 金額は整数円（最大1兆円）で入力。
- ターゲットウェイトの入力は合計100%、資産別初期保有／入金は最大剰余方式で1円単位に配分。
- 個別資産の収益はMath.roundでそれぞれ丸める。
- 金融モデルは税引前・手数料なし、給与・年金はユーザーが資産流入額を手入力する方式。一般の給与額を自動的に可処分所得へ換算しない。
- 現在のモデルには二重計上防止の自動分類がない。「毎月積立」と給与・年金入金は**互いに別の外部入金**。本人が二重計上に注意する必要がある。
- 税、NISA、健康保険料、売買手数料、取引スプレッド、信託報酬、実際の配当課税、年金の受給日、現金滞留時の利息、ヘッジ費用は未対応。計算済みと表示しない。

## テスト

- scripts/test-analytics-personal-multiasset-bridge.cjs：資産数1/2/3/5/8/12の6構成、給与／年金／複数イベント、30年等のスケジュールとCPI、60か月ローリング、欠損・不正入力拒否。旧v0.5の静的2資産モデルと、同じ**月初・整数円に整合する条件**で一致。丸め・月末時点のモデル相違は意図的な不一致として区別。
- scripts/test-analytics-personal-multiasset-dom.cjs：実際の単一HTMLの組み立てとNode VM DOM操作。1/3/12資産、私的CSVの連続月・通貨・kind・出典拒否、負のイベント。
- scripts/build-analytics-personal-multiasset-ui.cjs --build/--verify：ソース変更時にバイト再現可能。外部通信コード・外部ファイル読込タグ・CSPゲートに違反すると失敗。
- 2026-11-12 GitHub Actions合格：https://github.com/k-ait0/k-aito-com/actions/runs/43238132226
- 同じActionsの生成HTML（SHA256 5653707c5e499ecbac065abbdf8160fb341431b8ce56e6f548dad6e1ae15561d）をChromium headlessで実行し、純合成デモ12資産の10年結果を実CSVに保存。**120か月・資産列12個、開始月の窓481件**。
- 合成の給与（12か月10万円＋12か月5万円）、年金（12か月5万円）、修繕50万円、臨時入金20万円は月次CSVで支払時点と合計を照合。
- 合成のJPXおよびNOMURA_BPIのJPY建て月次TR形式2ファイル＋CPIをブラウザーで読み込み、現金0%モデルとの3資産・120か月の独立UI動作を確認。これは**形式検証用の架空の相場**であり正式TOPIX/NOMURA-BPI原本取得とは全く異なる。
- 負の臨時支出を入力するとCSV保存を停止。JS例外0、外部HTTP/HTTPS要求0、390pxモバイル水平はみ出し0。
- file://直接遷移は検証環境の制約のため行わず、Playwright set_contentで同一HTMLのChromium実行を検査。iPad Safari実機での動作は未検証。

## 未完了と次の開発優先度

1. **正式な1円台帳契約とDWZの3エンジン統合**：今回の明示比較・一部一致は完了。ただし月末／月初・課税・費用を含む全面一致は未完了。
2. **本人の適法な長期TR実データ**：TOPIX gross TRコード6000、NOMURA-BPI、米国株式／債券の正式月次TRはまだ不足。研究用のNYU年次98年データを月次パスに補間しない。
3. **費用・税・NISAのモデル**：金額・売買時点・非課税区分を定義し、新Coreを部分的に拡張する前に独立金融監査用テストを設計する。現行はGross modelのみ。
4. **長期メンテとWeb QA**：生成HTMLのバイト再現性、実機Safari/iPad、直接file://、実際に権利を確認した個人TRファイルの取り込みを検証する。
5. **複数シナリオ比較**：v0.7のcompare Coreを実UIへ統合し、市場パスを固定した条件差の比較に限定する。まだ専用操作画面は未実装。

**禁止事項**：GitHub main、公開Analytics、FINOWA、DWZ PR #70、他研究ブランチを変更しない。非公開原本・取得鍵・ライセンス未承認の指数水準をGitHubへpushしない。公開・商用利用は別の権利承認が必要。
