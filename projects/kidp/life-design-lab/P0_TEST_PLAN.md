# KIDP-003 LIFE DESIGN LAB — P0 User Test Plan

Status: TEST PREPARED / NOT YET RUN
Prototype: Landing → 20-card Swipe → Interest Map

## Test question

「人生の目標」を直接考えさせなくても、
小さな興味への反応を20回選ぶことで
「もう少し掘りたい方向」を本人が見つけられるか。

## Participants

初回5〜10人。

できれば以下を混ぜる:
- 明確な目標がある人
- 目標がまだ曖昧な人
- 自己分析ツールが好きな人
- 自己分析ツールを普段使わない人

## Start script

説明は以下だけにする。

「“ちょっとやってみたい？”を20回選ぶ試作品です。
正解はないので、今の気分で触ってください。」

「人生設計」「適性診断」「性格診断」という説明は先にしない。

## Metrics

### M1 Completion

20枚すべて回答。

Target: 80%以上

### M2 Result Resonance

結果を見た直後に、
「少し分かる」「自分っぽい」「確かに気になる」
のいずれかに相当する反応。

Target: 70%以上

### M3 Deep-dive Intent

上位5領域を見て、
1領域以上を「もう少し掘りたい」と自発的に選べる。

Target: 60%以上

### M4 Diagnostic Misread

「これは性格診断・適性診断だ」と理解してしまう。

Failure threshold: 40%以上

### M5 Card Friction

意味が分からない / 抽象的すぎて選べないカード数。

Target: 参加者平均2枚未満

## Observation

記録:
- 20枚完了 YES / NO
- 完了時間
- WANT数
- MAYBE数
- PASS数
- 選択で5秒以上止まったカード
- 結果への第一声
- 上位5領域
- 深掘りしたい領域
- 診断だと思ったか
- 追加してほしいカード
- 不要だと思う要素

## Post-test questions

順番固定。

1. 「これは何をするものだと思いましたか？」
2. 「WANT / MAYBE / PASSは選びやすかったですか？」
3. 「迷ったカードはどれですか？」
4. 「結果を見て、どこが自分っぽいと思いましたか？」
5. 「逆に違うと思ったところは？」
6. 「この中でもう少し掘るならどれですか？」
7. 「これは診断だと思いましたか？」
8. 「次に何が出てくると面白そうですか？」

## Decision rules

### P1 GO

M1 >= 80%
M2 >= 70%
M3 >= 60%
M4 < 40%

→ AI Theme Discovery / Deep Swipeへ。

### CARD REDESIGN

M1 < 80% または M5 >= 2枚。

→ カード文面・順番・カテゴリを修正。
P1へ進まない。

### RESULT REDESIGN

M1は満たすがM2 < 50%。

→ Interest Mapの集計・見せ方を修正。

### POSITIONING REDESIGN

M4 >= 40%。

→ 「診断ではない」がUI上伝わっていない。
Landing / Result copyを修正。

### STOP / INTERNAL TOOL

M1 < 50% かつ M3 < 40%。

→ 公開サービスとしての拡張を止め、
Kaito内部の興味整理ツールとして扱う。

## P1で初めて追加するもの

P0がGOになった場合のみ:
- Life Theme 3〜5案
- Theme Detail
- 追加10〜20枚Deep Swipe

まだ追加しない:
- Mandala
- Mind Map
- 16タイプ
- AI Career recommendation
- 課金
- 他人との比較


## Instrumented test mode

Use:
`/projects/kidp/life-design-lab/prototype/?test=1&pid=P01`

Change P01 for each participant.

Automatically recorded on-device:
- completion
- total duration
- WANT / MAYBE / PASS counts
- Undo count
- cards taking 5 seconds or more
- top 5 categories
- per-card response time

Tester adds after completion:
- result resonance
- deep-dive category
- whether it looked like a diagnosis
- first quote
- notes

Use "CSV行をコピー" and paste each participant as one row under
`P0_TEST_LOG_TEMPLATE.csv`.

No data is transmitted externally.


## Test Console

Internal noindex console:
`/projects/kidp/life-design-lab/test-console/`

Purpose:
- issue P01–P10 instrumented URLs
- paste participant CSV rows
- calculate M1–M5
- apply the pre-registered decision rules without moving thresholds afterward

The console stores pasted CSV only in browser localStorage.
No backend or external transmission.
