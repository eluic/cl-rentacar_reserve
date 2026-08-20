<?php
/**
 * On-site payment gateway.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Gateway_Onsite implements RC_Payment_Gateway {

    public function get_id() {
        return 'onsite';
    }

    public function get_name() {
        return '現地決済';
    }

    public function is_enabled() {
        return '1' === rc_get_setting( 'payment_onsite_enabled', '1' );
    }

    public function process( $reservation_id, $data ) {
        $reservation = RC_Model_Reservation::find( $reservation_id );
        if ( ! $reservation ) {
            return array( 'success' => false, 'message' => '予約が見つかりません' );
        }

        RC_Model_Payment::create( array(
            'reservation_id' => $reservation_id,
            'gateway'        => $this->get_id(),
            'transaction_id' => 'onsite_' . $reservation->reservation_code,
            'amount'         => $reservation->total_amount,
            'status'         => 'pending_onsite',
        ) );

        return array( 'success' => true, 'message' => '現地でのお支払いとなります' );
    }

    public function refund( $payment_id, $amount, $reason ) {
        $payment = RC_Model_Payment::find( $payment_id );
        if ( ! $payment ) {
            return array( 'success' => false, 'message' => '決済が見つかりません' );
        }

        RC_Model_Refund::create( array(
            'payment_id' => $payment_id,
            'amount'     => $amount,
            'reason'     => $reason,
            'status'     => 'completed',
        ) );

        return array( 'success' => true, 'message' => '返金処理が完了しました' );
    }
}
