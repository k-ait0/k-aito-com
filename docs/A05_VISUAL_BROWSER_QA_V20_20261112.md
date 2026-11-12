# A05 v20｜ブラウザQA拡張・保存競合防止（2026-11-12）

## 変更した実装
1. `scripts/qa_a05_browser.cjs` に **独立ブラウザコンテキスト**によるTier1紋章16種類／RGBY4色／E軸保留・時間／揺らぎ（reduced motion）／PC・モバイル横幅／旧結果維持を確認するチェックを追加。SVGのローカルサーバーMIMEを `image/svg+xml` に修正。
2. `scripts/qa-a05-public-origin-readiness.mjs` の配信照合対象を既存13ファイルから **32ファイル**へ拡張（新表示モジュール3＋Tier1 SVG16）。ハッシュ一致とSVG MIMEを検査できるようにした。
3. `app.mjs` は保存処理が進行中、プレビューの `select` も一時的に無効化し、操作競合を避ける。
4. Playwrightの起動に `A05_CHROMIUM_EXECUTABLE` オプションを追加。通常は従来どおりChrome。

## 実行済みの検査
- **単独デモv17に対して**ブラウザのHTMLを直接読み込ませ、Chromiumで2幅（1280px、390px）を検査。
- 各幅で16/16紋章、RGBY4/4、E軸3状態、reduced-motion停止、横はみ出しなし。合計10検査グループ通過。ファイルとして `/mnt/data/A05_v20_隔離表示QA結果.json` を記録。
- GitHub上の更新コードを再取得し、`app.mjs`、既存ブラウザQA、追加v19テストのJavaScript構文を確認。公開前照合はトップレベルawaitを使うモジュールとして構文確認。

## 未実施のゲート（合格扱いにしない）
- **Draft PR #77のA05実ページ**に対してPlaywright E2E一式をまだ実行していない。保存・復元・履歴・30問・PDF・印刷は既存QAスクリプトにカバー範囲があるが、今回実行はしていない。
- 新しいv20ブラウザチェックはGitHubのPRへ追加済みで、実行待ち。
- ランナーからGitHubを直接cloneする試行はDNS解決失敗。無断でGitHub Actionsは実行していない。
- Safari実機確認とTier1の24px視認性、Tier2原画承認は未実施。新しいA/B方向・強弱やC/D→RGBYの確定と自動連動も未実施。

## 再現手順
PR #77のブランチ `feature/a05-visual-contract-v15-20261111` を手元に取得して実施：
```bash
node --test scripts/a05-visual-contract-v15.test.mjs scripts/a05-visual-preview-v16.test.mjs scripts/a05-visual-assets-v17.test.mjs scripts/test-a05-visual-integration-v18.mjs scripts/test-a05-visual-full-flow-v19.mjs
node scripts/local-preflight.cjs
# Windows/Chromeなど既存QA環境では従来の環境設定を利用
NODE_PATH=/tmp/kaito-qa/node_modules node scripts/qa_a05_browser.cjs
# ChromiumだけがあるLinuxランナーの場合
A05_CHROMIUM_EXECUTABLE=/usr/bin/chromium NODE_PATH=/tmp/kaito-qa/node_modules node scripts/qa_a05_browser.cjs
```
※ `A05_LIVE_ORIGIN`を設定しない限り本番には接続しない。GitHub Actionsは手動のみ。

## 継続する方針
- RGBYは枠線CSSだけ。旧発光制御は将来検討部品として保管。
- 16モチーフとTier1を維持、Tier2正式承認0/16。
- 旧T01〜T16と新16寓意を暗黙に対応付けない。スコア・保存・レポートコードの意味論は変更しない。
- Draftを保持。mainマージ、本番公開は行わない。
