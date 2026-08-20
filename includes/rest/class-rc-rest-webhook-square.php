<?php
/**
 * Public REST: Square webhook handler.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Webhook_Square {

    public function register_routes() {
        register_rest_route( RC_REST_NAMESPACE, '/webhook/square', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'handle' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public function handle( $request ) {
        $body      = $request->get_body();
        $signature = $request->get_header( 'x-square-hmacsha256-signature' );
        $sig_key   = rc_decrypt( rc_get_setting( 'square_webhook_sig_key', '' ) );

        // Verify signature
        if ( ! empty( $sig_key ) ) {
            $url = rest_url( RC_REST_NAMESPACE . '/webhook/square' );
            $expected = base64_encode( hash_hmac( 'sha256', $url . $body, $sig_key, true ) );
            if ( ! hash_equals( $expected, (string) $signature ) ) {
                RC_Logger::warning( 'Square webhook signature mismatch' );
                return new WP_Error( 'invalid_signature', 'Invalid signature', array( 'status' => 403 ) );
            }
        }

        $data = json_decode( $body, true );
        if ( empty( $data['type'] ) ) {
            return rest_ensure_response( array( 'status' => 'ignored' ) );
        }

        $type = $data['type'];
        RC_Logger::info( 'Square webhook received', array( 'type' => $type ) );

        if ( 'payment.completed' === $type ) {
            $this->handle_payment_completed( $data );
        } elseif ( 'refund.updated' === $type ) {
            $this->handle_refund_updated( $data );
        }

        return rest_ensure_response( array( 'status' => 'ok' ) );
    }

    private function handle_payment_completed( $data ) {
        if ( empty( $data['data']['object']['payment']['id'] ) ) {
            return;
        }
        $sq_payment_id = $data['data']['object']['payment']['id'];

        global $wpdb;
        $table = rc_table( 'payments' );
        $payment = $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$table} WHERE transaction_id = %s LIMIT 1", $sq_payment_id )
        );

        if ( $payment ) {
            RC_Model_Payment::update( $payment->id, array( 'status' => 'completed' ) );
            RC_Model_Reservation::update( $payment->reservation_id, array(
                'payment_status' => RC_PAY_PAID,
                'status'         => RC_STATUS_CONFIRMED,
            ) );
            RC_Mailer::send( RC_MAIL_APPLICANT_PAID, $payment->reservation_id );
        }
    }

    private function handle_refund_updated( $data ) {
        // Handle refund webhook
        RC_Logger::info( 'Refund webhook processed', $data );
    }
}
