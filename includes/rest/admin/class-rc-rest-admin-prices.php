<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class RC_Rest_Admin_Prices {
    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        $ac = array( $this, 'check_admin' );
        register_rest_route( $ns, '/admin/prices', array(
            array( 'methods' => 'GET',  'callback' => array( $this, 'index' ), 'permission_callback' => $ac ),
            array( 'methods' => 'POST', 'callback' => array( $this, 'store' ), 'permission_callback' => $ac ),
        ));
        register_rest_route( $ns, '/admin/prices/(?P<id>\d+)', array(
            array( 'methods' => 'PUT',    'callback' => array( $this, 'update_item' ),  'permission_callback' => $ac ),
            array( 'methods' => 'DELETE', 'callback' => array( $this, 'destroy' ), 'permission_callback' => $ac ),
        ));
    }
    public function check_admin() { return current_user_can( 'manage_options' ); }

    public function index( $request ) {
        $args = array();
        if ( $request->get_param('vehicle_id') ) $args['vehicle_id'] = (int) $request->get_param('vehicle_id');
        if ( $request->get_param('price_type') ) $args['price_type'] = $request->get_param('price_type');
        return rest_ensure_response( RC_Model_Price::all( $args ) );
    }
    public function store( $request ) {
        $p = $request->get_json_params();
        $id = RC_Model_Price::create( array(
            'vehicle_id' => (int)($p['vehicle_id'] ?? 0),
            'price_type' => sanitize_text_field( $p['price_type'] ?? 'base' ),
            'label'      => sanitize_text_field( $p['label'] ?? '' ),
            'date_from'  => !empty($p['date_from']) ? sanitize_text_field($p['date_from']) : null,
            'date_to'    => !empty($p['date_to']) ? sanitize_text_field($p['date_to']) : null,
            'amount'     => (int)($p['amount'] ?? 0),
            'sort_order' => (int)($p['sort_order'] ?? 0),
        ));
        return rest_ensure_response( array( 'id' => $id ) );
    }
    public function update_item( $request ) {
        $p = $request->get_json_params();
        $data = array();
        foreach ( array('vehicle_id','price_type','label','date_from','date_to','amount','sort_order') as $k ) {
            if ( isset($p[$k]) ) {
                if ( in_array($k, array('vehicle_id','amount','sort_order')) ) $data[$k] = (int)$p[$k];
                elseif ( in_array($k, array('date_from','date_to')) ) $data[$k] = !empty($p[$k]) ? sanitize_text_field($p[$k]) : null;
                else $data[$k] = sanitize_text_field($p[$k]);
            }
        }
        RC_Model_Price::update( (int) $request['id'], $data );
        return rest_ensure_response( array( 'success' => true ) );
    }
    public function destroy( $request ) {
        RC_Model_Price::delete( (int) $request['id'] );
        return rest_ensure_response( array( 'success' => true ) );
    }
}
