<?php
/**
 * Main plugin class (Singleton).
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Plugin {

    /** @var RC_Plugin|null */
    private static $instance = null;

    /**
     * Get singleton instance.
     *
     * @return RC_Plugin
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor.
     */
    private function __construct() {
        $this->check_migration();
        $this->init_components();
    }

    /**
     * Check and run DB migrations if needed.
     */
    private function check_migration() {
        $stored = get_option( RC_OPT_DB_VERSION, '0.0.0' );
        if ( version_compare( $stored, RC_DB_VERSION, '<' ) ) {
            RC_Migration::run( $stored );
        }
    }

    /**
     * Initialize all plugin components.
     */
    private function init_components() {
        // Assets
        RC_Assets::init();

        // Shortcodes
        RC_Shortcode::init();

        // REST API
        RC_Rest::init();

        // Mailer hooks
        RC_Mailer::init();

        // Admin
        if ( is_admin() ) {
            RC_Admin::init();
        }

        // Cron handlers
        add_action( RC_CRON_HOOK_RETRY_MAIL, array( 'RC_Mailer', 'retry_failed' ) );
        add_action( RC_CRON_HOOK_REMINDER,   array( 'RC_Mailer', 'send_reminders' ) );
    }
}
