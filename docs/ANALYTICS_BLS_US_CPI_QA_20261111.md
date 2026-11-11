# K. Aito Analytics｜BLS CPI-U 長期月次データ取得・実測QA（2026-11-11）

**状態：RAW_ACQUIRED_PRIVATE / DATA_QA_PASSED_WITH_OFFICIAL_GAP / PRODUCTION_NOT_APPROVED**

## 1. 目的・ソースロック

- 原典：U.S. Bureau of Labor Statistics 公式API v1 `https://api.bls.gov/publicAPI/v1/timeseries/data/`
- シリーズ：`CUUR0000SA0`（CPI-U、All Items、U.S. City Average、非季節調整）
- 基準：1982–84 = 100。月次指数水準であり、通貨建て投資資産の収益率やTRではない。
- 対象：1966-01〜2026-10。観測済み月だけ `origin=OBSERVED`。推計・代理・前月値継承は使用しない。
- 正本：`research/analytics/source_registry.v0.2.json`。出典変更なし。Analytics本体/FINOWAのコードや本番環境は変更しない。

## 2. 本当に取得したデータ

| 官方BLS取得バッチ | 観測件数 | 原本 SHA-256 |
|---|---:|---|
| 1966–1975 | 120 | `023da5155773116b415ba326d17a445b79e9da36ad106e19d40c7d737b640d27` |
| 1976–1985 | 120 | `07e2be0da7125b38820ee3a0f9e9040beae897f986f0971c4cc30b7a939aa320` |
| 1986–1995 | 120 | `d8944755a788d46129ff8c247a484256464a3f8fbec537c87eecc4e0330b44a1` |
| 1996–2005 | 120 | `4fb8db6974972fa61eaba14071fe27f59be06d8358a444dff086814c2fe684c7` |
| 2006–2015 | 120 | `aebd80d6366fc3bfb596c59db942731feb35ad0f443e56e3c28532ed9f9bf5c0` |
| 2016–2025 | 119 | `900122a20b8ff95e9f0d448d62b36c290462b7f5e53655d97c87930eba6a3b20` |
| 2026–2026 | 10 | `62d8d50b95fe287e6f2cd61114b38246f7bbbff33ae58ebf4a25f2fadf36ec90` |
| **合計** | **729** | 各レスポンスごとに原本ハッシュを別管理 |

