<?php
/**
 * Payment model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Payment {

    /**
     * Get all payments with optional filters.
     *
     * @param array $args Query arguments.
     * @return array
     */
    public static function all( $args = array() ) {
        global $wpdb;
        $table = rc_table( 'payments' );

        $defaults = array(
            'reservation_id' => 0,
            'status'         => '',
            'per_page'       => 20,
            'page'           => 1,
        );
        $args   = wp_parse_args( $args, $defaults );
        $where  = '1=1';
        $params = array();

        if ( ! empty( $args['reservation_id'] ) ) {
            $where .= ' AND reservation_id = %d';
            $params[] = (int) $args['reservation_id'];
        }
        if ( ! empty( $args['status'] ) ) {
            $where .= ' AND status = %s';
            $params[] = $args['status'];
        }

        $offset = ( (int) $args['page'] - 1 ) * (int) $args['per_page'];
        $limit  = (int) $args['per_page'];
        $params[] = $limit;
        $params[] = $offset;

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE {$where} ORDER BY created_at DESC LIMIT %d OFFSET %d",
                $params
            )
        );
    }

    /**
     * Find by ID.
     *
     * @param int $id Payment ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM " . rc_table( 'payments' ) . " WHERE id = %d", $id )
        );
    }

    /**
     * Find by reservation ID.
     *
     * @param int $reservation_id Reservation ID.
     * @return array
     */
    public static function for_reservation( $reservation_id ) {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM " . rc_table( 'payments' ) . " WHERE reservation_id = %d ORDER BY created_at DESC",
                $reservation_id
            )
        );
    }

    /**
     * Create a payment record.
     *
     * @param array $data Payment data.
     * @return int|false
     */
    public static function create( $data ) {
        global $wpdb;
        $now = rc_now();
        $defaults = array(
            'reservation_id' => 0,
            'gateway'        => '',
            'transaction_id' => '',
            'amount'         => 0,
            'status'         => 'pending',
            'created_at'     => $now,
            'updated_at'     => $now,
        );
        $data = wp_parse_args( $data, $defaults );
        $result = $wpdb->insert( rc_table( 'payments' ), $data );
        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Update a payment.
     *
     * @param int   $id   Payment ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        $data['updated_at'] = rc_now();
        return false !== $wpdb->update( rc_table( 'payments' ), $data, array( 'id' => $id ) );
    }

    /**
     * Count payments.
     *
     * @param array $args Filter.
     * @return int
     */
    public static function count( $args = array() ) {
        global $wpdb;
        $table  = rc_table( 'payments' );
        $where  = '1=1';
        $params = array();

        if ( ! empty( $args['status'] ) ) {
            $where .= ' AND status = %s';
            $params[] = $args['status'];
        }
        if ( ! empty( $params ) ) {
            return (int) $wpdb->get_var(
                $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE {$where}", $params )
            );
        }
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
    }
}
