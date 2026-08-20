<?php
/**
 * Plugin deactivator.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Deactivator {

    /**
     * Run on deactivation.
     */
    public static function deactivate() {
        wp_clear_scheduled_hook( RC_CRON_HOOK_RETRY_MAIL );
        wp_clear_scheduled_hook( RC_CRON_HOOK_REMINDER );
        flush_rewrite_rules();
    }
}
