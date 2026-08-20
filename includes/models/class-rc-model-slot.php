<?php
/**
 * Slot (daily inventory) model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Slot {

    /**
     * Get slot for a specific vehicle and date.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $date       Y-m-d.
     * @return object|null
     */
    public static function find( $vehicle_id, $date ) {
        global $wpdb;
        $table = rc_table( 'slots' );
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE vehicle_id = %d AND date = %s",
                $vehicle_id, $date
            )
        );
    }

    /**
     * Get capacity for a vehicle on a date.
     * Falls back to vehicle stock if no slot record exists.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $date       Y-m-d.
     * @return int
     */
    public static function get_capacity( $vehicle_id, $date ) {
        $slot = self::find( $vehicle_id, $date );
        if ( $slot ) {
            return (int) $slot->capacity;
        }
        // Fallback to vehicle default stock
        $vehicle = RC_Model_Vehicle::find( $vehicle_id );
        return $vehicle ? (int) $vehicle->stock : 0;
    }

    /**
     * Get availability for a vehicle on a date.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $date       Y-m-d.
     * @return array { capacity, booked, available, status }
     */
    public static function get_availability( $vehicle_id, $date ) {
        $capacity = self::get_capacity( $vehicle_id, $date );
        $booked   = RC_Model_Reservation::count_booked_on_date( $vehicle_id, $date );
        $available = max( 0, $capacity - $booked );

        // Check holiday
        $is_holiday = RC_Model_Slot::is_holiday( $vehicle_id, $date );

        if ( $is_holiday ) {
            $status = 'holiday';
        } elseif ( $available <= 0 ) {
            $status = 'full';
        } elseif ( $available <= 1 ) {
            $status = 'few';
        } else {
            $status = 'available';
        }

        return array(
            'capacity'  => $capacity,
            'booked'    => $booked,
            'available' => $available,
            'status'    => $status,
        );
    }

    /**
     * Check if a date is a holiday.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $date       Y-m-d.
     * @return bool
     */
    public static function is_holiday( $vehicle_id, $date ) {
        global $wpdb;
        $table = rc_table( 'holidays' );
        $count = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE date = %s AND (vehicle_id = 0 OR vehicle_id = %d)",
                $date, $vehicle_id
            )
        );
        return $count > 0;
    }

    /**
     * Set or update slot capacity.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $date       Y-m-d.
     * @param int    $capacity   Capacity.
     * @return bool
     */
    public static function set( $vehicle_id, $date, $capacity ) {
        global $wpdb;
        $table = rc_table( 'slots' );
        $existing = self::find( $vehicle_id, $date );
        if ( $existing ) {
            return false !== $wpdb->update(
                $table,
                array( 'capacity' => $capacity ),
                array( 'id' => $existing->id )
            );
        }
        return false !== $wpdb->insert( $table, array(
            'vehicle_id' => $vehicle_id,
            'date'       => $date,
            'capacity'   => $capacity,
        ) );
    }

    /**
     * Bulk set slots for a date range.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $from       Y-m-d start.
     * @param string $to         Y-m-d end.
     * @param int    $capacity   Capacity.
     * @return int Number of records affected.
     */
    public static function bulk_set( $vehicle_id, $from, $to, $capacity ) {
        $count   = 0;
        $current = new DateTime( $from );
        $end     = new DateTime( $to );

        while ( $current <= $end ) {
            self::set( $vehicle_id, $current->format( 'Y-m-d' ), $capacity );
            $count++;
            $current->modify( '+1 day' );
        }
        return $count;
    }

    /**
     * Get slots for a vehicle in a date range.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $from       Y-m-d.
     * @param string $to         Y-m-d.
     * @return array
     */
    public static function get_range( $vehicle_id, $from, $to ) {
        global $wpdb;
        $table = rc_table( 'slots' );
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE vehicle_id = %d AND date BETWEEN %s AND %s ORDER BY date ASC",
                $vehicle_id, $from, $to
            )
        );
    }

    /**
     * Delete a slot.
     *
     * @param int $id Slot ID.
     * @return bool
     */
    public static function delete( $id ) {
        global $wpdb;
        return false !== $wpdb->delete( rc_table( 'slots' ), array( 'id' => $id ) );
    }
}
