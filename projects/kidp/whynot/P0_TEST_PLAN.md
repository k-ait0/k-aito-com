# KIDP-002 WHYNOT — P0 User Test Plan

Status: TEST PREPARED / NOT YET RUN
Prototype: Problem browse → SAME → Submit Problem

## Test question

説明なしでユーザーが、
1. 3件以上のProblemを見る
2. 「私にもある」ProblemへSAMEする
3. 自分のProblemも投稿したくなる
かを確認する。

## Participants

初回5〜10人。専門知識は不要。

## Start script

「日常の“これ面倒”を集める試作品です。自由に見て、気になったものを触ってください。」

SAMEの意味、投稿導線、Build Queueは先に説明しない。

## Metrics

### M1 — Browse depth
3件以上の異なるProblem detailを見る。
Target: 70%以上

### M2 — SAME action
1回以上SAMEを押す。
Target: 60%以上

SAMEはLikeではなく「私にもこのProblemがある」の意思表示。

### M3 — Submit activation
以下のいずれか:
- 投稿フォームに5文字以上入力
- Post-testで「自分のProblemも投稿したい」YES

Target: 60%以上

### M4 — Problem-first understanding
「Solutionを先に投稿する場所ではなく、Problemを先に集める仕組み」と理解する。
Target: 80%以上

### M5 — SAME Like misread
SAMEをLike / 面白い投票 / 人気投票だと思う。
Failure threshold: 30%以上

## Automatically recorded

- unique Problem details viewed
- SAME click count
- Submit page opened
- draft character count
- Structure demo clicked
- Explore page opened
- Build page opened
- final page

## Tester records

- Problem-first understanding
- Submit intent
- SAME Like misread
- first quote
- confusing points
- missing elements

## Decision precedence

MORE DATA → STOP → POSITIONING REDESIGN → SAME REDESIGN → DISCOVERY REDESIGN → SUBMIT REDESIGN → P1 GO → HOLD

### MORE DATA
Participants < 5

### STOP
M1 < 40% AND M3 < 40%

### POSITIONING REDESIGN
M4 < 80%

### SAME REDESIGN
M2 < 60% OR M5 >= 30%

### DISCOVERY REDESIGN
M1 < 70%

### SUBMIT REDESIGN
M3 < 60%

### P1 GO
M1 >= 70%
M2 >= 60%
M3 >= 60%
M4 >= 80%
M5 < 30%

## P1 gate

GOなら:
- SAME aggregate visualization
- Problem Signal
- Submit persistence
- richer Problem structuring
- Build Queue connection

まだ追加しない:
- comments
- user solution marketplace
- public ranking as market validation
- AI-generated market proof

## Instrumented test mode

`/projects/kidp/whynot/prototype/?test=1&pid=P01`

Change P01 for each participant.

No test data is transmitted externally.
