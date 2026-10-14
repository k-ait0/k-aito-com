# KAITO 共通部品・同期の監査（2026-10-15）

対象: sitemap.xml 記載の24公開URL。MONO BASE・noindex試作は別管理。
基準: 最新main `5b8b1b89e10b`、修正ブランチ `fix/storage-shelf-flow-20261015`。

| 部品 | 現状の実装 | 2026-10-15の対応 | 残作業・検証 |
| --- | --- | --- | --- |
| ブランド・トップメニュー | 各HTMLに複製。24ページ共通のsite-header。現在地はページごと | `scripts/sync-site-shell.cjs`がトップの静的HTMLから公開24ページ分を同期。現在地はURL系統と既存aria-currentで付与 | CI再同期差分0、全ページのリンク・画像読込後実画面 |
| フッター | トップのみsite-footer、他23ページpage-footer | トップのsite-footer構造を23ページへ同期、濃緑を維持。白背景のfooter-wide上書き4行を削除 | 6幅の視覚・配信ファイル一致 |
| 検索 | トップはapp.jsとsearch-form、下層はsite-search.jsで検索フォーム生成。記事/プロジェクトデータを参照 | 既存動作を壊さず、共通ヘッダー内の検索スロットをページ別に維持 | UI・操作・キーボード動線を両者で統一し、共有検索コンポーネントへ |
| 棚カード | storage-v2, subpages, white-surfacesに画像・文字の座標指定が重複 | 画像行と白い伸縮本文面を分離。7枚のラベル・本文・矢印を文書フローへ。競合CSSを削除 | 320/375/390/430/768/1440pxの画像読込後の非重複テスト |
| パンくず | 各ページのbreadcrumbが個別埋込 | ページ固有の文脈を維持、今回は未変更 | route/labelレジストリ設計、各階層の表示・構造化データを調査 |
| 記事カード | scripts/sync-published-content.cjsのnoteCard、トップのapp.js、記事の関連導線で複数実装 | 本文・既存カードの内容は維持 | カードデータと表示テンプレート、レスポンシブの差異表 |
| 関連記事・次に見る | related-band、article-related、article-next、project-local-nav等を用途別に保持 | 意味の異なる導線を無理に統一せず維持 | 共通部品の対象/非対象を決め、カード/リンクの下層APIを定義 |
| 日付・状態・メタ情報 | content-index.js / project-search-index.js / data/project-card-status.v1.jsonとページ固有メタ | 現行生成元を維持。SEOと公開同期の監査を残す | 説明文・状態ラベルの重複を集約、記事SEOスキーマと整合検証 |
| スタイル層 | ベース・ページ別・最終白紙面。!importantが蓄積 | 棚カード関係の旧ルールを削除し、新たな!importantを追加しない。白面と濃緑フッターを分離 | 全スタイルの広域カスケード整理は別作業。ページ固有表現は保存 |
| MONO BASE | PR #33 Draft、別デザイン8ページ | KAITO公開24ページの共通化対象から除外 | canonical/sitemap/noindex/アセット・ブラウザ監査後、独立公開判定 |

## 共通化方針

- ヘッダーとフッターは**トップページが唯一のHTML生成元**。`node scripts/sync-site-shell.cjs`で公開サイトマップ掲載ページに静的反映し、JS無効時も機能する。
- 公開同期は `sync-white-surfaces` の**後**に `sync-site-shell` を実行。PR #34のCSS版番号を変更・巻き戻さない。
- カードの画像はDOMのimg要素。テキストは白面のフレックスフロー。固定高による押し潰しや画像帯への重なりを禁止する。
- データベース化の優先度は、検索の一本化 > メタ情報/記事カード > パンくず/関連導線。記事本文・図解・個別プロジェクトUIは破壊しない。

## ゲート

`scripts/test-site-shell.cjs`、`scripts/site-static-check.cjs`、`scripts/audit-seo.cjs`、6幅の`scripts/browser-smoke.cjs`をCIで実行する。CIが成功しても本番確認済みにはしない。PRのマージ・配信一致・画像読込後の公開ブラウザQAが揃って初めて公開確認済みとする。
