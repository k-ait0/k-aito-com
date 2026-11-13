# K. Aito Analytics｜年金終了月の両エンジン整合 v0.23

**2026-11-13 JST｜研究ブランチ限定／公開・税引後試算・投資判断には未承認**

## 実際の不整合

市場データ取得担当が2026-11-13に記録した `docs/ANALYTICS_CROSS_ENGINE_DISCREPANCY_AUDIT_20261113.md` の D05 では、旧 `rolling-lifecycle.cjs` と `rolling-portfolio-lifecycle.cjs` の `end_offset_months` が終了月を含む一方、Personal研究ブリッジは半開区間 `[start,end)` を使うと指摘された。両スキーマを単なる名称の違いとして扱ってはならない。

## 今回の実変更

- `lib/analytics/rolling-lifecycle.cjs` と `lib/analytics/rolling-portfolio-lifecycle.cjs` に明示的な `end_offset_exclusive` を追加。
- 旧 `end_offset_months` の意味（終了月を含む）は**変更しない**。旧データへの非互換な黙変換を禁止。
- 新 `end_offset_exclusive` は終了月を含まない。例：開始オフセット1、終了exclusive2ならオフセット1の1か月だけ支給。
- 終了の省略時は従来どおり試算期間の最後まで支給。
- 両終了指定を同時に入れた入力、ゼロか月期間、終了オフセットの期間外・不正値は**拒否**。
- `end_offset_exclusive == horizon_months` は有効。旧inclusiveは `end_offset_months == horizon_months` を拒否する。
- 旧単一資産と複数資産で、月初キャッシュフロー→騰落の同じ前提条件の下、金額・期間を照合した。

| 4か月・初期1000円・月支出25円・年金月額100円、オフセット1開始|年金の支給月|期末額（騰落0）|
|---|---|---:|
| `end_offset_months:2`（legacy inclusive）|1, 2|1,100円|
| `end_offset_exclusive:2`（明示的半開区間）|1|1,000円|
| 終了指定なし|1, 2, 3|1,200円|

**注意：** 単一資産／複数資産の金額が一致するのは同じ月初処理・同じ資産配分・整数円丸め等の条件下。研究全体に残るD01（月末払い）、D03（相殺表示）、D04（支出優先）、D06（CPI参照時点）、D07（丸め）、D12（税ロット）、D14（暦日・年齢への変換）等が解消されたことは意味しない。

## テスト結果とデータへの影響

```sh
node --test scripts/test-analytics-pension-exclusive-contract-v023.cjs
node --test scripts/test-analytics-*.cjs
```

- v0.22 既存637件を再実行し全件PASS。
- 今回18件の契約テストを追加、全回帰 **655/655 PASS**（Node.js 22.16.0）。
- 人生イベントは合成試験のみ。実市場データQA・円建て運用評価は実施していない。
- コードのユーザー画面への接続、Personalブリッジの内部変更は行っていない。
- `main`・本番・DWZ PR #70・取得元のデータ台帳、暗号化原本を変更しない。

## 次の重要作業

1. 公的原本の月次バイトは、この実行コンテナでは DNS の名前解決失敗で直接取得できず、過去に封印した暗号化原本は秘密鍵なしでは復号できない。正本SHAを変更して近似値を通さない。
2. 現在のユーザー側保全ZIP5件を所有PCに確実に保存し、元のRSA秘密鍵を別に管理。GitHub Actionsの元Artifactは2026年11月18日頃に期限切れとなる。
3. ローカルの `v0.18 → v0.11 → v0.12 → v0.10` の復元／ハッシュ照合経路と、旧Shiller原本の未確保問題を解消する。
4. シミュレーター画面統合時には、旧inclusive入力はスキーマバージョンを表示して読み込み、新exclusive入力に一律置換しない。
