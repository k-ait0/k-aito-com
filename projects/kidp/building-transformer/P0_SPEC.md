# KIDP-006 空きビル変身シミュレーター — P0 Specification

Status: PROTOTYPE P0
Build Score: 86 / 100
Scope: Building conditions → candidate uses → conversion friction → adaptation path

## Problem

空きビル・空きフロア活用では、
「何をやりたいか」から物件を見ると、
後から給排水・動線・天井高・エレベーター・前面性などの制約にぶつかりやすい。

逆に、
物件条件から先に見て
「どの用途なら無理が少ないか」を比較できれば、
初期検討を速くできる可能性がある。

## P0 hypothesis

架空の空きフロア条件を少し変えると、
用途ごとの Conversion Friction がどう変わるかを可視化することで、
ユーザーは「この物件で何ができそうか」をより構造的に考えられるのではないか。

## Important

Conversion Friction は
- 事業収益性
- 投資利回り
- 法令適合
- 建築確認
- 用途変更可否
- 消防適合
- 工事費
- 融資可否

を判定しない。

P0は初期アイデア比較用の架空モデル。

## Candidate uses

### WORK HUB
Cowork / shared office style.
Needs:
- station access
- elevator
- moderate floor area
- basic plumbing

### MID-STAY
Medium-stay rooms / residence-like use.
Needs:
- stronger plumbing
- vertical circulation
- quieter environment
- subdivision potential

Regulatory review is required in reality.

### FITNESS
Small gym / training studio.
Needs:
- ceiling height
- access
- open floor
- noise/load review

Structural load and acoustic performance are not modeled in P0.

### CREATIVE STUDIO
Photo / craft / workshop / classroom style.
Needs:
- ceiling
- open floor
- moderate access
- less plumbing dependency

## Inputs

- Floor area: 180–650 sqm
- Plumbing readiness: LOW / MID / HIGH
- Street frontage: LOW / MID / HIGH
- Elevator: 0 / 1 / 2+
- Ceiling height: 2.4–3.5 m
- Station walk: 3–15 min
- Quietness: LOW / MID / HIGH

## Conversion Friction

0–100, lower is easier in this synthetic P0.

Components:
- access mismatch
- plumbing mismatch
- vertical circulation mismatch
- floorplate mismatch
- ceiling mismatch
- frontage / quietness mismatch

The score is explanatory, not authoritative.

## Presets

### OFFICE SHELL
420 sqm / plumbing LOW / frontage MID / elevator 1 / 2.6m / station 7m / quiet MID

### STREET FLOOR
280 sqm / plumbing MID / frontage HIGH / elevator 0 / 3.2m / station 5m / quiet LOW

### UPPER FLOOR
520 sqm / plumbing LOW / frontage LOW / elevator 2 / 2.8m / station 10m / quiet HIGH

## P0 screens

1. Landing
2. Building condition editor
3. Candidate use ranking
4. Adaptation detail

## P0 success

M1: 80%以上が「収益性ランキングではない」と理解する
M2: 70%以上が条件変更で候補順位が変わる理由を説明できる
M3: 60%以上が空き物件の初期検討で使いたい
M4: 法令適合・工事費の確定判定だと誤解する人 30%未満
M5: 70%以上が現地確認すべき未知条件を1つ挙げられる

## P1 gate

P0 GOなら:
- actual building input schema
- zoning / use-change checklist layer
- rough capex ranges
- rent/revenue scenarios separated from conversion fit
- real property case import
- reusable template across buildings

P0で作らない:
- real property underwriting
- legal compliance verdict
- construction cost estimate
- loan eligibility
- ROI / IRR
- real estate recommendation