GitHub Actions 証跡：[Run #42947688134](https://github.com/k-ait0/k-aito-com/actions/runs/42947688134) は **SUCCESS**。

公開リポジトリには原本・正規化した指数値を保存していない。原本とCSVはジョブの非公開作業ディレクトリに保存し、AES-256-GCMで暗号化してRSA-OAEP-SHA256で鍵を保護した暗号文だけをGitHub Actions Artifactに保存した。Artifact ID `13824035258`、有効期限 `2026-11-18T02:41:26Z`。恒久的な保管先ではない。

## 3. 品質検査・正規化結果

| 検査項目 | 結果 |
|---|---|
| 1966-01〜2026-10の暦月数 | 730 |
| 数値の存在する実測月 | **729** |
| 公式原表の欠損（非公表） | **2025-10（1か月）** |
| 重複月 | 0 |
| 未説明の欠損 | 0 |
| 20%を超える月次指数変化（レビュー閾値） | 0 |
| 実測連続ブロック | **717か月**（1966-01〜2025-09）、**12か月**（2025-11〜2026-10） |
| 30年連続実測CPIが必要な開始月数 | **357**（価格水準360か月ではなく**361か月**を要する360月次変化の検証） |
| 非季節調整 | NSA |
| 基準 | 1982–84=100 |
| 原系列の通貨 | 物価指数のため該当なし |
| 投資配当・トータルリターン | 該当なし |

**公式欠損の理由：** 2025年10月のCPI調査は米国政府機関の予算失効により中止され、BLSの全項目指数の観測値は公表されていない。取得側は BLSのマーカー `-` を**データ欠損**として管理し、値を補間しない。
参照：BLSの公式公表カレンダー、政府機関停止に関する公表説明、および当該原本。

正規化CSVの列：
`month,series_id,cpi_index,unit,frequency,seasonal_adjustment,origin,footnote_codes,raw_response_sha256`

正規化CSV SHA-256：
`899c385488b982402bba73b2f5308fe6f37ab330a436fa2cd4d7016c38b81edd`

7原本バッチ、manifest、正規化CSVをまとめた私的原本アーカイブ SHA-256：
`2d9052638aaead8c84883d40ab8b15b4d2abedf44e163cfca1ba8d8f9a5ac5f3`

暗号化Artifact ZIP SHA-256：
`eddb9243bd9a205d566cae0b99a2c7b3c2187bf5f9acc3915480ad50ccb291b4`

### Analytics側への共通受渡CSV（研究専用）

[共通月次観測データ契約](ANALYTICS_CANONICAL_MONTHLY_OBSERVATION_V0_1.md) に準拠して、729実測行の非公開CSVを生成・独立照合した。BLS専用列 `cpi_index` を共通列 `value` に写像し、原本の小数精度・観測月・原本バッチSHA・非季節調整を保持する。CPIは `series_kind=CPI_LEVEL`、`currency=NOT_APPLICABLE`、`origin=OBSERVED` とし、欠損の2025-10は出力しない。

- 共通受渡CSV SHA-256：`6eaf4b25a8889ad8596c9c5222b61438776c33636ec45e0deb9491161d90870a`
- 実データは非公開ファイルとして引き渡し、GitHubにはスキーマとSHAのみを登録
- Analytics計算エンジンとの実接続・リリース判定は別工程

## 4. ライセンス審査・配布区分

| 用途 | 状態 |
|---|---|
| 内部調査・加工 | BLSの一般パブリックドメイン方針を確認。出典と取得日を保持 |
| 商用計算処理 | BLSの一般利用条件では可能と考えられる。サービス固有の表示・利用条件ゲートは残す |
| 一般サイトへの指数表示 | **プロジェクト側の公開承認なし** |
| 加工分析の結果配信 | **プロジェクト側の公開承認なし** |
| 生データCSVダウンロード再配布 | **プロジェクト側の公開承認なし** |
| Analytics / FINOWA本番反映 | **未承認・未実施** |

BLS一般権利情報： https://www.bls.gov/opub/copyright-information.htm  
API規約： https://www.bls.gov/developers/termsOfService.htm

正式公開する際は、シリーズの出典・取得日時・非季節調整・基準・欠損方針・ユーザー側で行った二次加工を明示し、BLSが解析結果を保証・推奨するという表示をしない。

## 5. 再現手順・成果物保管

```bash
# research branch で実行。公開リポジトリ内へ原本を保存しない。
node scripts/check-analytics-source-registry.cjs
node scripts/acquire-analytics-approved-source.cjs --selftest
node scripts/test-analytics-history-coverage.cjs
node scripts/test-analytics-bls-missing-gap.cjs

# GitHub Actions研究用の1回実行は .github/workflows/analytics-bls-private-acquisition.yml
# 手動再取得する際は外部の非公開保存先を指定：
export ANALYTICS_PRIVATE_DATA_DIR="/ABSOLUTE/OUTSIDE/GIT/private-market-data"
node scripts/acquire-analytics-approved-source.cjs BLS_CPI_US 1966 1975
# ...1976-1985、1986-1995、1996-2005、2006-2015、2016-2025、2026-2026
node scripts/merge-analytics-bls-batches.cjs "$ANALYTICS_PRIVATE_DATA_DIR"
```

研究用の暗号化artifactは**2026-11-18に失効**する。暗号化データと復号用秘密鍵を、安全な非公開ストレージにバックアップする。秘密鍵をGitHub／サイトに置かない。最終的な継続保管と公開権限判断は別工程。

## 6. 取得台帳と次の対象

最新実績：`research/analytics/acquisition_status.v0.1.json`。
残作業：日本CPI（e-Stat）、Fed H.10ドル円の1971年以降（ADR-0001 DRAFTのまま）、World Bank Pink Sheet月次、Shillerの1966年以前を含む拡張研究、商用ライセンスが必要な各指数TR。

旧Shiller522か月・Fed H.10限定28日は今回のBLS新規データとは別に維持する。12資産クラス、補助8系列の一般サイト公開承認数は引き続き**0**。
