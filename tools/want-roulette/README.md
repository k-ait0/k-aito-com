# やりたいことルーレット v0.5（公開ベータ）

LIFE DESIGN LAB「やりたいこと発見スワイプ」の初稿200件を利用した公開ベータです。**カード内容は編集レビュー中であり、正式版ではありません。**

公開URL: https://k-aito.com/tools/want-roulette/

## 現在の位置づけ

この試作は、単なる「今日やること決め」ではなく、次の流れを検証するためのプロトタイプです。

1. 発見する: 直感で「やりたいこと」を選ぶ
2. マイリスト: 候補を整理する
3. ルーレット: 今の目的に合う候補を抽選する
4. 最初の一歩: action_typeごとのfirstStepを表示する
5. 進捗記録: 一歩進めた履歴を残す
6. 完了: 明示的に完了したものだけ抽選から外す

## 実装済み

- 発見する: カードの左右スワイプ、入れる／見送る、回答の取り消し、カテゴリ絞り込み
- マイリスト: 自由追加、検索、抽選ON/OFF、完了切り替え、削除、最近の一歩の履歴表示
- ルーレット: 抽選対象から1件を選択、再抽選、候補除外、目的別モード
- 目的別モード: すべてから選ぶ／今日できる／準備から始める／目標を一歩進める／習慣を続ける／人との関係を育てる
- 結果表示: action_typeバッジ、firstStep、「まずはここから」表示、タイプ別CTA
- 進捗: progressEventsに一歩の記録を保存。GOAL/HABIT/REL等は一度押しても完了扱いにしない
- 保存: ブラウザの localStorage、自動保存、JSONエクスポート／インポート
- 互換性: 旧version 1の保存データをversion 2へ自動正規化
- PWA: このディレクトリに限定した service worker と manifest
- スマホUI: stickyタブ、44px以上の主要操作、抽選結果ボタンのモバイル配置

## 状態モデル

localStorageキーは既存互換性を優先して `kaito.wants.roulette.v1` のまま維持しています。中身のstateはversion 2です。

主なstate:

- `answers`: 初稿カードへの興味回答。`yes` / `no`
- `custom`: 自由追加カード
- `excluded`: 抽選OFFの候補
- `done`: 明示的に完了した候補
- `progressEvents`: 一歩進めた履歴。`{ cardId, action, actionType, at }`
- `rouletteMode`: `ALL` / `TODAY` / `PREP` / `GOAL` / `HABIT` / `REL`
- `history`: 抽選履歴

重要: `progressEvents` と `done` は分離しています。長期目標や習慣は、一歩記録を複数回残せます。候補を抽選から外すかどうかは、完了操作と「完了済みはルーレットから外す」の設定で決まります。

## 公開・自動検証の記録

2026-09-28 JST時点で GitHub main `1a9993c0f88813ddfca9200eb978847f26dc39a8` に対して次を確認済み。

- 本番ファイル照合: XServerで公開ファイルがGitHub mainと一致
- Chromiumのモバイル相当・デスクトップ相当のブラウザ検証: 成功
- 専用操作検証: スワイプ、入れる、リストへの反映、自由追加、リロード後の保存復元、抽選結果、firstStep表示、action_type表示、progressEvents記録、目的別モード切替、モード変更時の古い結果リセット、スマホstickyタブ、JavaScript／アセットエラーなし
- GitHub Actions: [本番配信検証](https://github.com/k-ait0/k-aito-com/actions/runs/36397792765)、[ブラウザ検証](https://github.com/k-ait0/k-aito-com/actions/runs/36397792785)

これらは**iPhone Safari実機テストやカードの編集レビューの完了を意味しません**。

## カード内容のレビュー

- [機械的な一次点検](./CARD_AUDIT.md)
- [意味・粒度・カテゴリ境界レビュー 001](./EDITORIAL_REVIEW_001.md)
- [実行タイプ・「最初の一歩」仕様 001](./ACTION_MODEL_SPEC_001.md)
- [全200件の暫定action_type/time_horizon台帳](./card-action-metadata.v1.json) — NOW 24 / PREP 57 / GOAL 77 / HABIT 27 / REL 15
- [全200件のfirstStep付き台帳 v2](./card-action-metadata.v2.json) — 200/200件に「最初の一歩」を付与。構造検証用の編集ドラフト
- [個別化firstStep台帳 v3](./card-action-metadata.v3.json) — 200/200件で固有の「最初の一歩」を設定した編集ドラフト

本文・IDの改訂案は未適用です。既存の保存済み回答を守るため、MASTER_005を正本として確認後に反映します。

## 正式版へ向けた未完了項目

- [ ] iPhone Safariでカードスワイプ、縦スクロール、画面回転、抽選アニメーションを確認
- [ ] iPad Safariでタッチ操作、画面幅、リロード後の保存復元を確認
- [ ] 初稿200件の重複、カテゴリ、表現、粒度をMASTER_005と照合
- [ ] カードマスターの更新手順、ID維持・廃止・alias方針を確定
- [ ] progressEventsを集計した「進捗ダッシュボード」や「最近進めたこと」画面を検討
- [ ] バックアップ／インポートのユーザー向け説明を確認
- [ ] 正式公開時の導線、検索登録の要否、プライバシー説明を決定

## 注意

入力データは利用中のブラウザの localStorage に保存されます。端末間の自動同期はありません。ブラウザデータの削除、プライベートブラウズ、オリジン変更などで利用できなくなる可能性があるため、JSON出力によるバックアップを案内してください。異なるオリジンで使用した v0.3 の保存データは自動移行されません。

このディレクトリ内だけで動作し、共通サイトのJavaScript/CSSを読み込みません。現在は検索エンジン除外（noindex,nofollow）です。service worker はこのディレクトリのみを対象とし、他アプリのキャッシュは削除しません。
