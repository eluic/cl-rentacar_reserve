<?php
/**
 * Square payment gateway.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Gateway_Square implements RC_Payment_Gateway {

    private $api_base;

    public function __construct() {
        $sandbox = '1' === rc_get_setting( 'square_sandbox_mode', '1' );
        $this->api_base = $sandbox
            ? 'https://connect.squareupsandbox.com/v2'
            : 'https://connect.squareup.com/v2';
    }

    public function get_id() {
        return 'square';
    }

    public function get_name() {
        return 'Square カード決済';
    }

    public function is_enabled() {
        return '1' === rc_get_setting( 'payment_square_enabled', '0' );
    }

    public function process( $reservation_id, $data ) {
        $reservation = RC_Model_Reservation::find( $reservation_id );
        if ( ! $reservation ) {
            return array( 'success' => false, 'message' => '予約が見つかりません' );
        }

        $source_id   = isset( $data['source_id'] ) ? sanitize_text_field( $data['source_id'] ) : '';
        $location_id = rc_get_setting( 'square_location_id', '' );
        $token       = rc_decrypt( rc_get_setting( 'square_access_token', '' ) );

        if ( empty( $source_id ) || empty( $token ) || empty( $location_id ) ) {
            return array( 'success' => false, 'message' => 'Square決済の設定が不完全です' );
        }

        $idempotency_key = wp_generate_uuid4();

        $response = wp_remote_post( $this->api_base . '/payments', array(
            'headers' => array(
                'Authorization'  => 'Bearer ' . $token,
                'Content-Type'   => 'application/json',
                'Square-Version' => '2024-01-18',
            ),
            'body' => wp_json_encode( array(
                'source_id'        => $source_id,
                'idempotency_key'  => $idempotency_key,
                'amount_money'     => array(
                    'amount'   => (int) $reservation->total_amount,
                    'currency' => 'JPY',
                ),
                'location_id'       => $location_id,
                'reference_id'      => $reservation->reservation_code,
                'note'              => $reservation->reservation_code . ' - ' . $reservation->customer_name,
            ) ),
            'timeout' => 30,
        ) );

        if ( is_wp_error( $response ) ) {
            RC_Logger::error( 'Square API error', array( 'error' => $response->get_error_message() ) );
            return array( 'success' => false, 'message' => '決済処理中にエラーが発生しました' );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( 200 === $code && ! empty( $body['payment']['id'] ) ) {
            $sq_payment_id = $body['payment']['id'];

            RC_Model_Payment::create( array(
                'reservation_id' => $reservation_id,
                'gateway'        => $this->get_id(),
                'transaction_id' => $sq_payment_id,
                'amount'         => (int) $reservation->total_amount,
                'status'         => 'completed',
            ) );

            RC_Model_Reservation::update( $reservation_id, array(
                'payment_status' => RC_PAY_PAID,
                'status'         => RC_STATUS_CONFIRMED,
            ) );

            return array( 'success' => true, 'transaction_id' => $sq_payment_id );
        }

        $error_msg = '決済に失敗しました';
        if ( ! empty( $body['errors'][0]['detail'] ) ) {
            $error_msg = $body['errors'][0]['detail'];
        }
        RC_Logger::error( 'Square payment failed', array( 'body' => $body ) );
        return array( 'success' => false, 'message' => $error_msg );
    }

    public function refund( $payment_id, $amount, $reason ) {
        $payment = RC_Model_Payment::find( $payment_id );
        if ( ! $payment ) {
            return array( 'success' => false, 'message' => '決済が見つかりません' );
        }

        $token = rc_decrypt( rc_get_setting( 'square_access_token', '' ) );
        if ( empty( $token ) ) {
            return array( 'success' => false, 'message' => 'Square APIキーが設定されていません' );
        }

        $response = wp_remote_post( $this->api_base . '/refunds', array(
            'headers' => array(
                'Authorization'  => 'Bearer ' . $token,
                'Content-Type'   => 'application/json',
                'Square-Version' => '2024-01-18',
            ),
            'body' => wp_json_encode( array(
                'idempotency_key' => wp_generate_uuid4(),
                'payment_id'      => $payment->transaction_id,
                'amount_money'    => array(
                    'amount'   => (int) $amount,
                    'currency' => 'JPY',
                ),
                'reason' => $reason,
            ) ),
            'timeout' => 30,
        ) );

        if ( is_wp_error( $response ) ) {
            return array( 'success' => false, 'message' => $response->get_error_message() );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( 200 === $code && ! empty( $body['refund']['id'] ) ) {
            RC_Model_Refund::create( array(
                'payment_id' => $payment_id,
                'amount'     => (int) $amount,
                'reason'     => $reason,
                'status'     => 'completed',
            ) );

            RC_Model_Reservation::update( $payment->reservation_id, array(
                'payment_status' => RC_PAY_REFUNDED,
            ) );

            RC_Mailer::send( RC_MAIL_APPLICANT_REFUNDED, $payment->reservation_id );

            return array( 'success' => true, 'refund_id' => $body['refund']['id'] );
        }

        return array( 'success' => false, 'message' => '返金に失敗しました' );
    }
}
