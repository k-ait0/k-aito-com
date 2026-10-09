# KAITO 新規記事テンプレート v1.0

**適用前に変更する値**：slug、タイトル、説明文、canonical、OG、投稿日、カテゴリ、記事の本文と出典。公開の際は台帳 `content-index.js` にも登録する。全体のヘッダーとフッターは既存記事を参照し、省略しない。

```html
<!-- head 内。既存のサイト共通CSSの後に追加する -->
<link rel="stylesheet" href="/article-reading.css?v=20261009-v1">

<!-- bodyには2クラス -->
<body class="subpage essay-page">
  <!-- 既存のヘッダー -->
  <main id="content" class="page-wrap article-layout">
    <div class="breadcrumb"><a href="/">HOME</a><span>/</span><a href="/archive/">ARCHIVE</a></div>
    <article class="article-page">
      <div class="note-meta"><span>THINK</span><time datetime="YYYY-MM-DD">YYYY.MM.DD</time></div>
      <h1>記事タイトル</h1>
      <p class="page-lead">記事の要約・導入。</p>
      <nav class="article-reading-guide" aria-label="記事の案内">
        <span>ESSAY</span><a href="/archive/">ARCHIVE</a>
      </nav>

      <!-- 長文記事で任意。アンカーIDを本文h2と対応させる -->
      <details class="essay-toc essay-toc-collapsible">
        <summary>この記事の目次を開く</summary>
        <ol>
          <li><a href="#section-1">第1章の見出し</a></li>
          <li><a href="#section-2">第2章の見出し</a></li>
        </ol>
      </details>

      <div class="article-copy essay-body">
        <h2 id="section-1">第1章の見出し</h2>
        <p>本文。</p>
        <h2 id="section-2">第2章の見出し</h2>
        <p>本文。</p>
        <!-- 図には alt、figcaption、出典を付ける -->
        <figure class="article-visual">
          <img src="/assets/example.webp" alt="図が表している内容" loading="lazy">
          <figcaption>図1｜図の説明。出典：原典資料。</figcaption>
        </figure>
      </div>
      <section class="article-related"><h2>関連する記事</h2><!-- 記事リンク --></section>
    </article>
    <nav class="article-next" aria-label="前後の記事"><!-- 前後への導線 --></nav>
  </main>
  <!-- 既存フッター -->
</body>
```

**注意事項**：サイト全体の背景色を白にしないこと。共通スタイルは `article-reading.css`。記事特有のUIは別CSSに分離すること。記事本文をデザイン修正の都合で要約しないこと。

**本番検証**：`scripts/site-static-check.cjs`、`scripts/browser-smoke.cjs`、`scripts/live-production-check.cjs` を満たし、XServer反映を確認する。
