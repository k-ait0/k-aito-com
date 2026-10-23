# 2026-10-23 本番リリース記録

## 承認と対象
ユーザーから公開可能な変更をすべて本番に反映する指示を受領。
- #54: 記事索引をローカル生成・同一PR管理へ変更、23HTMLの検索JSキャッシュ参照を同期。merge `5798cc0`。
- #11: LIFE DESIGN LABのnoindexテストコンソールと追加計測。merge `c8d9531`。
- #33: MONO BASE v3.4の8コンテンツページ・原本13JPEG・3D CAD展示を公開。独立ビューアはnoindex。merge `db4aece`。

## 検証
KAITO preflight 12/12、MONO BASE QA 11/11、原本JPEGハッシュ13/13、既存ブラウザQA 2142 assertions成功。最終MONO BASEの8ページ・画像・indexingと3D操作は1440/390/320pxで成功。テストコンソールも3幅でリンク・集計・保存・クリアを検証。

## 配備状態
#54と#11に対応する公開配信を確認した一方、#33の公開確認Actions `39882887416` はMONO BASEの404とPROJECTS/サイトマップ不一致で失敗。これをコードQA失敗と混同しない。最新mainの再配備を促すため、この記録を追記する。公開完了とはまだ判定しない。

## 退避
リリース前main `be7a777e8d16ee0eeb08fd9ad5cf69ec5e851b88` は `backup/before-production-release-20261023` に保存。既存本番設定や.htaccess、追加課金設定は変更していない。

実機Safariは未検証。本番バイト照合と本番操作確認は配備後の別ゲートとして残す。
