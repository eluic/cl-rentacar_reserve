<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Slots {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/slots', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ), 'permission_callback' => $ac ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'store' ), 'permission_callback' => $ac ),
        ));
        register_rest_route( $ns, '/admin/slots/bulk', array(
            'methods' => 'POST', 'callback' => array( $this, 'bulk_set' ), 'permission_callback' => $ac,
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        $vid  = (int) $request->get_param('vehicle_id');
        $from = $request->get_param('from') ?: rc_today();
        $to   = $request->get_param('to') ?: date('Y-m-d', strtotime('+30 days'));
        if ( ! $vid ) return new WP_Error('validation','vehicle_id required',array('status'=>400));
        $slots = RC_Model_Slot::get_range( $vid, $from, $to );
        $days  = array();
        $current = new DateTime( $from );
        $end     = new DateTime( $to );
        while ( $current <= $end ) {
            $d = $current->format('Y-m-d');
            $days[$d] = RC_Model_Slot::get_availability( $vid, $d );
            $days[$d]['date'] = $d;
            $current->modify('+1 day');
        }
        return rest_ensure_response( array( 'vehicle_id' => $vid, 'days' => $days, 'slots' => $slots ) );
    }
    public function store( $request ) {
        $p = $request->get_json_params();
        RC_Model_Slot::set( (int)$p['vehicle_id'], sanitize_text_field($p['date']), (int)$p['capacity'] );
        return rest_ensure_response( array( 'success' => true ) );
    }
    public function bulk_set( $request ) {
        $p = $request->get_json_params();
        $count = RC_Model_Slot::bulk_set(
            (int)$p['vehicle_id'],
            sanitize_text_field($p['from']),
            sanitize_text_field($p['to']),
            (int)$p['capacity']
        );
        return rest_ensure_response( array( 'success' => true, 'count' => $count ) );
    }
}
