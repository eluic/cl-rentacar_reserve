<?php
/**
 * Reservation model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Reservation {

    /**
     * Get reservations with filters.
     *
     * @param array $args Query arguments.
     * @return array
     */
    public static function all( $args = array() ) {
        global $wpdb;
        $table = rc_table( 'reservations' );

        $defaults = array(
            'status'         => '',
            'payment_status' => '',
            'vehicle_id'     => 0,
            'date_from'      => '',
            'date_to'        => '',
            'search'         => '',
            'orderby'        => 'created_at',
            'order'          => 'DESC',
            'per_page'       => 20,
            'page'           => 1,
        );
        $args   = wp_parse_args( $args, $defaults );
        $where  = '1=1';
        $params = array();

        if ( ! empty( $args['status'] ) ) {
            $where .= ' AND status = %s';
            $params[] = $args['status'];
        }
        if ( ! empty( $args['payment_status'] ) ) {
            $where .= ' AND payment_status = %s';
            $params[] = $args['payment_status'];
        }
        if ( ! empty( $args['vehicle_id'] ) ) {
            $where .= ' AND vehicle_id = %d';
            $params[] = (int) $args['vehicle_id'];
        }
        if ( ! empty( $args['date_from'] ) ) {
            $where .= ' AND DATE(pickup_at) >= %s';
            $params[] = $args['date_from'];
        }
        if ( ! empty( $args['date_to'] ) ) {
            $where .= ' AND DATE(pickup_at) <= %s';
            $params[] = $args['date_to'];
        }
        if ( ! empty( $args['search'] ) ) {
            $where .= ' AND (customer_name LIKE %s OR customer_email LIKE %s OR reservation_code LIKE %s OR customer_tel LIKE %s)';
            $like = '%' . $wpdb->esc_like( $args['search'] ) . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $orderby = sanitize_sql_orderby( $args['orderby'] . ' ' . $args['order'] );
        if ( ! $orderby ) {
            $orderby = 'created_at DESC';
        }

        $offset = ( (int) $args['page'] - 1 ) * (int) $args['per_page'];
        $limit  = (int) $args['per_page'];

        $sql = "SELECT * FROM {$table} WHERE {$where} ORDER BY {$orderby} LIMIT %d OFFSET %d";
        $params[] = $limit;
        $params[] = $offset;

        if ( ! empty( $params ) ) {
            $sql = $wpdb->prepare( $sql, $params );
        }

        return $wpdb->get_results( $sql );
    }

    /**
     * Count reservations.
     *
     * @param array $args Filter arguments.
     * @return int
     */
    public static function count( $args = array() ) {
        global $wpdb;
        $table  = rc_table( 'reservations' );
        $where  = '1=1';
        $params = array();

        if ( ! empty( $args['status'] ) ) {
            $where .= ' AND status = %s';
            $params[] = $args['status'];
        }
        if ( ! empty( $args['payment_status'] ) ) {
            $where .= ' AND payment_status = %s';
            $params[] = $args['payment_status'];
        }
        if ( ! empty( $args['date_from'] ) ) {
            $where .= ' AND DATE(pickup_at) >= %s';
            $params[] = $args['date_from'];
        }
        if ( ! empty( $args['date_to'] ) ) {
            $where .= ' AND DATE(pickup_at) <= %s';
            $params[] = $args['date_to'];
        }

        if ( ! empty( $params ) ) {
            return (int) $wpdb->get_var(
                $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE {$where}", $params )
            );
        }
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE {$where}" );
    }

    /**
     * Find by ID.
     *
     * @param int $id Reservation ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM " . rc_table( 'reservations' ) . " WHERE id = %d", $id )
        );
    }

    /**
     * Find by reservation code.
     *
     * @param string $code Reservation code.
     * @return object|null
     */
    public static function find_by_code( $code ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM " . rc_table( 'reservations' ) . " WHERE reservation_code = %s",
                $code
            )
        );
    }

    /**
     * Create a reservation.
     *
     * @param array $data Reservation data.
     * @return int|false Inserted ID or false.
     */
    public static function create( $data ) {
        global $wpdb;
        $table = rc_table( 'reservations' );
        $now   = rc_now();

        // Generate unique reservation code
        $max_attempts = 10;
        $code = '';
        for ( $i = 0; $i < $max_attempts; $i++ ) {
            $candidate = rc_generate_reservation_code();
            $exists = $wpdb->get_var(
                $wpdb->prepare( "SELECT id FROM {$table} WHERE reservation_code = %s", $candidate )
            );
            if ( ! $exists ) {
                $code = $candidate;
                break;
            }
        }
        if ( empty( $code ) ) {
            return false;
        }

        $defaults = array(
            'reservation_code' => $code,
            'vehicle_id'       => 0,
            'pickup_at'        => $now,
            'return_at'        => $now,
            'status'           => RC_STATUS_PENDING,
            'payment_status'   => RC_PAY_UNPAID,
            'customer_name'    => '',
            'customer_kana'    => '',
            'customer_tel'     => '',
            'customer_email'   => '',
            'customer_zip'     => '',
            'customer_address' => '',
            'total_amount'     => 0,
            'note'             => '',
            'raw_payload'      => '',
            'created_at'       => $now,
            'updated_at'       => $now,
        );
        $data = wp_parse_args( $data, $defaults );

        $result = $wpdb->insert( $table, $data );
        if ( $result ) {
            $id = $wpdb->insert_id;
            do_action( 'rc/reservation/created', $id, $data );
            return $id;
        }
        return false;
    }

    /**
     * Update a reservation.
     *
     * @param int   $id   Reservation ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        $data['updated_at'] = rc_now();
        $result = $wpdb->update( rc_table( 'reservations' ), $data, array( 'id' => $id ) );
        if ( false !== $result ) {
            do_action( 'rc/reservation/updated', $id, $data );
            return true;
        }
        return false;
    }

    /**
     * Cancel a reservation.
     *
     * @param int $id Reservation ID.
     * @return bool
     */
    public static function cancel( $id ) {
        $result = self::update( $id, array( 'status' => RC_STATUS_CANCELLED ) );
        if ( $result ) {
            do_action( 'rc/reservation/cancelled', $id );
        }
        return $result;
    }

    /**
     * Get options for a reservation.
     *
     * @param int $reservation_id Reservation ID.
     * @return array
     */
    public static function get_options( $reservation_id ) {
        global $wpdb;
        $ro = rc_table( 'reservation_options' );
        $o  = rc_table( 'options' );
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT ro.*, o.name as option_name, o.unit as option_unit
                 FROM {$ro} ro
                 LEFT JOIN {$o} o ON ro.option_id = o.id
                 WHERE ro.reservation_id = %d",
                $reservation_id
            )
        );
    }

    /**
     * Get today's pickups.
     *
     * @return array
     */
    public static function todays_pickups() {
        global $wpdb;
        $table = rc_table( 'reservations' );
        $today = rc_today();
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE DATE(pickup_at) = %s AND status IN ('pending','confirmed') ORDER BY pickup_at ASC",
                $today
            )
        );
    }

    /**
     * Get today's returns.
     *
     * @return array
     */
    public static function todays_returns() {
        global $wpdb;
        $table = rc_table( 'reservations' );
        $today = rc_today();
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE DATE(return_at) = %s AND status IN ('pending','confirmed') ORDER BY return_at ASC",
                $today
            )
        );
    }

    /**
     * Count booked vehicles for a date range.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $date       Date (Y-m-d).
     * @return int
     */
    public static function count_booked_on_date( $vehicle_id, $date ) {
        global $wpdb;
        $table = rc_table( 'reservations' );
        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table}
                 WHERE vehicle_id = %d
                   AND DATE(pickup_at) <= %s
                   AND DATE(return_at) > %s
                   AND status IN ('pending','confirmed')",
                $vehicle_id, $date, $date
            )
        );
    }
}
