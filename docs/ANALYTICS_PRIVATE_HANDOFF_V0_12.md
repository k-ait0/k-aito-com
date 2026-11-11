# K. Aito Analytics｜v0.12 復元済み原本→正本6ファイル→ローリング実測QA

**2026-11-12 JST / RESEARCH_ONLY_HOLD / 公開・商用利用・実資産運用判断は未承認。**

## 目的と今回の実績

v0.11では保全した5件の暗号化ZIPを秘密鍵所有環境で復元する処理を実装した。v0.12は、その**復号済み証拠群**からv0.10が要求する正本6ファイルへの受渡工程を追加する。データの取得・外部送信・新しいライセンス付与・Fed DDP 1971候補の自動採用は一切しない。

実装・監査した機能：

1. e-Stat原本ファイルの検出条件を取得担当の正式名称（`CPI_JP_NATIONAL_2025_LINKED_HEADLINE__...` / `CPI_JP_NATIONAL_2025_LINKED_EX_RENT__...`）に修正。v0.11は異なるプレフィックスのため正しい復元原本を不足扱いする不整合があった。
2. Fed H.10の取得原本HTMLと当時生成された `usdjpy_monthly.csv` を**独立照合**し、固定チャネルの完全観測月だけから共通CSVを再構成。最後の暫定月は除く。月末最終観測と取得側CSVの値が異なれば拒否する。
3. 共通CSVの完全なバイトSHA-256がデータ担当の正本台帳に登録された `da0f6244...` と一致する場合に限り、再構成品を正本として採用する。**未照合の自動生成値は受入不可。** 一致しない場合は、取得担当が保管する完全一致の正規化CSVを `--fed-canonical` で供給する（そちらもSHA固定照合）。
4. Shiller旧版研究原本を別途受け取り、固定SHA（`0cdb8a04...`）を検査。**暗号化Artifact 5件にはShiller原本は含まれない。** 資料から相場値を再生成・補完しない。
5. 非公開で作成した `manifest.json` による取得経路・期間・ソースの申告を要求。値の再計算はv0.10の独立照合で証明するが、発行元からの取得事実・利用許諾は別ゲートであり、自己申告のみで発行元認証とはしない。
6. 6件すべてのPINと独立原本照合を通過するまで、最終受渡ディレクトリを**作成しない**。成功時は0700ディレクトリ・0600ファイル、上書き禁止で原本・manifest・QAを原子的に配置する。任意の研究用プランがあればv0.10を使ったローリングQAも同時実行。

## 利用方法（秘密鍵を所有するPC内のみ）

GitHub研究ブランチをチェックアウトしたローカル環境でNode.js 22を使用する。**すべての平文入力・出力パスはGitワークツリーの外**とし、秘密鍵をChatGPT・GitHub・Xserverへ送らない。

```bash
# 1. v0.11で暗号化ZIPの検証→本人の秘密鍵で復号（新たな復号鍵は生成しない）
node scripts/restore-analytics-private-evidence.cjs \
  --artifact-dir /ABS/PRIVATE/encrypted \
  --private-key /ABS/PRIVATE/keys/original_analytics_rsa_private.pem \
  --out-dir /ABS/PRIVATE/recovered

# 2. 受渡の前段階：不足原本・Fed再構成SHA不一致を表示するのみ（未完成なら終了コード2）
node scripts/prepare-analytics-private-handoff-v12.cjs \
  --restore-dir /ABS/PRIVATE/recovered/analytics_private_evidence_v11 \
  --inspect-only

# 3. Shiller原本・manifest・正本source registryを別途準備した後に実行
node scripts/prepare-analytics-private-handoff-v12.cjs \
  --restore-dir /ABS/PRIVATE/recovered/analytics_private_evidence_v11 \
  --shiller /ABS/PRIVATE/shiller_1980-01_2023-06_RESEARCH_ONLY.csv \
  --manifest /ABS/PRIVATE/manifest.json \
  --registry /ABS/PRIVATE/source_registry.v0.2.json \
  --out-dir /ABS/PRIVATE/handoff \
  --plan /ABS/PRIVATE/research_plan.json
```

