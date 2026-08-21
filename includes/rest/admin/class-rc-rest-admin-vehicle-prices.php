<?php
/**
 * Admin REST: per-vehicle pricing CRUD.
 *
 * Endpoints:
 *   GET    /admin/vehicles/{id}/prices      — list prices for a vehicle
 *   POST   /admin/vehicles/{id}/prices      — create a new price entry
 *   PUT    /admin/vehicles/{vid}/prices/{id} — update a price entry
 *   DELETE /admin/vehicles/{vid}/prices/{id} — delete a price entry
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Admin_Vehicle_Prices {

    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );

        // List / Create
        register_rest_route( $ns, '/admin/vehicles/(?P<id>\d+)/prices', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ), 'permission_callback' => $ac ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'store' ), 'permission_callback' => $ac ),
        ) );

        // Update / Delete
        register_rest_route( $ns, '/admin/vehicles/(?P<vid>\d+)/prices/(?P<pid>\d+)', array(
            array( 'methods' => 'PUT',    'callback' => array( $this, 'update_item' ), 'permission_callback' => $ac ),
            array( 'methods' => 'DELETE', 'callback' => array( $this, 'destroy' ),     'permission_callback' => $ac ),
        ) );
    }

    public function check_admin() {
        return current_user_can( 'manage_options' );
    }

    /**
     * List season prices for a vehicle.
     */
    public function index( $request ) {
        $vehicle_id = (int) $request['id'];
        $items = RC_Model_Price::for_vehicle( $vehicle_id, 'season' );
        // Map amount → price for frontend compatibility
        $result = array();
        foreach ( $items as $item ) {
            $result[] = array(
                'id'        => (int) $item->id,
                'vehicle_id'=> (int) $item->vehicle_id,
                'date_from' => $item->date_from,
                'date_to'   => $item->date_to,
                'price'     => (int) $item->amount,
                'label'     => $item->label,
            );
        }
        return rest_ensure_response( $result );
    }

    /**
     * Create a new season price entry.
     */
    public function store( $request ) {
        $vehicle_id = (int) $request['id'];
        $p = $request->get_json_params();

        $id = RC_Model_Price::create( array(
            'vehicle_id' => $vehicle_id,
            'price_type' => 'season',
            'label'      => sanitize_text_field( $p['label'] ?? '' ),
            'date_from'  => ! empty( $p['date_from'] ) ? sanitize_text_field( $p['date_from'] ) : null,
            'date_to'    => ! empty( $p['date_to'] ) ? sanitize_text_field( $p['date_to'] ) : null,
            'amount'     => (int) ( $p['price'] ?? $p['amount'] ?? 0 ),
            'sort_order' => (int) ( $p['sort_order'] ?? 0 ),
        ) );

        if ( ! $id ) {
            return new WP_Error( 'create_failed', '作成に失敗しました', array( 'status' => 500 ) );
        }
        return rest_ensure_response( array( 'id' => $id, 'success' => true ) );
    }

    /**
     * Update an existing price entry.
     */
    public function update_item( $request ) {
        $pid = (int) $request['pid'];
        $p   = $request->get_json_params();

        $existing = RC_Model_Price::find( $pid );
        if ( ! $existing ) {
            return new WP_Error( 'not_found', '料金設定が見つかりません', array( 'status' => 404 ) );
        }

        $data = array();
        if ( isset( $p['date_from'] ) ) $data['date_from'] = ! empty( $p['date_from'] ) ? sanitize_text_field( $p['date_from'] ) : null;
        if ( isset( $p['date_to'] ) )   $data['date_to']   = ! empty( $p['date_to'] ) ? sanitize_text_field( $p['date_to'] ) : null;
        if ( isset( $p['price'] ) )     $data['amount']     = (int) $p['price'];
        if ( isset( $p['amount'] ) )    $data['amount']     = (int) $p['amount'];
        if ( isset( $p['label'] ) )     $data['label']      = sanitize_text_field( $p['label'] );

        RC_Model_Price::update( $pid, $data );
        return rest_ensure_response( array( 'success' => true ) );
    }

    /**
     * Delete a price entry.
     */
    public function destroy( $request ) {
        $pid = (int) $request['pid'];
        RC_Model_Price::delete( $pid );
        return rest_ensure_response( array( 'success' => true ) );
    }
}
