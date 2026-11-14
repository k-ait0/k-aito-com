# A05 D-218｜認証付きスマホ確認ページ（2026-11-13）

## 確認用URL

**https://a05-mobile-review-preview.up.railway.app/**

これは**ログイン認証付きの独立したRailwayプレビュー**であり、`k-aito.com` の本番公開・本番診断とは切り離している。ドメインそのものはインターネットから到達可能であり、**認証されなければフォームのHTMLを返さない**。URLだけを秘匿した無防備な「限定公開」ではない。

- 認証: HTTP Basic（ユーザー `review`、ランダムな長いパスワードはRailwayの環境変数 `A05_PREVIEW_SECRET` に保存。**このGitHubドキュメントとソースコードにパスワードを含めない**）
- ユーザーへの認証情報通知は会話内で別途行う
- 公開環境: Railwayプロジェクト `a05-research-mobile-preview` の `preview` 環境。サービス `a05-mobile-review`
- デプロイID `d937bdb4-56f3-4a86-8814-2759d5ec7b50`：**SUCCESS**
- ビルド元: `research/a05-editorial-50-v1-20261113` / `e6992f37562fc885551022d057421db8b8a90bdd`
- server launch: `A05_PRIVATE_PREVIEW_READY port=8080`
- RailwayサービスドメインのtargetPort=8080とアプリ待受ポートを一致させた
- Sleep/Serverlessモードをオン、CPU 0.25、メモリ 0.5GB の制限を設定。**クラウドの使用料が発生する可能性はあるため、検証後はサービス停止・削除を判断する**

## スマホでの確認

1. 上記URLをSafari/Chromeで開く。
2. HTTP Basic認証ダイアログに、案内されたユーザー名とパスワードを入力する。
3. 「全50問：設問校正用」または「抽出30問：操作確認用」を選ぶ。
4. 同意のチェックを付け、回答・前後移動・判断不能の操作を試す。
5. 全50問モードの最後には、B/Cの4つの独立評定と重点3組の意味比較が表示される。
6. 途中保存・再開は**明示的なJSONダウンロード/インポートのみ**。ブラウザを閉じるだけでは保存されない。
7. 16タイプの判定・得点は出さない。本番診断のデータは変更しない。

## セキュリティ・プライバシー

- 認証前はHTTP 401。認証後に生成済みの静的HTMLを返す。
- 本サーバーはGETとHEADのみ受け付け、回答をPOST/保存するAPIを持たない。
- `Cache-Control: no-store`、`X-Robots-Tag: noindex, nofollow`、フレーム埋め込み防止を設定。
- 回答フォームはオフライン構造を使い、回答値・自由記述を外部送信しない。ブラウザでエクスポートしたJSONは本人が管理する。
- Railwayログなどプラットフォーム側の通常の通信メタデータは別途存在し得る。**完全に通信記録が残らないとは主張しない**。
- HTTP Basic認証のためブラウザによっては認証状態を保持する。共用端末の利用とパスワード再配布を避ける。
- 認証情報が漏れた場合、Railway変数 `A05_PREVIEW_SECRET` を変更して再デプロイする。

## QA根拠と限界

- PR CIにて`node --test scripts/test-a05-private-preview-server.mjs` 実行：未認証/誤認証の拒否、正しい認証の許可、noindex/no-store、POST拒否、回答内容非保持を確認。
- GitHub Actions: `https://github.com/k-ait0/k-aito-com/actions/runs/43421909080`
- Railwayプレビューのビルドとアプリ起動を確認し、ドメインのtargetPortを修正した。
- **外部端末からの実URLログイン成功はこの環境では未確認**。最終的なスマホでのアクセスはユーザー端末で行い、エラーがあればログとドメイン設定を照合する。

## プレビュー変更の位置づけ

- Dockerfile: `preview/a05/Dockerfile`
- 認証サーバー: `preview/a05/server.mjs`
- 入力UI: `research/a05/d210-research-template.html`
- 生成: `scripts/a05-d210-build-offline-form.mjs`
- データ: `research/a05/d206-editorial-50-question-bank-v1-2.json`
- 研究レビュー中のPR #78のみ。未マージ。
