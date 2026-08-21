<?php
/**
 * Admin REST: vehicle maintenance blocks CRUD.
 *
 * Endpoints:
 *   GET    /admin/vehicles/{id}/blocks      — list blocks for a vehicle
 *   GET    /admin/blocks                    — list all blocks
 *   POST   /admin/vehicles/{id}/blocks      — create a new block
 *   DELETE /admin/vehicles/{vid}/blocks/{id} — delete a block
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Admin_Vehicle_Blocks {

    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );

        // List all blocks
        register_rest_route( $ns, '/admin/blocks', array(
            array( 'methods' => 'GET', 'callback' => array( $this, 'all' ), 'permission_callback' => $ac ),
        ) );

        // Per-vehicle list / Create
        register_rest_route( $ns, '/admin/vehicles/(?P<id>\d+)/blocks', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ), 'permission_callback' => $ac ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'store' ), 'permission_callback' => $ac ),
        ) );

        // Delete
        register_rest_route( $ns, '/admin/vehicles/(?P<vid>\d+)/blocks/(?P<bid>\d+)', array(
            array( 'methods' => 'DELETE', 'callback' => array( $this, 'destroy' ), 'permission_callback' => $ac ),
        ) );
    }

    public function check_admin() {
        return current_user_can( 'manage_options' );
    }

    /**
     * List all blocks across all vehicles.
     */
    public function all( $request ) {
        return rest_ensure_response( RC_Model_Vehicle_Block::all() );
    }

    /**
     * List blocks for a specific vehicle.
     */
    public function index( $request ) {
        $vehicle_id = (int) $request['id'];
        return rest_ensure_response( RC_Model_Vehicle_Block::for_vehicle( $vehicle_id ) );
    }

    /**
     * Create a new maintenance block.
     */
    public function store( $request ) {
        $vehicle_id = (int) $request['id'];
        $p = $request->get_json_params();

        if ( empty( $p['date_from'] ) || empty( $p['date_to'] ) ) {
            return new WP_Error( 'missing_dates', '開始日と終了日は必須です', array( 'status' => 400 ) );
        }

        $id = RC_Model_Vehicle_Block::create( array(
            'vehicle_id' => $vehicle_id,
            'date_from'  => sanitize_text_field( $p['date_from'] ),
            'date_to'    => sanitize_text_field( $p['date_to'] ),
            'reason'     => sanitize_text_field( $p['reason'] ?? '' ),
        ) );

        if ( ! $id ) {
            return new WP_Error( 'create_failed', '作成に失敗しました', array( 'status' => 500 ) );
        }
        return rest_ensure_response( array( 'id' => $id, 'success' => true ) );
    }

    /**
     * Delete a block entry (unblock).
     */
    public function destroy( $request ) {
        $bid = (int) $request['bid'];
        RC_Model_Vehicle_Block::delete( $bid );
        return rest_ensure_response( array( 'success' => true ) );
    }
}
