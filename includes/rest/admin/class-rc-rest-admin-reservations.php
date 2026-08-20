<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Reservations {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/reservations', array(
            'methods' => 'GET', 'callback' => array( $this, 'index' ), 'permission_callback' => $ac,
        ));
        register_rest_route( $ns, '/admin/reservations/(?P<id>\d+)', array(
            array( 'methods' => 'GET', 'callback' => array( $this, 'show' ), 'permission_callback' => $ac ),
            array( 'methods' => 'PUT', 'callback' => array( $this, 'update_item' ), 'permission_callback' => $ac ),
        ));
        register_rest_route( $ns, '/admin/reservations/dashboard', array(
            'methods' => 'GET', 'callback' => array( $this, 'dashboard' ), 'permission_callback' => $ac,
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        $args = array(
            'status'         => $request->get_param('status') ?: '',
            'payment_status' => $request->get_param('payment_status') ?: '',
            'vehicle_id'     => (int)$request->get_param('vehicle_id'),
            'date_from'      => $request->get_param('date_from') ?: '',
            'date_to'        => $request->get_param('date_to') ?: '',
            'search'         => $request->get_param('search') ?: '',
            'per_page'       => $request->get_param('per_page') ?: 20,
            'page'           => $request->get_param('page') ?: 1,
        );
        $items = RC_Model_Reservation::all( $args );
        foreach ( $items as &$r ) {
            $v = RC_Model_Vehicle::find( $r->vehicle_id );
            $r->vehicle_name = $v ? $v->name : '(削除済み)';
        }
        return rest_ensure_response( array(
            'items' => $items,
            'total' => RC_Model_Reservation::count( $args ),
        ));
    }

    public function show( $request ) {
        $r = RC_Model_Reservation::find( (int)$request['id'] );
        if ( !$r ) return new WP_Error('not_found','予約が見つかりません',array('status'=>404));
        $v = RC_Model_Vehicle::find( $r->vehicle_id );
        $r->vehicle_name = $v ? $v->name : '(削除済み)';
        $r->options  = RC_Model_Reservation::get_options( $r->id );
        $r->payments = RC_Model_Payment::for_reservation( $r->id );
        return rest_ensure_response( $r );
    }

    public function update_item( $request ) {
        $id = (int) $request['id'];
        $p  = $request->get_json_params();
        $data = array();
        if ( isset($p['status']) )         $data['status']         = sanitize_text_field( $p['status'] );
        if ( isset($p['payment_status']) ) $data['payment_status'] = sanitize_text_field( $p['payment_status'] );
        if ( isset($p['note']) )           $data['note']           = sanitize_textarea_field( $p['note'] );
        RC_Model_Reservation::update( $id, $data );
        return rest_ensure_response( array( 'success' => true ) );
    }

    public function dashboard( $request ) {
        $today_pickups = RC_Model_Reservation::todays_pickups();
        $today_returns = RC_Model_Reservation::todays_returns();
        foreach ( $today_pickups as &$r ) {
            $v = RC_Model_Vehicle::find( $r->vehicle_id );
            $r->vehicle_name = $v ? $v->name : '';
        }
        foreach ( $today_returns as &$r ) {
            $v = RC_Model_Vehicle::find( $r->vehicle_id );
            $r->vehicle_name = $v ? $v->name : '';
        }
        // Sales summary (this month)
        global $wpdb;
        $t = rc_table('reservations');
        $month_start = date('Y-m-01');
        $month_sales = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COALESCE(SUM(total_amount),0) FROM {$t} WHERE status IN ('pending','confirmed','completed') AND created_at >= %s",
            $month_start
        ));
        $month_count = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$t} WHERE created_at >= %s AND status != 'cancelled'",
            $month_start
        ));
        return rest_ensure_response( array(
            'today_pickups'  => $today_pickups,
            'today_returns'  => $today_returns,
            'month_sales'    => $month_sales,
            'month_count'    => $month_count,
            'pending_count'  => RC_Model_Reservation::count( array('status'=>'pending') ),
            'vehicle_count'  => RC_Model_Vehicle::count('published'),
        ));
    }
}
