# A05 D271→D272｜Ver.2.2 研究診断のUX・アクセシビリティ監査記録（2026-11-20）

**技術自動テストと実機・人間による受入を厳密に区別する。**
**研究用分類のみ／心理測定上の妥当性は未確認／実回答収集なし／既存公開版は不変。**

## D271：既存Ver.2.2の発見事項（再現確認済み）

ChromiumとPlaywright WebKitで各6画面サイズ（1280×800、320×568、375×667、390×844、430×932、667×375）を検証。ChromeとWebKitの両方で、30問回答の変更・スキップ・戻る、結果3タブ、Y/N8問、停止と再開、結果再診断を動作させ、ネットワークアクセス0・JavaScript例外0を確認した。

**ただし、既存版の自動アクセシビリティ検査には改善すべき問題あり：**

- axe-coreによるWCAG A/AA自動チェックで、イントロ・回答・結果・Y/N各画面に **color-contrast（serious）** が出現。補助ラベル・選択肢説明・注意書きの一部が薄い。
- タブのARIA属性自体はあるが、ArrowLeft/ArrowRight/Home/Endに対応しておらず、結果タブのキーボード選択操作は6画面すべて不合格。
- Playwright WebKitの320×568で、質問画面とY/N画面の水平方向scrollWidthが28px過剰。Chromiumでは再現しない。
- 物理的なiPhone/iPadのiOS Safariで検査したわけではない。WebKitはエンジン近似テストであり、実機受入の代替にならない。

問題を見つけたD271 CI： https://github.com/k-ait0/k-aito-com/actions/runs/44663866226
**D271のワークフロー成功は「監査処理が完走した」の意味であり、Ver.2.2が全項目合格した意味ではない。**

## D272：隔離した改善候補

研究ブランチ：research/a05-d272-ux-accessibility-patch-20261120

- research/a05/d272-accessibility-overlay.css：補助文・軸位置の説明・注意事項を読みやすい文字色に調整。320px縦画面のヘッダー文言を省略せず折り返せるよう変更。
- research/a05/d272-keyboard-and-announcements.js：結果3タブの左右矢印とHome/End、表示切替時のフォーカス移動、動的質問のaria-liveを追加。採点・回答値・質問文の置き換えはなし。
- scripts/a05-d272-build-accessible-candidate.mjs：変更前D262生成HTMLに、CSSとJSを注入した独立研究用HTMLだけを生成。原本のテンプレート・D255判定処理は無変更。
- scripts/test-a05-d272-accessible-browser.cjs：ChromeとWebKit各6画面で、イントロ・質問・結果概要・4軸分析・注意事項・Y/Nの6画面状態すべてについてWCAG A/AAタグのaxe-core自動検査を実行。0件以外は不合格。タブ矢印・フォーカス・横はみ出し・ネットワーク通信も不合格ゲート付き。
- .github/workflows/a05-d272-accessible-preview.yml：ChromeとWebKitが**両方**合格した場合に限り、別プレビュー /preview/a05-yn-v22-a11y/ を自動公開する。既存の通常版・Ver.1・Ver.2・Ver.2.1・Ver.2.2・D265のSHA256は不変ガードで保護。

Chromeについては6画面×6状態の自動WCAG違反0件、タブ矢印6件合格、横はみ出し0件、外部通信0件を確認済み（GitHub Actions内のChromeジョブ）。

## この受入の限界・残る承認ゲート

1. axe-coreの対象ルールはWCAG2 A/AA・WCAG2.1 A/AAの**自動で判定できる項目のみ**。手動スクリーンリーダー、読み上げ順、音声入力、200%文字拡大、色覚特性、タッチ操作の操作感まで網羅するものではなく、**WCAG完全適合とは主張しない**。
2. iOS Safariの実機（ノッチ・ホームバー・ブラウザのアドレスバーの変動を含む）は未検証。ユーザー実機での最終確認が別途必要。
3. 画面上の日本語、説明文の分かりやすさ、公開前の確認はユーザーのUX受入が必要。技術QA PASS ≠ 人間の最終承認。
4. D272は別の研究プレビュー。既存のVer.2.2や通常版を上書きしない。D255の得点・判定コード、D270の一時DB・APIも変更しない。
5. 回答収集API、本番データベース、任意同意・削除の本番運用、MFA等は引き続き未実装・未承認。

**結果／最終CI**：WebKit側と公開後の監査を最終確認した時点で追記する。
