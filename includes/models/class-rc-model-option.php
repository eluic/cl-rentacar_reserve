<?php
/**
 * Option model (add-ons: car nav, ETC, child seat, CDW, etc.).
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Option {

    /**
     * Get all published options.
     *
     * @param string $status Status filter.
     * @return array
     */
    public static function all( $status = 'published' ) {
        global $wpdb;
        $table = rc_table( 'options' );
        if ( 'all' === $status ) {
            return $wpdb->get_results( "SELECT * FROM {$table} ORDER BY sort_order ASC, id ASC" );
        }
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE status = %s ORDER BY sort_order ASC, id ASC",
                $status
            )
        );
    }

    /**
     * Find by ID.
     *
     * @param int $id Option ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM " . rc_table( 'options' ) . " WHERE id = %d", $id )
        );
    }

    /**
     * Create an option.
     *
     * @param array $data Option data.
     * @return int|false
     */
    public static function create( $data ) {
        global $wpdb;
        $defaults = array(
            'name'        => '',
            'description' => '',
            'amount'      => 0,
            'unit'        => 'per_reservation',
            'status'      => 'published',
            'sort_order'  => 0,
        );
        $data = wp_parse_args( $data, $defaults );
        $result = $wpdb->insert( rc_table( 'options' ), $data );
        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Update an option.
     *
     * @param int   $id   Option ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        return false !== $wpdb->update( rc_table( 'options' ), $data, array( 'id' => $id ) );
    }

    /**
     * Delete an option.
     *
     * @param int $id Option ID.
     * @return bool
     */
    public static function delete( $id ) {
        global $wpdb;
        return false !== $wpdb->delete( rc_table( 'options' ), array( 'id' => $id ) );
    }

    /**
     * Calculate option cost.
     *
     * @param int $option_id Option ID.
     * @param int $quantity  Quantity.
     * @param int $days      Rental days.
     * @return int
     */
    public static function calculate( $option_id, $quantity, $days = 1 ) {
        $option = self::find( $option_id );
        if ( ! $option ) {
            return 0;
        }
        $base = (int) $option->amount * (int) $quantity;
        if ( 'per_day' === $option->unit ) {
            $base *= $days;
        }
        return $base;
    }
}
