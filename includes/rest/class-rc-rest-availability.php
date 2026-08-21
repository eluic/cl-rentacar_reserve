<?php
/**
 * Public REST: availability calendar.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Availability {

    public function register_routes() {
        register_rest_route( RC_REST_NAMESPACE, '/availability', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_availability' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'vehicle_id' => array(
                    'required' => true,
                    'type'     => 'integer',
                ),
                'month' => array(
                    'required' => true,
                    'type'     => 'string',
                    'pattern'  => '^\d{4}-\d{2}$',
                ),
            ),
        ) );
    }

    /**
     * GET /availability?vehicle_id=1&month=2026-08
     */
    public function get_availability( $request ) {
        $vehicle_id = (int) $request['vehicle_id'];
        $month      = sanitize_text_field( $request['month'] );

        $vehicle = RC_Model_Vehicle::find( $vehicle_id );
        if ( ! $vehicle ) {
            return new WP_Error( 'not_found', '車両が見つかりません', array( 'status' => 404 ) );
        }

        // Build date range for the month
        $start = $month . '-01';
        $end   = date( 'Y-m-t', strtotime( $start ) );

        $days = array();
        $current = new DateTime( $start );
        $end_dt  = new DateTime( $end );

        while ( $current <= $end_dt ) {
            $date = $current->format( 'Y-m-d' );

            // Check if vehicle is blocked (maintenance) on this date
            $is_blocked = RC_Model_Vehicle_Block::is_blocked( $vehicle_id, $date, $date );
            if ( $is_blocked ) {
                $days[ $date ] = array(
                    'date'      => $date,
                    'capacity'  => 0,
                    'booked'    => 0,
                    'available' => 0,
                    'status'    => 'blocked',
                );
            } else {
                $avail = RC_Model_Slot::get_availability( $vehicle_id, $date );
                $days[ $date ] = array(
                    'date'      => $date,
                    'capacity'  => $avail['capacity'],
                    'booked'    => $avail['booked'],
                    'available' => $avail['available'],
                    'status'    => $avail['status'],
                );
            }
            $current->modify( '+1 day' );
        }

        return rest_ensure_response( array(
            'vehicle_id' => $vehicle_id,
            'month'      => $month,
            'days'       => $days,
        ) );
    }
}
