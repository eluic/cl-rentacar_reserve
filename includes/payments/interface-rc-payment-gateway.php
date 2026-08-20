<?php
/**
 * Payment gateway interface.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

interface RC_Payment_Gateway {

    /**
     * Get gateway ID.
     *
     * @return string
     */
    public function get_id();

    /**
     * Get gateway display name.
     *
     * @return string
     */
    public function get_name();

    /**
     * Check if gateway is enabled.
     *
     * @return bool
     */
    public function is_enabled();

    /**
     * Process a payment.
     *
     * @param int   $reservation_id Reservation ID.
     * @param array $data           Payment data.
     * @return array Result with 'success' key.
     */
    public function process( $reservation_id, $data );

    /**
     * Process a refund.
     *
     * @param int    $payment_id Payment ID.
     * @param int    $amount     Refund amount.
     * @param string $reason     Refund reason.
     * @return array Result with 'success' key.
     */
    public function refund( $payment_id, $amount, $reason );
}
