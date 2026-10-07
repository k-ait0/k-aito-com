# KIDP-002 WHYNOT — User Test Plan v1.0

Status: TEST PREPARED / NOT YET RUN  
Date: 2026-10-07  
Target: Concept Prototype only

## 1. Test question

WHYNOTを初めて見た人が、
「Problemを眺める → SAMEする → 自分のProblemを投稿する → 本気で作るところまで見たくなる」
という流れに自然に入れるか。

事業性、市場規模、課金意向は今回の評価対象にしない。

## 2. Participants

初回: 5〜10人。

意図的に混ぜる:
- 新しいサービスやアプリを見るのが好きな人
- 特にそうではない人
- 仕事上の小さな不便を多く持つ人
- 日常生活側の不便を多く持つ人

KIDPやWHYNOTの設計意図を事前説明しすぎない。

## 3. Test setup

1人ずつ実施。
最初にArticle Aは読ませない。
WHYNOT PrototypeのHomeだけを開いた状態から開始。

開始時に伝えるのは1文だけ:

「日常の“これ面倒”を集めて、次に作るものを探す試作品です。自由に触ってください。」

操作中は基本的に誘導しない。

## 4. Core success metrics

### M1 — Problem Browse
最初の3分以内に3件以上のProblemを見る。

Target:
- 5人中4人以上
または
- 10人中8人以上

### M2 — SAME
説明なしでSAMEの意味を理解し、少なくとも1回押す。

Target:
- 60%以上

### M3 — Submit Intent
自分のProblemを1件入力する、または「自分も投稿したい」と明確に言う。

Target:
- 60%以上

### M4 — Build Curiosity
「このProblemを本気で作った結果を見たい」
またはBuild Queue / Project GIVEの続きを自発的に見る。

Target:
- 50%以上

## 5. Failure signals

以下は数値化して記録する。

- Homeを見て30秒以内に何をするサービスか分からない
- SAMEをLikeとして解釈する
- ProblemとSolutionの区別が分からない
- Build Scoreを事業性・市場価値の点数だと思う
- AIが市場調査済みの答えを出していると思う
- Problemカードを2件以下しか見ず離脱する
- 投稿時に「解決策も書くんですよね？」となる
- Build Queueの意味が分からない

## 6. Observation script

記録者は各参加者について以下を記入する。

### Before
- Participant ID:
- Attribute:
- Device:
- KIDPを知っている: YES / NO

### Behavior
- First click:
- Viewed Problems:
- SAME clicked: YES / NO
- SAME meaning understood: YES / NO / UNCLEAR
- Submit opened: YES / NO
- Problem entered: YES / NO
- Solution Lab viewed: YES / NO
- Build Score viewed: YES / NO
- Build Queue viewed: YES / NO
- Project GIVE viewed: YES / NO

### Time
- Time to understand service:
- Time to first Problem detail:
- Time to first SAME:
- Time to Submit:

### Quotes
参加者の言葉を要約せず、そのまま残す。

### Friction
- Confusing:
- Unnecessary:
- Missing:
- Wanted next:

## 7. Post-test questions

順番を固定する。

1. 「これは何をするサービスだと思いましたか？」
2. 「SAMEは何を意味すると思いましたか？」
3. 「自分ならどんなProblemを投稿しますか？」
4. 「一番気になったProblemはどれですか？」
5. 「Build Scoreは何の点数だと思いましたか？」
6. 「この後、そのProblemが実際に作られたら見たいですか？」
7. 「使うとしたら、どんな時に開きますか？」
8. 「いらないと思った機能はありますか？」

## 8. Decision rules

### CONTINUE
M1を満たし、M2/M3の両方が60%以上。
→ duplicate clustering / Problem Signalの次Prototypeへ。

### REDESIGN
M1は満たすが、M2またはM3が40%未満。
→ SAMEまたはSubmit導線を再設計。

### POSITIONING CHANGE
操作できるが「何のためのサービスか」が半数以上に伝わらない。
→ Home hero / copy / KIDPとの関係を修正。

### STOP / INTERNAL TOOL
Problem閲覧自体が弱く、M1が50%未満。
→ 公開サービス化を追わず、KIDP内部のProblem DBとして運用。

## 9. Things not to test yet

- 課金
- 市場規模
- 投資価値
- 広告モデル
- Enterprise利用
- コメント
- DM
- Solution Marketplace
- 本番AI精度
- 大規模検索
- SNS拡散

初回Testでこれらを聞かない。

## 10. After 5 participants

5人終了時点で一度集計する。

変更してよい:
- 文言
- SAMEの説明
- Homeの情報量
- Submit導線
- Build Score注記

変更しない:
- Core Loopそのもの

Core Loopを変更する場合は5人分を同一条件で完了してから判断する。

## 11. Output

Test終了後に作るもの:
- TEST_LOG.csv
- TEST_SUMMARY.md
- KIDP-002 Build / Redesign / Stop decision
- Article Bは新しい発見があった場合のみ作成

Article Bを「テストしました」という理由だけでは作らない。
