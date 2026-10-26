# A05 D-76 — BLOCK 7問の優先処置と採用禁止の判断票

2026-10-26。D-34の二案比較、D-57〜D-60の設計審査、D-73〜D-75の構成概念・文案比較の後続。構造データ：`docs/A05_D76_BLOCKER_DISPOSITION_20261026.json`。これは**机上審査の優先順位**であり、回答者データ・信頼性・妥当性の結論ではない。現行設問・採点・履歴・結果表示は未変更。

## 1. 変更・判断の境界

- 対象は`A04, A05, B02, C04, D03, E04, E05`の**ちょうど7問**。すべて現在も`BLOCK`。候補が増えても自動解除しない。
- `A04,A05,B02`：文言選択に先行して**A/B軸の構成概念を選択**しなければ評価の比較基準が定まらない。
- `C04`：将来／今日の便益を比べる場面が`C01,C02,C05`と区別できない限り**棄却または再設計**を優先。
- `D03`：D-59の「体験」への限定はD02の「知識学習」と区別する**研究候補**として保持するが、BLOCK解除はしない。
- `E04,E05`：現行の金銭／時間二極7段階への新たな採用は禁止。E-A相対、E-B独立2尺度、E-C非分類の3方式から選ぶ**研究設計の比較**へ移す。E-Cを安全側対照案に置くが、採用は未決定。

## 2. ID別の処置一覧

| ID | 未解決の問題 | 次にすべきこと | 不成立なら |
|---|---|---|---|
| A04 | CONSTRUCT_SHIFT_AND_REDUNDANCY | KEEP_BLOCKED_PENDING_A_CONSTRUCT | REWRITE_OR_DROP_IF_REDUNDANT |
| A05 | CONSTRUCT_SHIFT_AND_REDUNDANCY | KEEP_BLOCKED_PENDING_A_CONSTRUCT | REWRITE_OR_DROP_IF_REDUNDANT |
| B02 | CONSTRUCT_SHIFT_AND_BIPOLARITY | KEEP_BLOCKED_PENDING_B_CONSTRUCT | REDESIGN_AS_NON_BIPOLAR_IF_BOTH_IMPORTANT |
| C04 | TEMPORAL_BENEFIT_REDUNDANCY | REWRITE_OR_DROP_BEFORE_TRIAL | DROP_IF_NO_DISTINCT_FACET |
| D03 | D02_LEARNING_VS_EXPERIENCE_OVERLAP | TRIAL_CANDIDATE_BUT_STILL_BLOCKED | REWRITE_OR_DROP_IF_REDUNDANT |
| E04 | E_AXIS_FORMAT_UNRESOLVED | HOLD_E_DESIGN | NO_E_CLASSIFICATION_UNTIL_APPROVAL |
| E05 | INCOMPARABLE_MONEY_TIME_INCREMENT | HOLD_E_DESIGN | NO_E_CLASSIFICATION_UNTIL_APPROVAL |

## 3. 各問の反証条件

### A04（CONSTRUCT_SHIFT_AND_REDUNDANCY）

**現時点の処置：KEEP_BLOCKED_PENDING_A_CONSTRUCT。BLOCK解除なし。** 案Lは居住・住まい方、案Mは計画継続を尋ねるため同一尺度ではない。A01との重複は双方に残る。

確認質問：回答者が『住まい方』と『活動計画』を区別できるか。A01とは異なる回答理由が説明できるか。

候補比較：L / M / DROP。区別が成立しない場合の処置：REWRITE_OR_DROP_IF_REDUNDANT。

### A05（CONSTRUCT_SHIFT_AND_REDUNDANCY）

**現時点の処置：KEEP_BLOCKED_PENDING_A_CONSTRUCT。BLOCK解除なし。** 案Lは生活空間の変更、案Mは予見可能な変化への対処で、現行の住環境軸と意味が異なる。A04/A06とも重複し得る。

確認質問：生活空間の変化か変化対応の手順かを区別できるか。費用・居住制約を選好と誤認していないか。

候補比較：L / M / DROP。区別が成立しない場合の処置：REWRITE_OR_DROP_IF_REDUNDANT。

### B02（CONSTRUCT_SHIFT_AND_BIPOLARITY）

**現時点の処置：KEEP_BLOCKED_PENDING_B_CONSTRUCT。BLOCK解除なし。** 案Lは自由時間と他者との予定調整、案Mは活動の決定権。自己裁量と相談は両立し、対人能力や社交性とは独立とは限らない。

確認質問：『自分で決めつつ誰かに相談する』との違いを説明できるか。調整相手がいない人にも回答可能か。

候補比較：L / M / DROP。区別が成立しない場合の処置：REDESIGN_AS_NON_BIPOLAR_IF_BOTH_IMPORTANT。

