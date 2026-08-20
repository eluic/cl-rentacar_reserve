<?php
/**
 * Public REST: vehicles list.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Vehicles {

    public function register_routes() {
        register_rest_route( RC_REST_NAMESPACE, '/vehicles', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_vehicles' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( RC_REST_NAMESPACE, '/vehicles/(?P<id>\d+)', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_vehicle' ),
            'permission_callback' => '__return_true',
        ) );
    }

    /**
     * GET /vehicles
     */
    public function get_vehicles( $request ) {
        $vehicles = RC_Model_Vehicle::all( array( 'status' => 'published' ) );
        $result = array();

        foreach ( $vehicles as $v ) {
            $meta = RC_Model_Vehicle::get_all_meta( $v->id );
            $result[] = array(
                'id'           => (int) $v->id,
                'slug'         => $v->slug,
                'name'         => $v->name,
                'description'  => $v->description,
                'thumbnail'    => RC_Model_Vehicle::get_thumbnail_url( $v->thumbnail_id, 'medium_large' ),
                'base_price'   => (int) $v->base_price,
                'stock'        => (int) $v->stock,
                'seats'        => isset( $meta['seats'] ) ? (int) $meta['seats'] : 5,
                'transmission' => isset( $meta['transmission'] ) ? $meta['transmission'] : 'AT',
                'vehicle_class'=> isset( $meta['vehicle_class'] ) ? $meta['vehicle_class'] : '',
                'sort_order'   => (int) $v->sort_order,
            );
        }

        return rest_ensure_response( $result );
    }

    /**
     * GET /vehicles/{id}
     */
    public function get_vehicle( $request ) {
        $id = (int) $request['id'];
        $v  = RC_Model_Vehicle::find( $id );
        if ( ! $v || 'published' !== $v->status ) {
            return new WP_Error( 'not_found', '車両が見つかりません', array( 'status' => 404 ) );
        }

        $meta = RC_Model_Vehicle::get_all_meta( $v->id );
        return rest_ensure_response( array(
            'id'           => (int) $v->id,
            'slug'         => $v->slug,
            'name'         => $v->name,
            'description'  => $v->description,
            'thumbnail'    => RC_Model_Vehicle::get_thumbnail_url( $v->thumbnail_id, 'large' ),
            'base_price'   => (int) $v->base_price,
            'stock'        => (int) $v->stock,
            'seats'        => isset( $meta['seats'] ) ? (int) $meta['seats'] : 5,
            'transmission' => isset( $meta['transmission'] ) ? $meta['transmission'] : 'AT',
            'vehicle_class'=> isset( $meta['vehicle_class'] ) ? $meta['vehicle_class'] : '',
        ) );
    }
}
