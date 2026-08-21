<?php
/**
 * Plugin activator — creates tables and seeds data.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Activator {

    /**
     * Run on activation.
     */
    public static function activate() {
        self::create_tables();
        self::seed_settings();
        self::seed_mail_templates();
        update_option( RC_OPT_DB_VERSION, RC_DB_VERSION );
        // Schedule cron events
        if ( ! wp_next_scheduled( RC_CRON_HOOK_RETRY_MAIL ) ) {
            wp_schedule_event( time(), 'hourly', RC_CRON_HOOK_RETRY_MAIL );
        }
        if ( ! wp_next_scheduled( RC_CRON_HOOK_REMINDER ) ) {
            wp_schedule_event( time(), 'daily', RC_CRON_HOOK_REMINDER );
        }
        flush_rewrite_rules();
    }

    /**
     * Create all 13 tables via dbDelta.
     */
    public static function create_tables() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $tables = array();

        // 1. rc_vehicles
        $t = rc_table( 'vehicles' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            slug VARCHAR(191) NOT NULL DEFAULT '',
            name VARCHAR(255) NOT NULL DEFAULT '',
            description LONGTEXT,
            thumbnail_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            base_price INT NOT NULL DEFAULT 0,
            stock SMALLINT NOT NULL DEFAULT 1,
            status VARCHAR(20) NOT NULL DEFAULT 'published',
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            UNIQUE KEY slug (slug)
        ) {$charset};";

        // 2. rc_vehicle_meta
        $t = rc_table( 'vehicle_meta' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            vehicle_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            meta_key VARCHAR(191) NOT NULL DEFAULT '',
            meta_value LONGTEXT,
            PRIMARY KEY (id),
            KEY vehicle_meta_key (vehicle_id, meta_key)
        ) {$charset};";

        // 3. rc_prices
        $t = rc_table( 'prices' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            vehicle_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            price_type VARCHAR(20) NOT NULL DEFAULT 'base',
            label VARCHAR(255) NOT NULL DEFAULT '',
            date_from DATE DEFAULT NULL,
            date_to DATE DEFAULT NULL,
            amount INT NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            KEY price_vehicle (vehicle_id)
        ) {$charset};";

        // 4. rc_options
        $t = rc_table( 'options' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL DEFAULT '',
            description TEXT,
            amount INT NOT NULL DEFAULT 0,
            unit VARCHAR(20) NOT NULL DEFAULT 'per_reservation',
            status VARCHAR(20) NOT NULL DEFAULT 'published',
            sort_order INT NOT NULL DEFAULT 0,
            PRIMARY KEY (id)
        ) {$charset};";

        // 5. rc_slots
        $t = rc_table( 'slots' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            vehicle_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            date DATE NOT NULL,
            capacity SMALLINT NOT NULL DEFAULT 1,
            PRIMARY KEY (id),
            UNIQUE KEY slot_vehicle_date (vehicle_id, date)
        ) {$charset};";

        // 6. rc_holidays
        $t = rc_table( 'holidays' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            date DATE NOT NULL,
            label VARCHAR(255) NOT NULL DEFAULT '',
            vehicle_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            KEY holiday_date (date)
        ) {$charset};";

        // 7. rc_reservations
        $t = rc_table( 'reservations' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            reservation_code VARCHAR(32) NOT NULL DEFAULT '',
            vehicle_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            pickup_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            return_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
            customer_name VARCHAR(255) NOT NULL DEFAULT '',
            customer_kana VARCHAR(255) NOT NULL DEFAULT '',
            customer_tel VARCHAR(32) NOT NULL DEFAULT '',
            customer_email VARCHAR(191) NOT NULL DEFAULT '',
            customer_zip VARCHAR(16) NOT NULL DEFAULT '',
            customer_address TEXT,
            license_no VARCHAR(64) NOT NULL DEFAULT '',
            total_amount INT NOT NULL DEFAULT 0,
            note TEXT,
            raw_payload LONGTEXT,
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            UNIQUE KEY reservation_code (reservation_code),
            KEY res_vehicle_pickup (vehicle_id, pickup_at),
            KEY res_status (status),
            KEY res_payment (payment_status)
        ) {$charset};";

        // 8. rc_reservation_options
        $t = rc_table( 'reservation_options' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            reservation_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            option_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            quantity SMALLINT NOT NULL DEFAULT 1,
            amount INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            KEY resopt_reservation (reservation_id)
        ) {$charset};";

        // 9. rc_payments
        $t = rc_table( 'payments' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            reservation_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            gateway VARCHAR(50) NOT NULL DEFAULT '',
            transaction_id VARCHAR(255) NOT NULL DEFAULT '',
            amount INT NOT NULL DEFAULT 0,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            KEY pay_reservation (reservation_id)
        ) {$charset};";

        // 10. rc_refunds
        $t = rc_table( 'refunds' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            payment_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            amount INT NOT NULL DEFAULT 0,
            reason TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            KEY refund_payment (payment_id)
        ) {$charset};";

        // 11. rc_mail_templates
        $t = rc_table( 'mail_templates' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            template_key VARCHAR(100) NOT NULL DEFAULT '',
            subject VARCHAR(255) NOT NULL DEFAULT '',
            body LONGTEXT,
            to_type VARCHAR(20) NOT NULL DEFAULT 'applicant',
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            UNIQUE KEY tpl_key (template_key)
        ) {$charset};";

        // 12. rc_mail_logs
        $t = rc_table( 'mail_logs' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            reservation_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            template_key VARCHAR(100) NOT NULL DEFAULT '',
            to_address VARCHAR(191) NOT NULL DEFAULT '',
            subject VARCHAR(255) NOT NULL DEFAULT '',
            body LONGTEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            retry_count SMALLINT NOT NULL DEFAULT 0,
            sent_at DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            KEY log_reservation (reservation_id),
            KEY log_status (status)
        ) {$charset};";

        // 13. rc_vehicle_blocks
        $t = rc_table( 'vehicle_blocks' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            vehicle_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
            date_from DATE NOT NULL,
            date_to DATE NOT NULL,
            reason VARCHAR(255) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            KEY block_vehicle (vehicle_id),
            KEY block_dates (date_from, date_to)
        ) {$charset};";

        // 14. rc_settings
        $t = rc_table( 'settings' );
        $tables[] = "CREATE TABLE {$t} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            setting_key VARCHAR(191) NOT NULL DEFAULT '',
            setting_value LONGTEXT,
            updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
            PRIMARY KEY (id),
            UNIQUE KEY setting_key (setting_key)
        ) {$charset};";

        foreach ( $tables as $sql ) {
            dbDelta( $sql );
        }
    }

    /**
     * Seed default settings.
     */
    private static function seed_settings() {
        $defaults = array(
            'store_name'             => 'CLレンタカー',
            'store_tel'              => '',
            'store_email'            => get_option( 'admin_email' ),
            'store_address'          => '',
            'cancel_page_id'         => 0,
            'recaptcha_site_key'     => '',
            'recaptcha_secret_key'   => '',
            'recaptcha_score'        => '0.5',
            'square_application_id'  => '',
            'square_access_token'    => '',
            'square_location_id'     => '',
            'square_sandbox_mode'    => '1',
            'square_webhook_sig_key' => '',
            'payment_onsite_enabled' => '1',
            'payment_square_enabled' => '0',
            'rate_limit_per_minute'  => '10',
            'business_hours_start'   => '08:00',
            'business_hours_end'     => '20:00',
        );

        foreach ( $defaults as $key => $value ) {
            $existing = rc_get_setting( $key, null );
            if ( null === $existing ) {
                rc_update_setting( $key, $value );
            }
        }
    }

    /**
     * Seed default mail templates.
     */
    private static function seed_mail_templates() {
        global $wpdb;
        $table = rc_table( 'mail_templates' );
        $now   = rc_now();

        $templates = array(
            array(
                'template_key' => RC_MAIL_APPLICANT_CREATED,
                'subject'      => '【{store_name}】ご予約を受け付けました（{reservation_code}）',
                'body'         => "{customer_name} 様\n\nこの度はご予約いただき誠にありがとうございます。\n以下の内容でご予約を承りました。\n\n━━━━━━━━━━━━━━━━━━\n予約番号：{reservation_code}\n車両：{vehicle_name}\n貸出日時：{pickup_at}\n返却日時：{return_at}\n合計金額：{total_amount}\n━━━━━━━━━━━━━━━━━━\n\nキャンセルをご希望の場合は以下のURLからお手続きください。\n{cancel_url}\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n{store_name}\nTEL: {store_tel}\nEmail: {store_email}\n{site_url}",
                'to_type'      => 'applicant',
            ),
            array(
                'template_key' => RC_MAIL_ADMIN_CREATED,
                'subject'      => '【新規予約】{customer_name} 様（{reservation_code}）',
                'body'         => "新しい予約が入りました。\n\n予約番号：{reservation_code}\nお客様名：{customer_name}\n車両：{vehicle_name}\n貸出日時：{pickup_at}\n返却日時：{return_at}\n合計金額：{total_amount}\n\n管理画面で詳細をご確認ください。",
                'to_type'      => 'admin',
            ),
            array(
                'template_key' => RC_MAIL_APPLICANT_PAID,
                'subject'      => '【{store_name}】お支払い完了のお知らせ（{reservation_code}）',
                'body'         => "{customer_name} 様\n\nお支払いが完了しました。\n\n予約番号：{reservation_code}\n合計金額：{total_amount}\n\nご利用当日をお待ちしております。\n\n{store_name}",
                'to_type'      => 'applicant',
            ),
            array(
                'template_key' => RC_MAIL_APPLICANT_REFUNDED,
                'subject'      => '【{store_name}】返金処理完了のお知らせ（{reservation_code}）',
                'body'         => "{customer_name} 様\n\nご返金手続きが完了しました。\n\n予約番号：{reservation_code}\n\n返金の反映までにお時間をいただく場合がございます。\n\n{store_name}",
                'to_type'      => 'applicant',
            ),
            array(
                'template_key' => RC_MAIL_APPLICANT_CANCELLED,
                'subject'      => '【{store_name}】キャンセル完了のお知らせ（{reservation_code}）',
                'body'         => "{customer_name} 様\n\nご予約のキャンセルが完了しました。\n\n予約番号：{reservation_code}\n車両：{vehicle_name}\n貸出日時：{pickup_at}\n返却日時：{return_at}\n\nまたのご利用をお待ちしております。\n\n{store_name}",
                'to_type'      => 'applicant',
            ),
            array(
                'template_key' => RC_MAIL_ADMIN_CANCELLED,
                'subject'      => '【キャンセル通知】{customer_name} 様（{reservation_code}）',
                'body'         => "予約がキャンセルされました。\n\n予約番号：{reservation_code}\nお客様名：{customer_name}\n車両：{vehicle_name}\n貸出日時：{pickup_at}\n返却日時：{return_at}",
                'to_type'      => 'admin',
            ),
            array(
                'template_key' => RC_MAIL_REMINDER,
                'subject'      => '【{store_name}】明日のご予約リマインダー（{reservation_code}）',
                'body'         => "{customer_name} 様\n\n明日のご予約のリマインダーです。\n\n予約番号：{reservation_code}\n車両：{vehicle_name}\n貸出日時：{pickup_at}\n返却日時：{return_at}\n\nお気をつけてお越しください。\n\n{store_name}\nTEL: {store_tel}",
                'to_type'      => 'applicant',
            ),
        );

        foreach ( $templates as $tpl ) {
            $exists = $wpdb->get_var(
                $wpdb->prepare( "SELECT id FROM {$table} WHERE template_key = %s LIMIT 1", $tpl['template_key'] )
            );
            if ( ! $exists ) {
                $wpdb->insert( $table, array_merge( $tpl, array(
                    'enabled'    => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ) ) );
            }
        }
    }
}