### C04（TEMPORAL_BENEFIT_REDUNDANCY）

**現時点の処置：REWRITE_OR_DROP_BEFORE_TRIAL。BLOCK解除なし。** 将来／今日の充実の反復となりC01/C02/C05との差が薄い。時点・種類・大きさの便益が揃わず読み取りが不安定。

確認質問：C04はC01/C02/C05と異なる回答理由が得られるか。将来便益と現在便益は同質・同量と理解されるか。

候補比較：D34_A / D34_B / D57 / DROP。区別が成立しない場合の処置：DROP_IF_NO_DISTINCT_FACET。

### D03（D02_LEARNING_VS_EXPERIENCE_OVERLAP）

**現時点の処置：TRIAL_CANDIDATE_BUT_STILL_BLOCKED。BLOCK解除なし。** 知識の幅／深さ(D02)と実体験の幅／深さ(D03)に分離した候補があるが、経験機会・費用・疲労による偏りを排除していない。

確認質問：知識習得と体験選択を混同せずに回答できるか。費用・機会が同じという想定を理解するか。

候補比較：D59 / D34_A / D34_B / DROP。区別が成立しない場合の処置：REWRITE_OR_DROP_IF_REDUNDANT。

### E04（E_AXIS_FORMAT_UNRESOLVED）

**現時点の処置：HOLD_E_DESIGN。BLOCK解除なし。** E01/E02/E05/E06と近い。金銭・時間を相反選好として扱う根拠がなく、2つの希望は同時に強くなり得る。

確認質問：相対比較と独立評価で、両方を強く希望する回答者の解釈が変わるか。金額・時間の想定がバラつかないか。

候補比較：E_A / E_B / E_C。区別が成立しない場合の処置：NO_E_CLASSIFICATION_UNTIL_APPROVAL。

### E05（INCOMPARABLE_MONEY_TIME_INCREMENT）

**現時点の処置：HOLD_E_DESIGN。BLOCK解除なし。** 旧文言の『月3万円／週3時間』は量の比率を恣意的に固定する。改稿後も増分の想像量が揃わず二極スコアの比較妥当性は未確認。

確認質問：何円と何時間を想像したか、片方または両方の不足を補う目的で選んでいないか。

候補比較：E_A / E_B / E_C。区別が成立しない場合の処置：NO_E_CLASSIFICATION_UNTIL_APPROVAL。

## 4. 「採用候補」と「測定項目」の境界

| 資料・状態 | 何ができるか | できないこと |
|---|---|---|
| D-34 二案比較 | 同じ問題に複数の改稿を並べる | どちらが統計的に優れるかの決定 |
| D-73 30問の出典台帳 | 軸・文面・重複・採用ゲートを一元監視 | A/Bの構成概念を自動選択 |
| D-74 A/B案L・案M | 生活環境／生活上の関係性と、活動方法／共同意思決定を比較 | 旧スコア・16タイプと同一と主張 |
| D-75 16タイプ説明候補 | 採用概念に応じた表現の整合性を点検 | 旧snapshotや本番UIへ反映 |
| D-76 BLOCK審査 | **採否を決めるための順序と棄却条件を固定** | BLOCK解除、研究実施、タイプ判定の妥当性保証 |

## 5. 完了させる順番

1. **A/Bの構成概念の製品上の定義**を決裁する。「生活環境・他者との関係」を重視するなら案L、「活動方法・共同意思決定」を測りたいなら案M、どちらでもないなら再設計。どの案も新しい質問セットとして版管理する。
2. A04/A05/B02の重複関係を人手で審査する。異なる回答理由を得られない項目は、6問を埋めるために維持せず削除または新項目起案を検討する。
3. C04の反復を解消する案を検証候補に残すか棄却し、D03の「知識学習と実体験」の区別を検証する。
4. E-A/B/Cの選定条件とスキーマ差分を固定し、旧`wealth`の変換・再解釈を禁止する。E05の旧「月3万円／週3時間」を再導入しない。
5. 各問の人手採否、調査実施前のG1承認、同意・保管・撤回条件、版分離・旧結果読取保護を確認してから次に進む。

**制御条件：** 承認なしの参加者募集・実回答収集なし、`mergeAuthorized=false`、`productionReleaseAuthorized=false`、PR #61 Draft維持。これらはCI成功によって変化しない。

## 改訂履歴（追記）
- 2026-10-26 D-76-001：BLOCK7問の判断対象・反証条件・保持／再設計／比較の順序を整理。変更前：各期の二案が散在。変更後：すべて未承認の機械可読トリアージを追加。理由：候補生成をBLOCK解除と誤認しないため。
