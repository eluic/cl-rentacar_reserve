<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Options {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/options', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ), 'permission_callback' => $ac ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'store' ), 'permission_callback' => $ac ),
        ));
        register_rest_route( $ns, '/admin/options/(?P<id>\d+)', array(
            array( 'methods' => 'PUT',    'callback' => array( $this, 'update_item' ),  'permission_callback' => $ac ),
            array( 'methods' => 'DELETE', 'callback' => array( $this, 'destroy' ), 'permission_callback' => $ac ),
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        return rest_ensure_response( RC_Model_Option::all( 'all' ) );
    }
    public function store( $request ) {
        $p = $request->get_json_params();
        $id = RC_Model_Option::create( array(
            'name'        => sanitize_text_field( $p['name'] ?? '' ),
            'description' => sanitize_textarea_field( $p['description'] ?? '' ),
            'amount'      => (int)($p['amount'] ?? 0),
            'unit'        => sanitize_text_field( $p['unit'] ?? 'per_reservation' ),
            'status'      => sanitize_text_field( $p['status'] ?? 'published' ),
            'sort_order'  => (int)($p['sort_order'] ?? 0),
        ));
        return rest_ensure_response( array( 'id' => $id ) );
    }
    public function update_item( $request ) {
        $p = $request->get_json_params();
        $data = array();
        if ( isset($p['name']) )        $data['name']        = sanitize_text_field( $p['name'] );
        if ( isset($p['description']) ) $data['description'] = sanitize_textarea_field( $p['description'] );
        if ( isset($p['amount']) )      $data['amount']      = (int) $p['amount'];
        if ( isset($p['unit']) )        $data['unit']        = sanitize_text_field( $p['unit'] );
        if ( isset($p['status']) )      $data['status']      = sanitize_text_field( $p['status'] );
        if ( isset($p['sort_order']) )  $data['sort_order']  = (int) $p['sort_order'];
        RC_Model_Option::update( (int) $request['id'], $data );
        return rest_ensure_response( array( 'success' => true ) );
    }
    public function destroy( $request ) {
        RC_Model_Option::delete( (int) $request['id'] );
        return rest_ensure_response( array( 'success' => true ) );
    }
}
