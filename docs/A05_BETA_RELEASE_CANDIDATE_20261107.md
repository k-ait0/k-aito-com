# A05 開発版・自己理解レポート 先行リリース候補（2026-11-07）

## 対象と公開範囲

- 公開候補は `main` から分岐した `release/a05-beta-report-20261107` のみ。30問・5軸・16タイプの**非標準化**の自己理解ツールと10ページのWeb/A4レポート。
- 既存の大規模開発PR #61（208ファイル）や実験・研究用の別画面、PR #71、PR #72を一括マージしない。
- 初回は **`noindex,nofollow` を維持した限定ベータ**。サイト内の恒久的な導線やSEO公開は別の明示承認が必要。
- 「診断」表記は開発上の暫定名称。性格・能力・適職・心理状態や科学的妥当性を主張しない。
- 金銭と時間の比較（特にE05の月3万円と週3時間）は**校正されていない**。第5軸の数値は正式な心理尺度ではない。
- 回答の外部送信・アカウント連携なし。保存は端末内IndexedDBへのユーザー同意制。PDF化は利用者の印刷操作でのみ実行する。共有用テキストは個別回答を含まない。
- 既存回答スナップショットは再採点・自動移行しない。D-12/D-19/P0データへの自動復元・削除を行わない。

## リリース候補構成

- `projects/kidp/life-design-lab/a05/`: 実行に必要な HTML, CSS, JS 13ファイルのみ。
- `scripts/test-a05-engine.mjs`: 既存採点QA。
- `scripts/test-a05-storage.mjs`: IndexedDBの模擬契約QA。
- `scripts/test-a05-report.mjs`: 16タイプ・判定保留などのレポートQA。
- `scripts/test-a05-release-contract.mjs`: **実採点→スナップショット→レポート32組**、判定保留とプライバシー境界。
- `scripts/qa_a05_browser.cjs`: 実ブラウザの30問回答完了、履歴/削除、10ページレポート閲覧・クリック起点PDF生成をE2Eで確認。

## QA実績と未解消

- **実行済み**：GitHub上の本番候補と同じ質問・採点・タイプ・レポートのGit BlobからV8隔離実行で32/32の結果一致、判定保留1件PASS。レンダリングは1結果につき10セクション/10目次リンク、生回答と履歴IDの出力なし。
- **過去の参考実績**：PR #61で既存30問・履歴等に対するChromium QA合格、PR #72でT11のWeb表示/A4 10ページ印刷合格。これは**本リリース候補全体のE2E合格を意味しない**。
- **未実行**：新リリース候補からのNode全契約テスト、30問→レポート→PDFのブラウザE2E（新テストは追加済み、構文確認のみ）、HTTPS実URL応答と配信サーバーHTTPヘッダー。iOS Safari/VoiceOverは未検証だが、**限定ベータに限り既知の未確認事項として明示し、実機テストを正式一般公開前のゲートに分離**する。ブラウザに重大なアクセシビリティ障害が見つかった場合は例外なく公開停止。
- セキュリティ：公開前にHTTPSで `Content-Type`、`X-Content-Type-Options`、CSP/フレーム制限、キャッシュ、個人データの非送信を実測する。HTML meta単体はCSPのHTTPヘッダー代わりにならない。
- 編集：未検証の価値観分類である旨の表示を再確認。診断の妥当性を保証したような広告・誘導文は禁止。

## 最短の公開手順

1. この分離PRの差分（必要な実行ファイル＋QAのみ）をレビューする。
2. Nodeテスト一式をローカル実行する：
   `node --test scripts/test-a05-engine.mjs scripts/test-a05-storage.mjs scripts/test-a05-report.mjs scripts/test-a05-release-contract.mjs`
3. Playwright＋Chromeのある環境でブラウザE2Eを実行する：
   `node scripts/qa_a05_browser.cjs`（実行環境に応じて `NODE_PATH` を設定）。
4. 承認済みステージングURLでHTML/CSS/ES Modulesを読み込み、上記HTTPヘッダーとスマホでの基本操作を確認する。
5. この限定ベータの範囲・対象者・公開日時の**明示承認**があった場合のみ、対象PRのマージと配信を行う。
6. 現行の主画面への公開導線追加・noindex解除・収集を伴う研究開始・正式版の広告告知は別判定。

**現時点の公開判定**：準備中／リリース承認前（新E2Eと配信環境が未確認）。GitHub Actionsは手動のみ。勝手にマージ・デプロイ・自動ワークフロー起動を行わない。

## 早期公開の判断を簡素化するゲート

- **限定ベータの必須条件**：Node全契約テスト合格、Chromeの実HTTP E2E合格、HTTPSでのMIME・HTTPヘッダーと外部通信監査合格、公開文言と限定ベータ対象・範囲のユーザー承認。
- **正式一般公開前の追加条件**：Safari/VoiceOver実機QA、質問・採点・説明の研究的妥当性評価、検索公開・サイト導線・データ収集施策の個別承認。
- `noindex` はアクセス制限ではない。URLを知る第三者は閲覧できるため、限定ベータであっても回答の守秘や匿名性を保証する文言は使わない。
- **完了済みの静的検査**：リリース候補13実行ファイルのESM import解決、JS構文、HTMLリンク、noindex、favicon、レポート導線、クリック起点印刷、レポート内の外部通信API不在を確認。学術的妥当性・配信時動作の証明ではない。

## 手動GitHub Actionsの実行方法（自動起動なし）

