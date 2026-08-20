<?php
/**
 * Refund model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Refund {

    /**
     * Get refunds for a payment.
     *
     * @param int $payment_id Payment ID.
     * @return array
     */
    public static function for_payment( $payment_id ) {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM " . rc_table( 'refunds' ) . " WHERE payment_id = %d ORDER BY created_at DESC",
                $payment_id
            )
        );
    }

    /**
     * Find by ID.
     *
     * @param int $id Refund ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM " . rc_table( 'refunds' ) . " WHERE id = %d", $id )
        );
    }

    /**
     * Create a refund record.
     *
     * @param array $data Refund data.
     * @return int|false
     */
    public static function create( $data ) {
        global $wpdb;
        $defaults = array(
            'payment_id' => 0,
            'amount'     => 0,
            'reason'     => '',
            'status'     => 'pending',
            'created_at' => rc_now(),
        );
        $data = wp_parse_args( $data, $defaults );
        $result = $wpdb->insert( rc_table( 'refunds' ), $data );
        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Update a refund.
     *
     * @param int   $id   Refund ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        return false !== $wpdb->update( rc_table( 'refunds' ), $data, array( 'id' => $id ) );
    }
}
