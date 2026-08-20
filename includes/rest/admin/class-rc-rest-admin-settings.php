<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Settings {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/settings', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ),  'permission_callback' => $ac ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'save' ),   'permission_callback' => $ac ),
        ));
        register_rest_route( $ns, '/admin/settings/test-mail', array(
            'methods' => 'POST', 'callback' => array( $this, 'test_mail' ), 'permission_callback' => $ac,
        ));
        register_rest_route( $ns, '/admin/settings/system', array(
            'methods' => 'GET', 'callback' => array( $this, 'system_info' ), 'permission_callback' => $ac,
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        $keys = array(
            'store_name','store_tel','store_email','store_address','cancel_page_id',
            'recaptcha_site_key','recaptcha_secret_key','recaptcha_score',
            'square_application_id','square_location_id','square_sandbox_mode',
            'payment_onsite_enabled','payment_square_enabled',
            'rate_limit_per_minute','business_hours_start','business_hours_end',
        );
        $settings = array();
        foreach ( $keys as $k ) {
            $settings[$k] = rc_get_setting( $k, '' );
        }
        // Sensitive fields: don't expose actual values
        $settings['square_access_token_set']    = !empty( rc_get_setting('square_access_token') );
        $settings['square_webhook_sig_key_set'] = !empty( rc_get_setting('square_webhook_sig_key') );
        return rest_ensure_response( $settings );
    }

    public function save( $request ) {
        $p = $request->get_json_params();
        $safe_keys = array(
            'store_name','store_tel','store_email','store_address','cancel_page_id',
            'recaptcha_site_key','recaptcha_secret_key','recaptcha_score',
            'square_application_id','square_location_id','square_sandbox_mode',
            'payment_onsite_enabled','payment_square_enabled',
            'rate_limit_per_minute','business_hours_start','business_hours_end',
        );
        foreach ( $safe_keys as $k ) {
            if ( isset($p[$k]) ) {
                rc_update_setting( $k, sanitize_text_field( $p[$k] ) );
            }
        }
        // Encrypted fields
        if ( isset($p['square_access_token']) && !empty($p['square_access_token']) ) {
            rc_update_setting( 'square_access_token', rc_encrypt( $p['square_access_token'] ) );
        }
        if ( isset($p['square_webhook_sig_key']) && !empty($p['square_webhook_sig_key']) ) {
            rc_update_setting( 'square_webhook_sig_key', rc_encrypt( $p['square_webhook_sig_key'] ) );
        }
        return rest_ensure_response( array( 'success' => true ) );
    }

    public function test_mail( $request ) {
        $p  = $request->get_json_params();
        $to = sanitize_email( $p['to'] ?? '' );
        if ( ! is_email( $to ) ) {
            return new WP_Error('validation','正しいメールアドレスを入力してください',array('status'=>400));
        }
        $headers = array('Content-Type: text/plain; charset=UTF-8');
        $store   = rc_get_setting('store_name','レンタカー予約');
        $sent = wp_mail( $to, "【{$store}】テストメール", "これはテストメールです。\nメール送信が正常に動作しています。", $headers );
        return rest_ensure_response( array( 'success' => $sent ) );
    }

    public function system_info( $request ) {
        global $wpdb;
        $tables = array(
            'vehicles','vehicle_meta','prices','options','slots','holidays',
            'reservations','reservation_options','payments','refunds',
            'mail_templates','mail_logs','settings'
        );
        $table_info = array();
        foreach ( $tables as $t ) {
            $full = rc_table($t);
            $count = $wpdb->get_var("SELECT COUNT(*) FROM {$full}");
            $table_info[] = array('name' => $full, 'rows' => (int)$count);
        }
        return rest_ensure_response( array(
            'php_version'    => phpversion(),
            'wp_version'     => get_bloginfo('version'),
            'plugin_version' => RC_PLUGIN_VERSION,
            'db_version'     => get_option( RC_OPT_DB_VERSION, '?' ),
            'tables'         => $table_info,
            'timezone'       => wp_timezone_string(),
            'memory_limit'   => ini_get('memory_limit'),
            'upload_max'     => ini_get('upload_max_filesize'),
            'openssl'        => extension_loaded('openssl'),
        ));
    }
}
