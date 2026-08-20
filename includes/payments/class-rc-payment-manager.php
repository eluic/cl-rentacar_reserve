<?php
/**
 * Payment manager — gateway registry.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Payment_Manager {

    /** @var RC_Payment_Gateway[] */
    private static $gateways = array();

    /**
     * Register default gateways.
     */
    public static function init() {
        self::register( new RC_Gateway_Onsite() );
        self::register( new RC_Gateway_Square() );
    }

    /**
     * Register a gateway.
     *
     * @param RC_Payment_Gateway $gateway Gateway instance.
     */
    public static function register( RC_Payment_Gateway $gateway ) {
        self::$gateways[ $gateway->get_id() ] = $gateway;
    }

    /**
     * Get a gateway by ID.
     *
     * @param string $id Gateway ID.
     * @return RC_Payment_Gateway|null
     */
    public static function get( $id ) {
        return isset( self::$gateways[ $id ] ) ? self::$gateways[ $id ] : null;
    }

    /**
     * Get all enabled gateways.
     *
     * @return RC_Payment_Gateway[]
     */
    public static function get_enabled() {
        $enabled = array();
        foreach ( self::$gateways as $gw ) {
            if ( $gw->is_enabled() ) {
                $enabled[ $gw->get_id() ] = $gw;
            }
        }
        return $enabled;
    }

    /**
     * Process payment through the specified gateway.
     *
     * @param string $gateway_id     Gateway ID.
     * @param int    $reservation_id Reservation ID.
     * @param array  $data           Payment data.
     * @return array
     */
    public static function process( $gateway_id, $reservation_id, $data ) {
        if ( empty( self::$gateways ) ) {
            self::init();
        }
        $gw = self::get( $gateway_id );
        if ( ! $gw ) {
            return array( 'success' => false, 'message' => '決済方法が見つかりません' );
        }
        if ( ! $gw->is_enabled() ) {
            return array( 'success' => false, 'message' => 'この決済方法は利用できません' );
        }
        return $gw->process( $reservation_id, $data );
    }
}
