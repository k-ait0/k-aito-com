# A05 D250｜D246公開後の計算一致・実サイト同一性監査（2026-11-17）

**結論：技術QA PASS／心理測定的妥当性は未検証。** 今回は採点や質問文の機能改変ではなく、既存の研究版UIが研究用エンジンと一致し、GitHub Pagesで正しいHTMLが配信されていることの独立検証である。

## 1. 参照する実サイト

- D242の30問通常プレビュー：<https://k-ait0.github.io/k-aito-com/>
- D246のY/N補助付き隔離プレビュー：<https://k-ait0.github.io/k-aito-com/preview/yn/>
- D246は独立した研究用ページであり、D242のトップページとは異なる。どちらも `noindex,nofollow,noarchive` と外部通信を拒む `connect-src 'none'` を含む。
- A05正式版の採点エンジンを更新・承認した意味ではない。PR #78は引き続きDraft。

## 2. D248：公開画面とD243研究用エンジンの計算照合

- `scripts/test-a05-d248-yn-research-parity.mjs` を追加。
- D224で抽出した**128設問セット × 11回答パターン＝1,408ケース**について、ブラウザ内の各軸ステータス、4・スキップ件数、有効回答数、方向符号、1.5乗の平均得点、意味グループ別・1問除外時の反転件数、16タイプ候補集合を、独立したD227/D243の結果と照合。
- Y/Nの軸順・初回左右2問・具体場面2問・全体最大8問をD243の `nextYNBatch` と照合し、Y/Nがタイプ得点に混入しないことを確認。
- 30→32→34問の研究用継続状態も別のテストで照合。
- CI：<https://github.com/k-ait0/k-aito-com/actions/runs/43923961654> で**PASS**。このCIにより独立照合を通らない研究版HTMLは完成artifactにならない。

## 3. D249：GitHub Pagesで配信された実HTMLを監査

- `scripts/a05-d249-live-pages-audit.mjs` を追加。公式の2つのURLから実際にHTTPS GETし、生成・E2E確認済みのHTMLと**SHA-256で完全一致**することをチェック。古い/変更されたHTML、異常なリダイレクト、想定外のContent-Typeを検出した場合は失敗。
- `scripts/test-a05-d249-live-pages-audit.mjs` の4/4テスト成功（正常・古いY/N・入れ替え・別オリジン）。
- 公開ワークフロー `.github/workflows/a05-publish-gh-pages.yml` に、通常版・Y/N版双方のPC/スマホE2E成功に加えて**最後に実配信の同一性確認**を必須ステップとして追加。
- CI：<https://github.com/k-ait0/k-aito-com/actions/runs/43924685803>、**全ステップ成功**。この実行で初回チェックから2ページとも完全一致。

| 確認対象 | 配信バイト数 | SHA-256 | 結果 |
|---|---:|---|---|
| D242 root | 91,796 | `d4be3ac612c7bc1cad07bbbb385a7b6910614ac0356598ae6345d7ed5300d070` | 完全一致 |
| D246 Y/N | 104,115 | `9bfdab0965915ec1992ed5bae1d53567ab588bf7e8b6a22705d4dbd0550f9b19` | 完全一致 |

- 公開ブランチで再確認したroot HTMLのGit blob SHAは `6d11e5d320aedc161b3addb3eb6a90eccabe378d`。D242の採点版は維持され、Y/Nのデータ版は含まれない。
- Y/N HTMLのGit blob SHAは `07b586413c2432118de3e4c8ac84fe34b074909c`、版 `A05-D246-ISOLATED-Y-N-PREVIEW-1`。
- PC（1280px）・スマホ（390px）のD246動作テストも5ケースずつ成功。ブラウザ側から回答を送信する外部ネットワークリクエストなし。

## 4. 完了と未完了の区別

**完了したこと**：研究コード・配信ページ・ビルド成果物・現実のWeb配信の一致、24時間内の技術QA証跡。D242の既存ページを維持。

**未完了のこと**：C36の採否、4とスキップが多い人にとってY/Nが有効かの実回答検証、質問疲労・所要時間、4/7・5/7・8問上限の実証的較正、正式採点版への採用。

次は合成回答テストを追加し続けるより、**人間による先行認知面接2〜3件**で質問意図・回答負担・途中終了を確認し、必要な差分だけ研究用文面へ反映する。実回答は現時点で**0件**。G1/G3/G4/G5は未合格のまま。

**評価：D248/D249 TECHNICAL RELEASE ACCEPTANCE PASS、HUMAN VALIDITY AWAITING_DATA。**
