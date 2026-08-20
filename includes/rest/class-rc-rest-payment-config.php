<?php
/**
 * Public REST: payment configuration.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Payment_Config {

    public function register_routes() {
        register_rest_route( RC_REST_NAMESPACE, '/payment-config', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_config' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public function get_config( $request ) {
        return rest_ensure_response( array(
            'onsite_enabled' => '1' === rc_get_setting( 'payment_onsite_enabled', '1' ),
            'square_enabled' => '1' === rc_get_setting( 'payment_square_enabled', '0' ),
            'square_app_id'  => rc_get_setting( 'square_application_id', '' ),
            'square_sandbox' => '1' === rc_get_setting( 'square_sandbox_mode', '1' ),
        ) );
    }
}
