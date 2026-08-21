<?php
/**
 * Vehicle Block model — maintenance/unavailability periods.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Vehicle_Block {

    /**
     * Get blocks for a specific vehicle.
     *
     * @param int $vehicle_id Vehicle ID.
     * @return array
     */
    public static function for_vehicle( $vehicle_id ) {
        global $wpdb;
        $table = rc_table( 'vehicle_blocks' );
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE vehicle_id = %d ORDER BY date_from ASC",
                $vehicle_id
            )
        );
    }

    /**
     * Get all blocks.
     *
     * @return array
     */
    public static function all() {
        global $wpdb;
        $table = rc_table( 'vehicle_blocks' );
        return $wpdb->get_results(
            "SELECT * FROM {$table} ORDER BY date_from ASC"
        );
    }

    /**
     * Find by ID.
     *
     * @param int $id Block ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        $table = rc_table( 'vehicle_blocks' );
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id )
        );
    }

    /**
     * Create a block entry.
     *
     * @param array $data Block data.
     * @return int|false
     */
    public static function create( $data ) {
        global $wpdb;
        $table = rc_table( 'vehicle_blocks' );
        $defaults = array(
            'vehicle_id' => 0,
            'date_from'  => null,
            'date_to'    => null,
            'reason'     => '',
            'created_at' => rc_now(),
        );
        $data = wp_parse_args( $data, $defaults );
        $result = $wpdb->insert( $table, $data );
        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Delete a block entry.
     *
     * @param int $id Block ID.
     * @return bool
     */
    public static function delete( $id ) {
        global $wpdb;
        $table = rc_table( 'vehicle_blocks' );
        return false !== $wpdb->delete( $table, array( 'id' => $id ) );
    }

    /**
     * Check if a vehicle is blocked on a given date range.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $date_from  Start date (Y-m-d).
     * @param string $date_to    End date (Y-m-d).
     * @return bool
     */
    public static function is_blocked( $vehicle_id, $date_from, $date_to ) {
        global $wpdb;
        $table = rc_table( 'vehicle_blocks' );
        $count = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE vehicle_id = %d AND date_from <= %s AND date_to >= %s",
                $vehicle_id, $date_to, $date_from
            )
        );
        return $count > 0;
    }
}
