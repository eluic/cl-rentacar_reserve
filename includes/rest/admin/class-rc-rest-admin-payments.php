<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Payments {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/payments', array(
            'methods' => 'GET', 'callback' => array( $this, 'index' ), 'permission_callback' => $ac,
        ));
        register_rest_route( $ns, '/admin/payments/(?P<id>\d+)/refund', array(
            'methods' => 'POST', 'callback' => array( $this, 'refund' ), 'permission_callback' => $ac,
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        $args = array(
            'status'   => $request->get_param('status') ?: '',
            'per_page' => $request->get_param('per_page') ?: 20,
            'page'     => $request->get_param('page') ?: 1,
        );
        if ( $request->get_param('reservation_id') ) $args['reservation_id'] = (int) $request->get_param('reservation_id');
        $items = RC_Model_Payment::all( $args );
        foreach ( $items as &$p ) {
            $r = RC_Model_Reservation::find( $p->reservation_id );
            $p->reservation_code = $r ? $r->reservation_code : '';
            $p->customer_name    = $r ? $r->customer_name : '';
            $p->refunds = RC_Model_Refund::for_payment( $p->id );
        }
        return rest_ensure_response( array(
            'items' => $items,
            'total' => RC_Model_Payment::count( $args ),
        ));
    }

    public function refund( $request ) {
        $payment_id = (int) $request['id'];
        $p = $request->get_json_params();
        $amount = (int)( $p['amount'] ?? 0 );
        $reason = sanitize_textarea_field( $p['reason'] ?? '' );

        $payment = RC_Model_Payment::find( $payment_id );
        if ( ! $payment ) {
            return new WP_Error( 'not_found', '決済が見つかりません', array( 'status' => 404 ) );
        }

        RC_Payment_Manager::init();
        $gw = RC_Payment_Manager::get( $payment->gateway );
        if ( ! $gw ) {
            return new WP_Error( 'gateway_error', '決済ゲートウェイが見つかりません', array( 'status' => 400 ) );
        }

        $result = $gw->refund( $payment_id, $amount, $reason );
        return rest_ensure_response( $result );
    }
}
