# KAITO 共通部品監査と次期改修境界 — 2026-10-15

対象: `https://k-aito.com/` の `sitemap.xml` 記載24公開URL。MONO BASE Draft PR #33、noindex試作は別管理。

## 判定

| 部品 | 現在の生成元と使用箇所 | 状態 | 推奨する次の改修 |
| --- | --- | --- | --- |
| ロゴ／共通ヘッダー | トップHTMLを正規元とし `scripts/sync-site-shell.cjs` で他23公開ページへ同期 | 本番確認済み（PR #36） | メニュー変更時は全24ページ同期無差分・公開版操作確認を必須にする |
| 濃緑フッター | 同一シェル生成元。旧 `.page-footer` 23ページを廃止 | 本番確認済み（PR #36） | 白い読書面のCSSをフッターへ波及させない |
| パンくず | `data/site-breadcrumbs.v1.json` → `scripts/sync-site-breadcrumbs.cjs` → 下層23ページの `nav.breadcrumb` と BreadcrumbList | 本番確認済み（PR #38） | 新しいsitemap URL追加時は同時に階層マスターを更新。HTMLを個別編集しない |
| 検索 | HOMEは `app.js` の検索・`#search-form` と `#archive-dialog`、下層は `site-search.js` の動的フォーム・専用結果ダイアログ | 未着手（S-10） | 結果生成・日本語NFKC正規化・検索順位・記事/プロジェクトの対象集合・URL生成を共通の純粋関数へ集約。見た目と対話モデルは回帰確認後に統一 |
| 一般記事カード | HOME `app.js` の `entryCard`、下層 `site-content.js` の `noteCard`、静的フォールバック `scripts/sync-published-content.cjs` の `noteCard` | 未着手（S-11） | 同じ `content-index.js` を正規マスターとして、ラベル・リンク・日付・概要・タグ・サムネ・alt・状態の表示契約を作る。HTML文字列の重複を減らす |
| 関連記事／次に見る | `.article-related`、`.related-band`、記事別の関連リンク、`.project-local-nav` など用途で区別 | 未着手（S-11） | 記事本文・図解の配置と個別選定結果は保存し、カードの構造とスタイルのみ用途別の共有コンポーネントへ |
| canonical／OG／Twitterメタ | 各公開HTMLのheadに静的記述。 `scripts/site-static-check.cjs` による整合性監査。パンくず構造化データだけ独立マスター | 未着手（S-12） | 記事の正規タイトル/概要/公開日/画像URLを含む共通メタ生成へ移行。Article・BreadcrumbListのJSON-LDと同じURL正規化を使用 |
| CSSの競合 | `styles.css`／ページ別CSS／`subpages.css`／`white-surfaces-v1.css` を併用 | 部分対応済み | 変更範囲の不要な上書き・`!important`を削除。外側生成り、本文白、写真、濃緑フッターの4条件を回帰テストで固定 |
| MONO BASE | Draft PR #33に独立ヘッダー／独立デザイン／8ページ構造 | 阻害要因あり（S-08） | canonical・sitemap/noindex・画像/3Dアセット・ブラウザ検査を専用ゲートで実施。KAITOのシェルを自動適用しない |

## 次工程の優先度

1. **S-10 検索共通化**: データ検索の共通関数を先に抽出し、HOMEと下層が同一条件で同一URLへ到達するテストを作る。キーボード操作・Escape・フォーカス復帰・スマホ表示を確認。
2. **S-11 カード共通化**: 通常記事・関連記事・プロジェクトを混同せず、共通する記事フィールドから出力HTMLを統一。記事本文・図解・個別関連リンクの削除や要約は行わない。
3. **S-12 SEOメタ生成**: 既存の公開SEO監査を落とさず、headメタデータの重複入力を削減。公開URLとcanonicalは常に一致させる。
4. **S-08 MONO BASE**: KAITO本体とは別のブランチ／PR／CI／本番確認ゲートを維持。

## 2026-10-15 検証の証拠と境界

- PR #36（棚カードとサイトシェル）、PR #37（記事同期の一時テスト環境修正）、PR #38（パンくず／JSON-LD）をmainへ統合済み。旧Draft PR #35は重複として未マージのままクローズ。
- 自動同期 run: https://github.com/k-ait0/k-aito-com/actions/runs/38662353825 — シェル24件・パンくず24件・白面CSS24件で差分0。
- XServer本番 run: https://github.com/k-ait0/k-aito-com/actions/runs/38662372824 — 配信60件成功・0失敗、本番Chromium1788件成功・0失敗。幅は320/375/390/430/768/1440px。
- ブラウザQAは公開24ページの画像・検索・グローバルUI・横はみ出しを検査。棚カード7枚の画像読込後判定と説明文3倍ストレスが6幅で成功。
- 今回作業による既存記事の本文・図解・既存カード項目の削除はなし。上記S-10～S-12は**調査・設計段階**であり、実装済みや本番確認済みではない。
