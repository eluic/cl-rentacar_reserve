<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Mail_Logs {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/mail-logs', array(
            'methods' => 'GET', 'callback' => array( $this, 'index' ), 'permission_callback' => $ac,
        ));
        register_rest_route( $ns, '/admin/mail-logs/(?P<id>\d+)/resend', array(
            'methods' => 'POST', 'callback' => array( $this, 'resend' ), 'permission_callback' => $ac,
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        $args = array(
            'status'   => $request->get_param('status') ?: '',
            'per_page' => $request->get_param('per_page') ?: 20,
            'page'     => $request->get_param('page') ?: 1,
        );
        if ( $request->get_param('reservation_id') ) $args['reservation_id'] = (int)$request->get_param('reservation_id');
        return rest_ensure_response( array(
            'items' => RC_Model_Mail_Log::all( $args ),
            'total' => RC_Model_Mail_Log::count( $args ),
        ));
    }
    public function resend( $request ) {
        $sent = RC_Model_Mail_Log::resend( (int) $request['id'] );
        return rest_ensure_response( array( 'success' => $sent ) );
    }
}
