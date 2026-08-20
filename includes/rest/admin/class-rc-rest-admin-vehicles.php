<?php
/**
 * Admin REST: vehicles CRUD.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Admin_Vehicles {

    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $admin_check = array( $this, 'check_admin' );

        register_rest_route( $ns, '/admin/vehicles', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ), 'permission_callback' => $admin_check ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'store' ), 'permission_callback' => $admin_check ),
        ) );
        register_rest_route( $ns, '/admin/vehicles/(?P<id>\d+)', array(
            array( 'methods' => 'GET',    'callback' => array( $this, 'show' ),    'permission_callback' => $admin_check ),
            array( 'methods' => 'PUT',    'callback' => array( $this, 'update_item' ),  'permission_callback' => $admin_check ),
            array( 'methods' => 'DELETE', 'callback' => array( $this, 'destroy' ), 'permission_callback' => $admin_check ),
        ) );
    }

    public function check_admin() {
        return current_user_can( 'manage_options' );
    }

    public function index( $request ) {
        $args = array(
            'status'   => $request->get_param( 'status' ) ?: 'all',
            'search'   => $request->get_param( 'search' ) ?: '',
            'per_page' => $request->get_param( 'per_page' ) ?: 50,
            'page'     => $request->get_param( 'page' ) ?: 1,
        );
        $items = RC_Model_Vehicle::all( $args );
        $result = array();
        foreach ( $items as $v ) {
            $meta = RC_Model_Vehicle::get_all_meta( $v->id );
            $v->meta = $meta;
            $v->thumbnail_url = RC_Model_Vehicle::get_thumbnail_url( $v->thumbnail_id );
            $result[] = $v;
        }
        return rest_ensure_response( array(
            'items' => $result,
            'total' => RC_Model_Vehicle::count( $args['status'] ),
        ) );
    }

    public function show( $request ) {
        $v = RC_Model_Vehicle::find( (int) $request['id'] );
        if ( ! $v ) {
            return new WP_Error( 'not_found', '車両が見つかりません', array( 'status' => 404 ) );
        }
        $v->meta = RC_Model_Vehicle::get_all_meta( $v->id );
        $v->thumbnail_url = RC_Model_Vehicle::get_thumbnail_url( $v->thumbnail_id );
        $v->prices = RC_Model_Price::for_vehicle( $v->id );
        return rest_ensure_response( $v );
    }

    public function store( $request ) {
        $p = $request->get_json_params();
        $id = RC_Model_Vehicle::create( array(
            'name'         => sanitize_text_field( $p['name'] ?? '' ),
            'slug'         => sanitize_title( $p['slug'] ?? $p['name'] ?? '' ),
            'description'  => wp_kses_post( $p['description'] ?? '' ),
            'thumbnail_id' => (int) ( $p['thumbnail_id'] ?? 0 ),
            'base_price'   => (int) ( $p['base_price'] ?? 0 ),
            'stock'        => (int) ( $p['stock'] ?? 1 ),
            'status'       => sanitize_text_field( $p['status'] ?? 'published' ),
            'sort_order'   => (int) ( $p['sort_order'] ?? 0 ),
        ) );
        if ( ! $id ) {
            return new WP_Error( 'create_failed', '作成に失敗しました', array( 'status' => 500 ) );
        }
        // Save meta
        if ( isset( $p['seats'] ) ) RC_Model_Vehicle::set_meta( $id, 'seats', (int) $p['seats'] );
        if ( isset( $p['transmission'] ) ) RC_Model_Vehicle::set_meta( $id, 'transmission', sanitize_text_field( $p['transmission'] ) );
        if ( isset( $p['vehicle_class'] ) ) RC_Model_Vehicle::set_meta( $id, 'vehicle_class', sanitize_text_field( $p['vehicle_class'] ) );
        return rest_ensure_response( array( 'id' => $id ) );
    }

    public function update_item( $request ) {
        $id = (int) $request['id'];
        $p  = $request->get_json_params();
        $data = array();
        if ( isset( $p['name'] ) )         $data['name']         = sanitize_text_field( $p['name'] );
        if ( isset( $p['slug'] ) )         $data['slug']         = sanitize_title( $p['slug'] );
        if ( isset( $p['description'] ) )  $data['description']  = wp_kses_post( $p['description'] );
        if ( isset( $p['thumbnail_id'] ) ) $data['thumbnail_id'] = (int) $p['thumbnail_id'];
        if ( isset( $p['base_price'] ) )   $data['base_price']   = (int) $p['base_price'];
        if ( isset( $p['stock'] ) )        $data['stock']        = (int) $p['stock'];
        if ( isset( $p['status'] ) )       $data['status']       = sanitize_text_field( $p['status'] );
        if ( isset( $p['sort_order'] ) )   $data['sort_order']   = (int) $p['sort_order'];
        RC_Model_Vehicle::update( $id, $data );
        if ( isset( $p['seats'] ) ) RC_Model_Vehicle::set_meta( $id, 'seats', (int) $p['seats'] );
        if ( isset( $p['transmission'] ) ) RC_Model_Vehicle::set_meta( $id, 'transmission', sanitize_text_field( $p['transmission'] ) );
        if ( isset( $p['vehicle_class'] ) ) RC_Model_Vehicle::set_meta( $id, 'vehicle_class', sanitize_text_field( $p['vehicle_class'] ) );
        return rest_ensure_response( array( 'success' => true ) );
    }

    public function destroy( $request ) {
        RC_Model_Vehicle::delete( (int) $request['id'] );
        return rest_ensure_response( array( 'success' => true ) );
    }
}
