# REST API — Rentacar Booking

Base: `/wp-json/rentacar/v1`

## Public Endpoints

### Vehicles
| Method | Path | Description |
|--------|------|-------------|
| GET | `/vehicles` | 公開車両一覧 |
| GET | `/vehicles/{id}` | 車両詳細 |

### Availability
| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | `/availability` | `vehicle_id`, `month` (YYYY-MM) | 月別空き状況 |

### Reservations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/reservations` | 予約作成 |
| POST | `/reservations/calculate` | 料金計算 |

### Options
| Method | Path | Description |
|--------|------|-------------|
| GET | `/options` | 追加オプション一覧 |

### Cancel
| Method | Path | Description |
|--------|------|-------------|
| POST | `/cancel/lookup` | 予約検索（マスク表示） |
| POST | `/cancel` | キャンセル実行 |

### Payment Config
| Method | Path | Description |
|--------|------|-------------|
| GET | `/payment-config` | 決済設定 |

### Square Webhook
| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/square` | Square Webhook受信 |

## Admin Endpoints

**認証**: `current_user_can('manage_options')` + WP REST nonce

### Admin Vehicles
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/vehicles` | 車両一覧 |
| POST | `/admin/vehicles` | 車両作成 |
| GET | `/admin/vehicles/{id}` | 車両詳細 |
| PUT | `/admin/vehicles/{id}` | 車両更新 |
| DELETE | `/admin/vehicles/{id}` | 車両削除 |

### Admin Reservations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/reservations` | 予約一覧（フィルタ付き） |
| GET | `/admin/reservations/{id}` | 予約詳細 |
| PUT | `/admin/reservations/{id}` | 予約更新 |
| GET | `/admin/reservations/dashboard` | ダッシュボードデータ |

### Admin Prices / Options / Slots / Holidays
CRUD エンドポイント（上記と同様のパターン）

### Admin Payments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/payments` | 決済一覧 |
| POST | `/admin/payments/{id}/refund` | 返金実行 |

### Admin Mail Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/mail-templates` | テンプレート一覧 |
| GET | `/admin/mail-templates/{id}` | テンプレート詳細 |
| PUT | `/admin/mail-templates/{id}` | テンプレート更新 |

### Admin Mail Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/mail-logs` | ログ一覧 |
| POST | `/admin/mail-logs/{id}/resend` | 再送信 |

### Admin Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/settings` | 設定取得 |
| POST | `/admin/settings` | 設定保存 |
| POST | `/admin/settings/test-mail` | テストメール送信 |
| GET | `/admin/settings/system` | システム情報 |
