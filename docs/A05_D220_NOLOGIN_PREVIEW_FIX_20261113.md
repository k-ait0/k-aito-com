# A05 D-220｜スマホ用診断ページ・ログイン撤去（2026-11-13）

## 現行URLと最終検証

- 簡易30問診断（ログイン不要）：https://a05-mobile-review-preview.up.railway.app/
- 詳細研究用フォーム（ログイン不要）：https://a05-mobile-review-preview.up.railway.app/research
- 以前のD218認証付き構成は**本資料で置換**。ユーザー名・パスワード入力は不要。
- GitHub Actionsの外部HTTPアクセス検査：https://github.com/k-ait0/k-aito-com/actions/runs/43426845344
- 外部スモークテスト：**SUCCESS**（未認証の `/` で200と実際のD219診断HTML、`/research` で200とD210研究HTML、`/health` で200、回答POSTは405）
- 現行Railwayプレビューデプロイ：`f7cc4925-211d-4a01-be8d-5cda7129f0ba`、ビルド元 `bc4d3c503440c1a5296fe0b9649d9dd03457061d`。状態SUCCESS。
- ブラウザ自動テストはPC/モバイル幅を含め、GitHub Actionsの研究CI https://github.com/k-ait0/k-aito-com/actions/runs/43426536417 でSUCCESS。

## 原因・修正

前構成にはHTTP Basic認証があり、ログインの案内が確認用途には過剰だった。ユーザーから「Not Found」の報告があったが、その**元の404がRailway側なのかサーバーのパス処理なのかは特定できていない**。今回、URLルーティングと認証を明示的に変更し、外部ネットワークから正常な200応答と画面HTMLを確認した。

実装修正：
- `preview/a05/server.mjs` から認証処理を撤去。ルート `/`, `/index.html`, `/diagnosis`, `/diagnosis/` はD219簡易診断を表示。
- `/research`, `/research/` はD210研究フォームに分離。
- `/health` は200 `ok`。
- ユーザーが入力する回答はメモリ内で集計し、外部送信なし。GET/HEADのみ許可、POST/PUTなどは405。
- `noindex`、`Cache-Control: no-store` を維持。**インターネット上で誰でも表示可能なページ**であり、noindexは認証・アクセス制限の代わりではない。個人情報を入力しない設計とする。
- Railwayサービスの旧認証情報の環境変数値は空文字に更新済み。サーバーコードは参照しない。

## 注意事項

- D219結果表示は**暫定16タイプ**で、正式な診断の測定妥当性・再現性は未検証。E軸は分類に使わない。
- 本番k-aito.comと元のPR #76には未反映。PR #78の研究用Draftを運用。
- 本ページが外部インターネットから閲覧可能になったので、意図せぬ共有・運用コストを監視し、検証終了後にドメイン停止を検討する。
