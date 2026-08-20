<?php
/**
 * Public REST: options list.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Options {

    public function register_routes() {
        register_rest_route( RC_REST_NAMESPACE, '/options', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_options' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public function get_options( $request ) {
        $options = RC_Model_Option::all( 'published' );
        $result  = array();

        foreach ( $options as $o ) {
            $result[] = array(
                'id'          => (int) $o->id,
                'name'        => $o->name,
                'description' => $o->description,
                'amount'      => (int) $o->amount,
                'unit'        => $o->unit,
            );
        }

        return rest_ensure_response( $result );
    }
}