`--plan` は任意。原本をそろえても計算パラメータがない場合はローリングの投資成果指標を出さない。

`--fed-canonical /ABS/PRIVATE/exact-frozen-fx-canonical.csv` は、再構成候補と固定SHAが一致しない場合だけ必要。**固定SHAや元系列のロックを変更して通すことは禁止。** 受け入れたCSVについてもv0.10が原本との値の一致を全件再検査する。

入力 `manifest.json` はv0.8の `usd` / `fx` / `cpi` 契約に従う。USDの `method=SHILLER_PRICE_PLUS_DIVIDEND_APPROX`、FXの `source_channel=H10_ACTIVE_JAPAN_HISTORY`、CPIの `basket=HEADLINE_NSA`、源泉生原本SHA、取得日時、正規URL、private_research_authorizedなどを検証する。取得日時・原本・出典の権利許諾は**推測で埋めない**。

### 非公開のプラン例（あくまでパラメータ例）

```json
{
  "portfolio": {
    "initial_holdings_yen": {"US_EQUITY": 10000000},
    "target_weights": {"US_EQUITY": 1},
    "rebalance": {"mode": "NONE"}
  },
  "cashflow_plan": {
    "monthly_contribution_yen": 0,
    "monthly_withdrawal_yen": 120000,
    "annual_expense_inflation": 0.02,
    "relative_pension_schedule": [{"id":"pension","start_offset_months":60,"monthly_yen":80000}],
    "relative_one_time_events": [{"id":"repair","offset_months":30,"kind":"EXPENSE","amount_yen":500000}]
  },
  "horizons_months": [120, 240, 360]
}
```

この条件は**研究用サンプル**であり、利用者の将来の受給額や生活費を推定したものではない。Shillerは公式S&P500 TRではないため、このファイルのリターンを公式指数や一般公開権利取得済みデータとして扱わない。

### 結果

`/ABS/PRIVATE/handoff/analytics_private_handoff_v12/` にv0.10規約の6ファイル、`manifest.json`、`PRIVATE_HANDOFF_RECEIPT.json`、`ANALYTICS_PRIVATE_JPY_QA_V10.json` が保存される。ユーザー入力の元ファイルや暗号化Artifactは上書きしない。結果は非公開であり、一般公開サイト・オンラインUIには接続しない。

## 最新QAの区別

| 検査 | 結果 |
|---|---|
| Node.js 22.16.0 ユニット・回帰テスト | **369/369 PASS（旧350＋新19）** |
| 保全済み暗号化ZIP実ファイルのSHA整合性 | **5/5 PASS（平文復号なし）** |
| Fed→共通CSV・e-Stat正式プレフィックス回帰 | **模擬原本によるPASS** |
| 本物のRSA秘密鍵・復号平文による6ファイル受入 | **未実施** |
| 10年／20年の実相場ローリング結果 | **未実施** |
| 30年の現行固定チャネル・Shiller共通期間 | **0件（正本期間に基づく理論上限）** |
| データ権利・本番リリース | **未承認** |

## 残る受入ゲート

1. **2026-11-18のGitHub Actions Artifact失効前**に、既存の5件の暗号化ZIPとユーザー管理下のRSA秘密鍵を**別々に安全に恒久保全**する。保全済みの会話内ファイルはユーザーの永続ストレージ管理が確認されたことを意味しない。
2. 秘密鍵をローカルで使用し、v0.11の復号処理を実施する。暗号化データはすでに検証済みだが、秘密鍵をこの環境で扱ったわけではない。
3. 旧Shiller原本の正本バイトを見つける。所有者の承諾のない市場データの収集・再配布をしない。
4. Fed月次共通CSVの再構成バイトが正本SHAと一致するか確認し、違う場合は承認済みの正規化ファイルの入手または取得担当との再現性の差分監査が必要。
5. 原本と正規化ファイルのSHA、値、年月、推計・欠損、月末確定状態を実証した後にのみ、10年／20年の**過去の結果**を算出する。これは将来の成功確率ではない。

**変更禁止：** `main`、本番サイト、DWZ PR #70、市場データ取得担当の正本・Fed DDP未承認ADR。確認用ページ開発はユーザーの決定どおり保留。
