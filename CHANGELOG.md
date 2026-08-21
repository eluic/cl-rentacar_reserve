# Changelog — Rentacar Booking

## [1.1.0] - 2026-08-21

### 変更内容

#### 管理画面の構造変更
- **削除**: 決済管理ページ（現地決済のみのため不要）
- **削除**: 料金プランページ（車両管理に統合）
- **削除**: 在庫カレンダーページ（在庫は車両の stock フィールドで管理）
- **削除**: 予約一覧・詳細の決済ステータス表示
- メニュー項目を 12 → 9 に整理

#### 車両管理の強化
- **期間別料金設定を車両編集モーダルに統合**: 車両ごとに期間別日額料金を直接設定可能
  - 新規追加 (POST /admin/vehicles/{id}/prices)
  - インライン編集 (PUT /admin/vehicles/{vid}/prices/{id})
  - 削除 (DELETE /admin/vehicles/{vid}/prices/{id})
- **メンテナンスブロック機能を追加**: 車検・修理・点検期間中の予約を自動ブロック
  - ブロック一覧 (GET /admin/vehicles/{id}/blocks)
  - ブロック追加 (POST /admin/vehicles/{id}/blocks)
  - ブロック解除 (DELETE /admin/vehicles/{vid}/blocks/{id})
  - 予約カレンダーにブロック状態を反映

#### データベース
- `rc_vehicle_blocks` テーブルを追加（vehicle_id, date_from, date_to, reason）
- DB バージョン: 1.0.0 → 1.1.0（自動マイグレーション対応）

#### 新規ファイル
- `includes/models/class-rc-model-vehicle-block.php`
- `includes/rest/admin/class-rc-rest-admin-vehicle-prices.php`
- `includes/rest/admin/class-rc-rest-admin-vehicle-blocks.php`

#### 削除ファイル
- `admin/views/payments.php`
- `admin/views/prices.php`
- `admin/views/slots.php`

---

## [1.0.0] - 2026-08-20

### 構築内容

#### Phase 1: 基盤
- メインプラグインファイル (`rentacar-booking.php`)
- 定数定義 (`rc-constants.php`) — 全プレフィックス RC_ / rc_ / rc_opt_
- ヘルパー関数 (`rc-helpers.php`) — テーブル名生成、価格フォーマット、暗号化/復号
- Activator — 13テーブル dbDelta 作成、デフォルト設定・メールテンプレート シード
- Deactivator — Cronジョブ解除
- Migration — バージョンベースのDB自動マイグレーション
- Logger — error_log ベースのロギング
- Security — reCAPTCHA v3 検証、IPベースレート制限
- Assets — ショートコード検出付きCSS/JS enqueue (Flatpickr CDN)
- Shortcode — `[rentacar_booking]` / `[rentacar_cancel]` 登録
- REST Hub — ルート登録の集約
- Plugin クラス — Singleton パターン、コンポーネント初期化

#### Phase 2: モデル
- RC_Model_Vehicle — 車両CRUD + メタデータKV
- RC_Model_Reservation — 予約CRUD + コード生成 + 空き検索
- RC_Model_Slot — 日別在庫 + 空き状況計算
- RC_Model_Price — 料金計算（基本/日額/季節）
- RC_Model_Option — オプションCRUD + 料金計算
- RC_Model_Payment — 決済レコードCRUD
- RC_Model_Refund — 返金レコードCRUD
- RC_Model_Mail_Template — メールテンプレートCRUD
- RC_Model_Mail_Log — メールログ + 再送信

#### Phase 3: REST API
- Public: vehicles, availability, reservations, cancel, options, payment-config
- Public: Square webhook (署名検証付き)
- Admin: 10エンドポイント（vehicles, prices, options, slots, holidays, reservations, payments, mail-templates, mail-logs, settings）

#### Phase 4: 予約フォーム
- 6ステップUI（車両選択 → 日時 → オプション → 顧客情報 → 確認 → 完了）
- Flatpickr日本語カレンダー（空き状況カラー表示）
- レスポンシブデザイン（CLレンタカーテーマカラー: ターコイズ/シアン）

#### Phase 5: 決済
- Payment Gateway インターフェース
- 現地決済ゲートウェイ
- Square カード決済ゲートウェイ
- Square Webhook ハンドラ（署名検証）
- Payment Manager（ゲートウェイレジストリ）

#### Phase 6: 管理画面
- 12サブメニュー（ダッシュボード〜システム情報）
- SPA風管理画面（jQuery + REST API）
- 車両CRUD（モーダル編集）
- 予約一覧（検索・フィルタ・ステータス変更）
- ダッシュボード（今日の貸出/返却、月間売上）

#### Phase 7: メール
- wp_mail() + phpmailer_init フックでFrom設定
- 7テンプレート（DB保存、管理画面から編集可能）
- 送信ログ + WP-Cron最大3回リトライ
- リマインダー（前日自動送信）

#### Phase 8: キャンセル
- 3ステップキャンセルフォーム
- 予約番号 + メール一致で本人確認
- メールマスク表示
- URLパラメータからの自動入力

#### Phase 9: セキュリティ
- reCAPTCHA v3（スコア閾値設定可能）
- IPベースレート制限（WordPress transient使用）
- 全入力サニタイズ
- Square Access Token AES-256-CBC暗号化
- Admin REST 権限チェック

#### Phase 10: 仕上げ
- uninstall.php（完全データ削除）
- readme.txt（WordPress.org形式）
- DB-SCHEMA.md / API.md ドキュメント
- README-DEPLOY.md / README-PAGES.md デプロイ手順
