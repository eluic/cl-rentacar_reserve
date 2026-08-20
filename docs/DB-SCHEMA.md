# DB Schema — Rentacar Booking

## テーブル一覧（13テーブル）

すべてのテーブルには `wp_rc_` プレフィックスが付きます。

### 1. rc_vehicles（車両マスタ）
| カラム | 型 | 説明 |
|---|---|---|
| id | BIGINT UNSIGNED PK AI | |
| slug | VARCHAR(191) UNIQUE | URLスラッグ |
| name | VARCHAR(255) | 車両名 |
| description | LONGTEXT | 説明文 |
| thumbnail_id | BIGINT UNSIGNED | WPメディアID |
| base_price | INT | 基本料金（円/日） |
| stock | SMALLINT | 在庫台数 |
| status | VARCHAR(20) | published / private |
| sort_order | INT | 表示順 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 2. rc_vehicle_meta（車両メタデータ）
| カラム | 型 | 説明 |
|---|---|---|
| id | BIGINT UNSIGNED PK AI | |
| vehicle_id | BIGINT UNSIGNED | 車両ID |
| meta_key | VARCHAR(191) | キー（seats, transmission等） |
| meta_value | LONGTEXT | 値 |

### 3. rc_prices（料金設定）
| カラム | 型 | 説明 |
|---|---|---|
| id | BIGINT UNSIGNED PK AI | |
| vehicle_id | BIGINT UNSIGNED | 車両ID |
| price_type | VARCHAR(20) | base/daily/hourly/season/option |
| label | VARCHAR(255) | ラベル |
| date_from | DATE NULL | 期間開始 |
| date_to | DATE NULL | 期間終了 |
| amount | INT | 金額 |
| sort_order | INT | |

### 4. rc_options（追加オプション）
| カラム | 型 | 説明 |
|---|---|---|
| id | BIGINT UNSIGNED PK AI | |
| name | VARCHAR(255) | オプション名 |
| description | TEXT | 説明 |
| amount | INT | 金額 |
| unit | VARCHAR(20) | per_reservation / per_day |
| status | VARCHAR(20) | published / private |
| sort_order | INT | |

### 5. rc_slots（日別在庫）
| カラム | 型 | 説明 |
|---|---|---|
| id | BIGINT UNSIGNED PK AI | |
| vehicle_id | BIGINT UNSIGNED | |
| date | DATE | |
| capacity | SMALLINT | |
| UNIQUE(vehicle_id, date) | | |

### 6. rc_holidays（休業日）
| カラム | 型 | 説明 |
|---|---|---|
| id | BIGINT UNSIGNED PK AI | |
| date | DATE | |
| label | VARCHAR(255) | |
| vehicle_id | BIGINT UNSIGNED | 0=全車両共通 |

### 7. rc_reservations（予約）
| カラム | 型 | 説明 |
|---|---|---|
| id | BIGINT UNSIGNED PK AI | |
| reservation_code | VARCHAR(32) UNIQUE | RC-XXXXXXXX |
| vehicle_id | BIGINT UNSIGNED | |
| pickup_at | DATETIME | 貸出日時 |
| return_at | DATETIME | 返却日時 |
| status | VARCHAR(20) | pending/confirmed/cancelled/completed/no_show |
| payment_status | VARCHAR(30) | unpaid/paid/refunded |
| customer_name | VARCHAR(255) | |
| customer_kana | VARCHAR(255) | |
| customer_tel | VARCHAR(32) | |
| customer_email | VARCHAR(191) | |
| customer_zip | VARCHAR(16) | |
| customer_address | TEXT | |
| license_no | VARCHAR(64) | 免許証番号 |
| total_amount | INT | |
| note | TEXT | |
| raw_payload | LONGTEXT | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 8. rc_reservation_options
| カラム | 型 |
|---|---|
| id | BIGINT UNSIGNED PK AI |
| reservation_id | BIGINT UNSIGNED |
| option_id | BIGINT UNSIGNED |
| quantity | SMALLINT |
| amount | INT |
| created_at | DATETIME |

### 9. rc_payments
| カラム | 型 |
|---|---|
| id | BIGINT UNSIGNED PK AI |
| reservation_id | BIGINT UNSIGNED |
| gateway | VARCHAR(50) |
| transaction_id | VARCHAR(255) |
| amount | INT |
| status | VARCHAR(30) |
| created_at | DATETIME |
| updated_at | DATETIME |

### 10. rc_refunds
| カラム | 型 |
|---|---|
| id | BIGINT UNSIGNED PK AI |
| payment_id | BIGINT UNSIGNED |
| amount | INT |
| reason | TEXT |
| status | VARCHAR(30) |
| created_at | DATETIME |

### 11. rc_mail_templates
| カラム | 型 |
|---|---|
| id | BIGINT UNSIGNED PK AI |
| template_key | VARCHAR(100) UNIQUE |
| subject | VARCHAR(255) |
| body | LONGTEXT |
| to_type | VARCHAR(20) |
| enabled | TINYINT(1) |
| created_at | DATETIME |
| updated_at | DATETIME |

### 12. rc_mail_logs
| カラム | 型 |
|---|---|
| id | BIGINT UNSIGNED PK AI |
| reservation_id | BIGINT UNSIGNED |
| template_key | VARCHAR(100) |
| to_address | VARCHAR(191) |
| subject | VARCHAR(255) |
| body | LONGTEXT |
| status | VARCHAR(20) |
| retry_count | SMALLINT |
| sent_at | DATETIME |
| created_at | DATETIME |

### 13. rc_settings
| カラム | 型 |
|---|---|
| id | BIGINT UNSIGNED PK AI |
| setting_key | VARCHAR(191) UNIQUE |
| setting_value | LONGTEXT |
| updated_at | DATETIME |
