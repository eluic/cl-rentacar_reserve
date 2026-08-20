<?php
/**
 * Shortcode registration.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Shortcode {

    /**
     * Register shortcodes.
     */
    public static function init() {
        add_shortcode( 'rentacar_booking', array( __CLASS__, 'render_booking' ) );
        add_shortcode( 'rentacar_cancel',  array( __CLASS__, 'render_cancel' ) );
    }

    /**
     * Render booking form.
     *
     * @param array $atts Shortcode attributes.
     * @return string
     */
    public static function render_booking( $atts ) {
        // Safety-net enqueue
        RC_Assets::force_enqueue_public();

        ob_start();
        include RC_PLUGIN_DIR . 'public/views/booking-form.php';
        return ob_get_clean();
    }

    /**
     * Render cancel form.
     *
     * @param array $atts Shortcode attributes.
     * @return string
     */
    public static function render_cancel( $atts ) {
        RC_Assets::force_enqueue_cancel();

        ob_start();
        include RC_PLUGIN_DIR . 'public/views/cancel-form.php';
        return ob_get_clean();
    }
}
