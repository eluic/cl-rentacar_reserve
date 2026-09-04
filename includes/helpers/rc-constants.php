<?php
/**
 * Plugin constants.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ── Version ─────────────────────────────────────────── */
define( 'RC_PLUGIN_VERSION',  '1.1.1' );
define( 'RC_DB_VERSION',      '1.1.0' );

/* ── Paths ───────────────────────────────────────────── */
define( 'RC_PLUGIN_DIR',  plugin_dir_path( dirname( __DIR__ ) ) );
define( 'RC_PLUGIN_URL',  plugin_dir_url( dirname( __DIR__ ) ) );
define( 'RC_PLUGIN_FILE', RC_PLUGIN_DIR . 'rentacar-booking.php' );
define( 'RC_PLUGIN_BASENAME', plugin_basename( RC_PLUGIN_FILE ) );

/* ── REST ────────────────────────────────────────────── */
define( 'RC_REST_NAMESPACE', 'rentacar/v1' );

/* ── Option keys ─────────────────────────────────────── */
define( 'RC_OPT_DB_VERSION',      'rc_opt_db_version' );
define( 'RC_OPT_STORE_NAME',      'rc_opt_store_name' );
define( 'RC_OPT_STORE_TEL',       'rc_opt_store_tel' );
define( 'RC_OPT_STORE_EMAIL',     'rc_opt_store_email' );
define( 'RC_OPT_STORE_ADDRESS',   'rc_opt_store_address' );
define( 'RC_OPT_CANCEL_PAGE',     'rc_opt_cancel_page' );
define( 'RC_OPT_RECAPTCHA_SITE',  'rc_opt_recaptcha_site_key' );
define( 'RC_OPT_RECAPTCHA_SECRET','rc_opt_recaptcha_secret_key' );
define( 'RC_OPT_RECAPTCHA_SCORE', 'rc_opt_recaptcha_score' );
define( 'RC_OPT_SQUARE_APP_ID',   'rc_opt_square_application_id' );
define( 'RC_OPT_SQUARE_TOKEN',    'rc_opt_square_access_token' );
define( 'RC_OPT_SQUARE_LOC_ID',   'rc_opt_square_location_id' );
define( 'RC_OPT_SQUARE_SANDBOX',  'rc_opt_square_sandbox_mode' );
define( 'RC_OPT_SQUARE_WEBHOOK',  'rc_opt_square_webhook_sig_key' );
define( 'RC_OPT_PAYMENT_ONSITE',  'rc_opt_payment_onsite_enabled' );
define( 'RC_OPT_PAYMENT_SQUARE',  'rc_opt_payment_square_enabled' );
define( 'RC_OPT_RATE_LIMIT',      'rc_opt_rate_limit_per_minute' );
define( 'RC_OPT_BUSINESS_HOURS_START', 'rc_opt_business_hours_start' );
define( 'RC_OPT_BUSINESS_HOURS_END',   'rc_opt_business_hours_end' );

/* ── Reservation statuses ────────────────────────────── */
define( 'RC_STATUS_PENDING',   'pending' );
define( 'RC_STATUS_CONFIRMED', 'confirmed' );
define( 'RC_STATUS_CANCELLED', 'cancelled' );
define( 'RC_STATUS_COMPLETED', 'completed' );
define( 'RC_STATUS_NO_SHOW',   'no_show' );

/* ── Payment statuses ────────────────────────────────── */
define( 'RC_PAY_UNPAID',   'unpaid' );
define( 'RC_PAY_PAID',     'paid' );
define( 'RC_PAY_REFUNDED', 'refunded' );

/* ── Mail template keys ──────────────────────────────── */
define( 'RC_MAIL_APPLICANT_CREATED',   'applicant_created' );
define( 'RC_MAIL_ADMIN_CREATED',       'admin_created' );
define( 'RC_MAIL_APPLICANT_PAID',      'applicant_paid' );
define( 'RC_MAIL_APPLICANT_REFUNDED',  'applicant_refunded' );
define( 'RC_MAIL_APPLICANT_CANCELLED', 'applicant_cancelled' );
define( 'RC_MAIL_ADMIN_CANCELLED',     'admin_cancelled' );
define( 'RC_MAIL_REMINDER',            'reminder' );

/* ── Misc ────────────────────────────────────────────── */
define( 'RC_RESERVATION_PREFIX', 'RC-' );
define( 'RC_RESERVATION_CODE_LENGTH', 8 );
define( 'RC_MAIL_MAX_RETRY', 3 );
define( 'RC_CRON_HOOK_RETRY_MAIL', 'rc_cron_retry_mail' );
define( 'RC_CRON_HOOK_REMINDER',   'rc_cron_reminder' );
