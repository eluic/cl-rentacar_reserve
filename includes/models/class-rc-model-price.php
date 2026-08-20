<?php
/**
 * Price model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Price {

    /**
     * Get prices for a vehicle.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $type       Price type filter.
     * @return array
     */
    public static function for_vehicle( $vehicle_id, $type = '' ) {
        global $wpdb;
        $table  = rc_table( 'prices' );
        $where  = 'vehicle_id = %d';
        $params = array( $vehicle_id );

        if ( ! empty( $type ) ) {
            $where .= ' AND price_type = %s';
            $params[] = $type;
        }

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE {$where} ORDER BY sort_order ASC, id ASC",
                $params
            )
        );
    }

    /**
     * Get all prices.
     *
     * @param array $args Query arguments.
     * @return array
     */
    public static function all( $args = array() ) {
        global $wpdb;
        $table = rc_table( 'prices' );

        $where  = '1=1';
        $params = array();

        if ( ! empty( $args['vehicle_id'] ) ) {
            $where .= ' AND vehicle_id = %d';
            $params[] = (int) $args['vehicle_id'];
        }
        if ( ! empty( $args['price_type'] ) ) {
            $where .= ' AND price_type = %s';
            $params[] = $args['price_type'];
        }

        $sql = "SELECT * FROM {$table} WHERE {$where} ORDER BY sort_order ASC, id ASC";
        if ( ! empty( $params ) ) {
            $sql = $wpdb->prepare( $sql, $params );
        }
        return $wpdb->get_results( $sql );
    }

    /**
     * Find by ID.
     *
     * @param int $id Price ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM " . rc_table( 'prices' ) . " WHERE id = %d", $id )
        );
    }

    /**
     * Create a price record.
     *
     * @param array $data Price data.
     * @return int|false
     */
    public static function create( $data ) {
        global $wpdb;
        $defaults = array(
            'vehicle_id' => 0,
            'price_type' => 'base',
            'label'      => '',
            'date_from'  => null,
            'date_to'    => null,
            'amount'     => 0,
            'sort_order' => 0,
        );
        $data = wp_parse_args( $data, $defaults );
        $result = $wpdb->insert( rc_table( 'prices' ), $data );
        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Update a price record.
     *
     * @param int   $id   Price ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        return false !== $wpdb->update( rc_table( 'prices' ), $data, array( 'id' => $id ) );
    }

    /**
     * Delete a price record.
     *
     * @param int $id Price ID.
     * @return bool
     */
    public static function delete( $id ) {
        global $wpdb;
        return false !== $wpdb->delete( rc_table( 'prices' ), array( 'id' => $id ) );
    }

    /**
     * Calculate total price for a rental.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $pickup_at  Pickup datetime.
     * @param string $return_at  Return datetime.
     * @return int Total amount.
     */
    public static function calculate( $vehicle_id, $pickup_at, $return_at ) {
        $vehicle = RC_Model_Vehicle::find( $vehicle_id );
        if ( ! $vehicle ) {
            return 0;
        }

        $days = rc_calc_rental_days( $pickup_at, $return_at );

        // Check for season pricing first
        $prices = self::for_vehicle( $vehicle_id );
        $daily_rate = (int) $vehicle->base_price;

        // Check if there are daily price overrides
        foreach ( $prices as $price ) {
            if ( 'daily' === $price->price_type ) {
                $daily_rate = (int) $price->amount;
                break;
            }
        }

        // Check for seasonal pricing
        $pickup_date = substr( $pickup_at, 0, 10 );
        foreach ( $prices as $price ) {
            if ( 'season' === $price->price_type
                 && ! empty( $price->date_from )
                 && ! empty( $price->date_to )
                 && $pickup_date >= $price->date_from
                 && $pickup_date <= $price->date_to ) {
                $daily_rate = (int) $price->amount;
                break;
            }
        }

        return $daily_rate * $days;
    }
}
