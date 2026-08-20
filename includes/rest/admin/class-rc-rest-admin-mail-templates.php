<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Mail_Templates {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/mail-templates', array(
            'methods' => 'GET', 'callback' => array( $this, 'index' ), 'permission_callback' => $ac,
        ));
        register_rest_route( $ns, '/admin/mail-templates/(?P<id>\d+)', array(
            array( 'methods' => 'GET', 'callback' => array( $this, 'show' ), 'permission_callback' => $ac ),
            array( 'methods' => 'PUT', 'callback' => array( $this, 'update_item' ), 'permission_callback' => $ac ),
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        return rest_ensure_response( RC_Model_Mail_Template::all() );
    }
    public function show( $request ) {
        $tpl = RC_Model_Mail_Template::find( (int) $request['id'] );
        if ( ! $tpl ) return new WP_Error('not_found','テンプレートが見つかりません',array('status'=>404));
        return rest_ensure_response( $tpl );
    }
    public function update_item( $request ) {
        $p = $request->get_json_params();
        $data = array();
        if ( isset($p['subject']) ) $data['subject'] = sanitize_text_field( $p['subject'] );
        if ( isset($p['body']) )    $data['body']    = sanitize_textarea_field( $p['body'] );
        if ( isset($p['enabled']) ) $data['enabled']  = (int)(bool)$p['enabled'];
        RC_Model_Mail_Template::update( (int) $request['id'], $data );
        return rest_ensure_response( array( 'success' => true ) );
    }
}
