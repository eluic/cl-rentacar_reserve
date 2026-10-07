<?php
/**
 * CSS/JS enqueue with shortcode detection.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Assets {

    private static $public_enqueued = false;
    private static $cancel_enqueued = false;

    /**
     * Register hooks.
     */
    public static function init() {
        add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_public' ) );
        add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin' ) );
    }

    /**
     * Enqueue on public pages if shortcode is detected.
     */
    public static function enqueue_public() {
        if ( self::should_enqueue_public() ) {
            self::do_enqueue_public();
        }
        if ( self::should_enqueue_cancel() ) {
            self::do_enqueue_cancel();
        }
    }

    /**
     * Check if booking shortcode exists on current page.
     *
     * @return bool
     */
    private static function should_enqueue_public() {
        global $post;
        if ( ! $post ) {
            return false;
        }
        if ( has_shortcode( $post->post_content, 'rentacar_booking' ) ) {
            return true;
        }
        // Fallback: strpos for page builders
        if ( strpos( $post->post_content, '[rentacar_booking' ) !== false ) {
            return true;
        }
        return false;
    }

    /**
     * Check if cancel shortcode exists on current page.
     *
     * @return bool
     */
    private static function should_enqueue_cancel() {
        global $post;
        if ( ! $post ) {
            return false;
        }
        if ( has_shortcode( $post->post_content, 'rentacar_cancel' ) ) {
            return true;
        }
        if ( strpos( $post->post_content, '[rentacar_cancel' ) !== false ) {
            return true;
        }
        return false;
    }

    /**
     * Safety net: force enqueue booking assets from shortcode render.
     */
    public static function force_enqueue_public() {
        if ( ! self::$public_enqueued ) {
            self::do_enqueue_public();
        }
    }

    /**
     * Safety net: force enqueue cancel assets from shortcode render.
     */
    public static function force_enqueue_cancel() {
        if ( ! self::$cancel_enqueued ) {
            self::do_enqueue_cancel();
        }
    }

    /**
     * Actually enqueue booking form assets.
     */
    private static function do_enqueue_public() {
        if ( self::$public_enqueued ) {
            return;
        }
        self::$public_enqueued = true;

        $ver = RC_PLUGIN_VERSION;
        $url = RC_PLUGIN_URL;

        // Booking CSS (custom calendar — flatpickr removed in v1.1.3)
        wp_enqueue_style(
            'rc-booking',
            $url . 'public/assets/booking.css',
            array(),
            $ver
        );
        // Booking JS
        wp_enqueue_script(
            'rc-booking',
            $url . 'public/assets/booking.js',
            array(),
            $ver,
            true
        );

        // Localize script data
        $recaptcha_site_key = rc_get_setting( 'recaptcha_site_key' );
        wp_localize_script( 'rc-booking', 'rcBookingData', array(
            'restUrl'            => esc_url_raw( rest_url( RC_REST_NAMESPACE ) ),
            'nonce'              => wp_create_nonce( 'wp_rest' ),
            'recaptchaSiteKey'   => $recaptcha_site_key,
            'squareApplicationId' => rc_get_setting( 'square_application_id' ),
            'squareSandboxMode'  => rc_get_setting( 'square_sandbox_mode', '1' ),
            'paymentOnsite'      => rc_get_setting( 'payment_onsite_enabled', '1' ),
            'paymentSquare'      => rc_get_setting( 'payment_square_enabled', '0' ),
            'i18n'               => array(
                'step1Title'       => '車両を選択',
                'step2Title'       => '日時を選択',
                'step3Title'       => 'オプション選択',
                'step4Title'       => 'お客様情報',
                'step5Title'       => '確認',
                'step6Title'       => '完了',
                'next'             => '次へ',
                'prev'             => '戻る',
                'confirm'          => '予約を確定する',
                'selectVehicle'    => '車両を選択してください',
                'available'        => '空きあり',
                'fewLeft'          => '残りわずか',
                'full'             => '空きなし',
                'holiday'          => '休業日',
                'required'         => 'この項目は必須です',
                'invalidEmail'     => '正しいメールアドレスを入力してください',
                'invalidTel'       => '正しい電話番号を入力してください',
                'agreeTerms'       => '利用規約に同意してください',
                'processing'       => '処理中...',
                'errorOccurred'    => 'エラーが発生しました。もう一度お試しください。',
                'perDay'           => '/ 日',
                'perReservation'   => '/ 1予約',
                'seats'            => '人乗り',
                'yen'              => '円',
                'days'             => '日間',
                'totalAmount'      => '合計金額',
                'onsite'           => '現地決済',
                'onsiteDesc'       => '店舗にてお支払い',
                'squarePay'        => 'カード決済',
            ),
        ) );

        // reCAPTCHA v3
        if ( ! empty( $recaptcha_site_key ) ) {
            wp_enqueue_script(
                'google-recaptcha',
                'https://www.google.com/recaptcha/api.js?render=' . esc_attr( $recaptcha_site_key ),
                array(),
                null,
                true
            );
        }
    }

    /**
     * Actually enqueue cancel form assets.
     */
    private static function do_enqueue_cancel() {
        if ( self::$cancel_enqueued ) {
            return;
        }
        self::$cancel_enqueued = true;

        $ver = RC_PLUGIN_VERSION;
        $url = RC_PLUGIN_URL;

        wp_enqueue_style(
            'rc-cancel',
            $url . 'public/assets/cancel.css',
            array(),
            $ver
        );
        wp_enqueue_script(
            'rc-cancel',
            $url . 'public/assets/cancel.js',
            array(),
            $ver,
            true
        );
        wp_localize_script( 'rc-cancel', 'rcCancelData', array(
            'restUrl' => esc_url_raw( rest_url( RC_REST_NAMESPACE ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'i18n'    => array(
                'step1Title'     => '予約番号を入力',
                'step2Title'     => '予約内容の確認',
                'step3Title'     => 'キャンセル完了',
                'lookup'         => '検索',
                'cancel'         => 'キャンセルする',
                'confirmCancel'  => '本当にキャンセルしますか？',
                'processing'     => '処理中...',
                'errorOccurred'  => 'エラーが発生しました。',
                'emailPlaceholder' => 'ご登録のメールアドレス',
                'codePlaceholder'  => 'RC-XXXXXXXX',
            ),
        ) );
    }

    /**
     * Enqueue admin assets.
     *
     * @param string $hook Current admin page hook.
     */
    public static function enqueue_admin( $hook ) {
        // Only on our plugin pages
        if ( strpos( $hook, 'rc-' ) === false && strpos( $hook, 'rentacar' ) === false ) {
            return;
        }

        $ver = RC_PLUGIN_VERSION;
        $url = RC_PLUGIN_URL;

        wp_enqueue_style(
            'rc-admin',
            $url . 'admin/assets/admin.css',
            array(),
            $ver
        );
        // Chart.js for analytics page
        wp_enqueue_script(
            'chart-js',
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
            array(),
            '4.4.4',
            true
        );
        wp_enqueue_script(
            'rc-admin',
            $url . 'admin/assets/admin.js',
            array( 'jquery', 'wp-api-fetch', 'chart-js' ),
            $ver,
            true
        );
        wp_localize_script( 'rc-admin', 'rcAdminData', array(
            'restUrl'   => esc_url_raw( rest_url( RC_REST_NAMESPACE ) ),
            'nonce'     => wp_create_nonce( 'wp_rest' ),
            'pluginUrl' => $url,
        ) );

        // WordPress media uploader for vehicle images
        wp_enqueue_media();
    }
}
