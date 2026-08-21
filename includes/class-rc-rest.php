<?php
/**
 * REST route registration hub.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest {

    /**
     * Register all REST routes.
     */
    public static function init() {
        add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
    }

    /**
     * Register public and admin routes.
     */
    public static function register_routes() {
        // Public endpoints
        $public_controllers = array(
            'RC_Rest_Vehicles',
            'RC_Rest_Availability',
            'RC_Rest_Reservations',
            'RC_Rest_Cancel',
            'RC_Rest_Options',
            'RC_Rest_Payment_Config',
            'RC_Rest_Webhook_Square',
        );

        // Admin endpoints
        $admin_controllers = array(
            'RC_Rest_Admin_Vehicles',
            'RC_Rest_Admin_Vehicle_Prices',
            'RC_Rest_Admin_Vehicle_Blocks',
            'RC_Rest_Admin_Options',
            'RC_Rest_Admin_Holidays',
            'RC_Rest_Admin_Reservations',
            'RC_Rest_Admin_Mail_Templates',
            'RC_Rest_Admin_Mail_Logs',
            'RC_Rest_Admin_Settings',
        );

        $all = array_merge( $public_controllers, $admin_controllers );
        foreach ( $all as $class ) {
            if ( class_exists( $class ) ) {
                $controller = new $class();
                $controller->register_routes();
            }
        }
    }
}
