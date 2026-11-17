# A05 D256｜30問＋Y/N分類補完の公開技術受入（2026-11-18 JST）

**結果：D255/D256 TECHNICAL_RELEASE_PASS／HUMAN_VALIDITY_AWAITING_DATA。**
本レポートは研究用 `/preview/yn/` の新しい暫定分類を対象とし、正式診断への採用を意味しない。

## 1. 参照先

- D255の設計：`docs/A05_D255_YN_CLASSIFICATION_DESIGN_20261118.md`
- D254の30問以降Y/N限定仕様：`docs/A05_D254_POST30_YN_ONLY_DECISION_20261118.md`
- 本体：<https://k-ait0.github.io/k-aito-com/preview/yn/>
- 変更しない通常版D242：<https://k-ait0.github.io/k-aito-com/>
- D255純粋関数検証：<https://github.com/k-ait0/k-aito-com/actions/runs/44136486717> SUCCESS
- D246/D255 PC・スマホ E2E：<https://github.com/k-ait0/k-aito-com/actions/runs/44138060236> SUCCESS
- 最終公開・HTML同一性：<https://github.com/k-ait0/k-aito-com/actions/runs/44138060327> SUCCESS（commit `035664bd07da35aac6b449e954871ba861fe714a`）

## 2. 検証済みの範囲

- 初回30問は旧7段階を維持し、**31問目以降はY/N形式のみ**。旧32/34問追加ボタン、旧理由プルダウンは研究版画面から削除。
- Y/Nの回答はYES／NO／判断できない。Y/Nは最大8問で途中終了・再開可能。
- 30問で未確定な軸にもY/Nを提案し、左右がYES/NOまたはNO/YESならD255の**暫定分類候補**を狭める。両方YES/NO、UNSURE、矛盾では強制判定しない。
- 全スキップと全4を異なる結果説明で扱い、方向回答0の場合は方向量のゲージを非表示とする。
- 元の30問の1.5乗得点・D243研究用非採点分析と、D255の暫定候補絞り込みを**別層として保持**。
- D255単体：全スキップから8Y/Nで暫定1タイプへ絞れるケース、全4、旧5/7条件未満、YES/YES、NO/NO、UNSURE、具体場面、矛盾、8問上限、不正入力、128設問セット×3ケース等を検査。
- D248：従来30問の計算を128×11＝1,408人工ケースで独立エンジンと照合。旧32/34問計算の互換テストは研究用で残るが、研究版UIからは出題されない。
- Chrome系実ブラウザE2E：1280px／390pxそれぞれ6ケース、JSエラー・外部送信なしを確認。
- D242通常版のブラウザ・計算テストも出版ゲートで成功。
- PR #78：Draft/open／未マージ。

## 3. 公開HTMLの真正性

GitHub Actionsで2026-11-18 02:35 JST（UTCでは2026-11-17 17:35）に実サイトのHTTPSレスポンスを、生成・E2E済みHTMLのSHA-256と照合。両方完全一致。

| 対象 | 配信バイト数 | SHA-256 | Git blob SHA | 結果 |
|---|---:|---|---|---|
| D242 root | 91,796 | `d4be3ac612c7bc1cad07bbbb385a7b6910614ac0356598ae6345d7ed5300d070` | `6d11e5d320aedc161b3addb3eb6a90eccabe378d` | MATCH |
| D246/D255 Y/N | 107,560 | `5cf61a5114e69c292080be803ae835c5e75d400f4a773a8e89fb2347547d11e1` | `e00185e39e5346868f61328c8845bf03d507dbc2` | MATCH |

出典：GitHub Actions run 44138060327, step `Verify GitHub Pages HTTP responses match exact tested HTML for both sites` の `A05_D249_LIVE_SITE_VERIFIED`。これは画面の内部ロジックが研究用コードと一致することの技術的証拠であり、心理測定の証拠ではない。

## 4. 明確に未完了のこと

- 人間の実回答・認知面接：**0件**。分類成功率、安定性、ユーザーの理解度は実測していない。
- 独立した左右YES/NOから、二極の相対優先を導出するD255の規則は仮説。とくに両方YES/NO・具体場面・状況依存の取り扱いは要検証。
- 追加質問8問という上限、各軸2問の配分、実際の分類到達率・誤分類・回答負担は未較正。
- 現行のスキップボタン「判断できない・当てはまらない」がひとつの`null`に圧縮される問題は、D253で監査済みだが**未修正**。
- G1＝BLOCKED、G3/G4＝AWAITING_DATA、G5＝BLOCKED。D242/正式版へ新判定をマージしない。

**運用上の次のゲート：D251/D252の先行2〜3人認知面接→D255のY/N補完が理解できるか／質問負担が許容されるか→人間のデータによる定量較正。**