- GitHubの **Actions → KIDP Wave A Browser QA → Run workflow** から、ブランチ `release/a05-beta-report-20261107` を指定して実行する。
- 既存のKIDP P0 QAを維持したまま、A05 Node採点・保存契約・レポート・32派生契約テストと、A05のChromium 30問→結果→レポート→ブラウザPDF検証を追加。
- **本記録を書いた時点ではワークフローを実行していない。** 実行結果は最新のGitHub Actions run ID、テスト件数、失敗ケースで判断し、成功と推測しない。
- ユーザーの計算資源の承認方針に従い、workflow_dispatch以外のトリガーは追加しない。

## D-111 追加QAと未実行ゲート（2026-11-07）

- 実際のGitHub登録原本をV8で実行した契約テスト4件はすべてPASS（32パターン＋1500件合成回答＋判定保留＋noindex/クリック印刷等）。この結果は**Node実行の代用証明ではない**。
- 実際の`app.mjs`のクリックハンドラーを模擬DOM環境で16タイプ分実行。16/16合格。印刷クリック、戻り操作、無結果時の印刷禁止も確認済み。
- `scripts/test-a05-ui-report-contract.mjs`を追加し、Node22用の模擬DOMテスト4件を手動GitHub ActionsのNodeコマンドへ追加した。未実行。
- Chromiumブラウザ受入テストは、30問→結果→レポート→PDF生成に加えて**PDF実ページ数が10であること**を要求するよう強化した。未実行。
- 連携先GitHub APIでは、このPR #73ブランチのActions runは0件。接続ツールに`workflow_dispatch`起動操作がなく、GitHub Actionsを直接実行できない。
- 実URLのHTTPS/CSP/配信QAおよびマージ・本番公開は未実施。マージ承認前の状態を維持する。


## D-112 実GitHub Actions QAの完了（2026-11-07）

- **Run [#42342954555](https://github.com/k-ait0/k-aito-com/actions/runs/42342954555) / Success**、イベント`push`、検証ブランチ`release/a05-beta-report-20261107`、対象コミット`4e8b13e75f1eb603d56377b74f9bcb15c6858a05`。
- GitHubホスト上の**Node.js 22 全103テスト：103 PASS / 0 FAIL**。
- 既存KIDP Chromium QA 成功、A05の**Chromium 28チェック全通過**。30問回答→T16結果→10ページレポート→A4 PDF生成/10ページ検査、戻り操作、保存同意・履歴・削除・エラー処理・画面幅・外部通信なし等の各チェックを含む。
- **自動起動は一度だけ**：ユーザーの早期リリース希望と承認に基づき、この隔離ブランチに限り`docs/A05_QA_TRIGGER_ONCE_20261107.txt`の変更だけを対象とした一時`push`を設置し、単一run開始を確認後、`workflow_dispatch`のみへ復帰。仮設markerも削除。workflow YAMLのGit Blob SHAはもとの`0fca58fbf1c12ce9d782fbd3d58dbc23d7f2d0c8`へ復帰。リリースブランチの手動専用ポリシーは回復。
- **対象範囲の注意**：この成功はリポジトリの静的サーバー／Chrome／Node22での動作確認。**実際の配信先HTTPS・CSP・キャッシュ・iOS Safari/VoiceOver・心理尺度の妥当性・本番公開の成功を証明しない**。
- 対応するアプリ/テストの原本は検証時のコミットから変更していない。検証後のブランチ更新は一時トリガーの復帰、マーカーファイル削除および検証結果の記録のみ。
- 初回限定ベータの残ゲートは**承認済みステージング実URLのHTTPS応答・HTTPヘッダー・スクリプト/MIME・外部通信の実測、公開対象・文言の責任者承認**。Draft/未マージ・未公開を維持する。


## D-113 限定ベータ公開準備と公開前QA（2026-11-07）

- **ユーザーから限定ベータ公開を進める旨の承認**が得られたため、PR #73 を公開対象とする。一般公開導線・検索インデックス登録・検証済みの心理診断という主張は含まない。
- **GitHub Actions [#42382361854](https://github.com/k-ait0/k-aito-com/actions/runs/42382361854) SUCCESS**：Node 104/104 PASS、Chrome A05 28/28 PASS、既存KIDP QA PASS。CSP meta・対象ディレクトリ限定の .htaccess を含む候補を検証。
- XServer StaticへGitHub runnerからHTTPSでGETし、`https://k-aito.com/`はHTTP 200、公開前の`/projects/kidp/life-design-lab/a05/`はHTTP 404であることを確認。
- A05専用`.htaccess`：`.mjs`を`text/javascript`として配信し、noindex/CSP/nosniff/iframe禁止等を指定。HTML側にもCSP metaのフォールバックを用意。**実配信でこれらが反映されることは公開後に別途確認する。**
- `scripts/qa-a05-public-origin-readiness.mjs`：実URLで13ファイルのSHA-256・ES module MIME・主要HTTPヘッダーを検証する**読み取り専用**の公開後ゲート。
- `scripts/qa_a05_browser.cjs`：`A05_LIVE_ORIGIN=https://k-aito.com`で実配信先のChromium 30問→PDFまでのE2Eを実行可能。実ブラウザの回答は一時的な独立ブラウザ環境の中だけで扱い、サーバーへ送信しない。
- 追加の一時`push`トリガーは**単一実行後に削除**し、マーカーファイルも削除。`workflow_dispatch`専用へ復帰済み。
- **公開後の必須ゲート**：XServerの更新を待ち、上記readinessと実URLのブラウザE2Eを実行。404・MIME・CSPヘッダー不一致などがあれば公開成功とは報告せず、必要に応じて配信側を修正する。Safari/VoiceOverと心理尺度妥当性は正式公開前の別課題。
