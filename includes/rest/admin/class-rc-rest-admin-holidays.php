<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Holidays {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/holidays', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ),   'permission_callback' => $ac ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'store' ),   'permission_callback' => $ac ),
        ));
        register_rest_route( $ns, '/admin/holidays/(?P<id>\d+)', array(
            array( 'methods' => 'PUT',    'callback' => array( $this, 'update_item' ), 'permission_callback' => $ac ),
            array( 'methods' => 'DELETE', 'callback' => array( $this, 'destroy' ), 'permission_callback' => $ac ),
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        global $wpdb;
        $table = rc_table('holidays');
        $year  = $request->get_param('year') ?: date('Y');
        return rest_ensure_response( $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$table} WHERE YEAR(date)=%d ORDER BY date ASC", $year)
        ));
    }
    public function store( $request ) {
        global $wpdb;
        $p = $request->get_json_params();
        $wpdb->insert( rc_table('holidays'), array(
            'date'       => sanitize_text_field( $p['date'] ?? '' ),
            'label'      => sanitize_text_field( $p['label'] ?? '' ),
            'vehicle_id' => (int)($p['vehicle_id'] ?? 0),
        ));
        return rest_ensure_response( array( 'id' => $wpdb->insert_id ) );
    }
    public function update_item( $request ) {
        global $wpdb;
        $p = $request->get_json_params();
        $data = array();
        if ( isset( $p['date'] ) )       $data['date']       = sanitize_text_field( $p['date'] );
        if ( isset( $p['label'] ) )      $data['label']      = sanitize_text_field( $p['label'] );
        if ( isset( $p['vehicle_id'] ) ) $data['vehicle_id'] = (int) $p['vehicle_id'];
        $wpdb->update( rc_table('holidays'), $data, array( 'id' => (int) $request['id'] ) );
        return rest_ensure_response( array( 'success' => true ) );
    }
    public function destroy( $request ) {
        global $wpdb;
        $wpdb->delete( rc_table('holidays'), array('id' => (int)$request['id']) );
        return rest_ensure_response( array( 'success' => true ) );
    }
}
