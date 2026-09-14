<?php
/**
 * Admin Analytics REST endpoint.
 *
 * @package RentacarBooking
 * @since   1.1.3
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Admin_Analytics {

    public function register_routes() {
        $ns = RC_REST_NAMESPACE;
        register_rest_route( $ns, '/admin/analytics', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'analytics' ),
            'permission_callback' => array( $this, 'check_admin' ),
        ) );
    }

    public function check_admin() {
        return current_user_can( 'manage_options' );
    }

    /**
     * GET /admin/analytics?period=all|this_month|last_month|last_3months|last_6months|this_year
     */
    public function analytics( $request ) {
        global $wpdb;
        $table_r = rc_table( 'reservations' );
        $table_v = rc_table( 'vehicles' );

        $period = $request->get_param( 'period' ) ?: 'all';

        // Build period WHERE clause
        $period_where = '';
        $period_params = array();
        $now = new DateTime( 'now', new DateTimeZone( 'Asia/Tokyo' ) );

        switch ( $period ) {
            case 'this_month':
                $start = $now->format( 'Y-m-01' );
                $end   = $now->format( 'Y-m-t' );
                $period_where  = ' AND DATE(r.pickup_at) >= %s AND DATE(r.pickup_at) <= %s';
                $period_params = array( $start, $end );
                break;
            case 'last_month':
                $lm = ( clone $now )->modify( '-1 month' );
                $start = $lm->format( 'Y-m-01' );
                $end   = $lm->format( 'Y-m-t' );
                $period_where  = ' AND DATE(r.pickup_at) >= %s AND DATE(r.pickup_at) <= %s';
                $period_params = array( $start, $end );
                break;
            case 'last_3months':
                $start = ( clone $now )->modify( '-2 months' )->format( 'Y-m-01' );
                $period_where  = ' AND DATE(r.pickup_at) >= %s';
                $period_params = array( $start );
                break;
            case 'last_6months':
                $start = ( clone $now )->modify( '-5 months' )->format( 'Y-m-01' );
                $period_where  = ' AND DATE(r.pickup_at) >= %s';
                $period_params = array( $start );
                break;
            case 'this_year':
                $start = $now->format( 'Y-01-01' );
                $period_where  = ' AND DATE(r.pickup_at) >= %s';
                $period_params = array( $start );
                break;
            default: // 'all'
                break;
        }

        // ── Section 1: KPI Summary ──
        $base_sql = "SELECT * FROM {$table_r} r WHERE 1=1 {$period_where}";
        if ( ! empty( $period_params ) ) {
            $sql = $wpdb->prepare( $base_sql, $period_params );
        } else {
            $sql = $base_sql;
        }
        $reservations = $wpdb->get_results( $sql );

        $total_count      = count( $reservations );
        $confirmed_count  = 0;
        $cancelled_count  = 0;
        $pending_count    = 0;
        $total_sales      = 0;
        $total_booked_days = 0;
        $email_counts     = array();

        foreach ( $reservations as $r ) {
            if ( in_array( $r->status, array( 'confirmed', 'completed' ), true ) ) {
                $confirmed_count++;
                $total_sales += (int) $r->total_amount;

                $pickup = new DateTime( $r->pickup_at );
                $return = new DateTime( $r->return_at );
                $days   = max( 1, (int) ceil( ( $return->getTimestamp() - $pickup->getTimestamp() ) / 86400 ) );
                $total_booked_days += $days;
            }
            if ( $r->status === 'cancelled' ) {
                $cancelled_count++;
            }
            if ( $r->status === 'pending' ) {
                $pending_count++;
            }
            if ( $r->status !== 'cancelled' && ! empty( $r->customer_email ) ) {
                if ( ! isset( $email_counts[ $r->customer_email ] ) ) {
                    $email_counts[ $r->customer_email ] = 0;
                }
                $email_counts[ $r->customer_email ]++;
            }
        }

        $avg_price = $confirmed_count > 0 ? round( $total_sales / $confirmed_count ) : 0;
        $cancel_rate = $total_count > 0 ? round( ( $cancelled_count / $total_count ) * 100 ) : 0;

        // Vehicle count for utilization
        $vehicle_count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table_v} WHERE status IN ('active','published')" );
        $days_in_period = 30;
        $utilization_rate = $vehicle_count > 0 ? min( 100, round( ( $total_booked_days / ( $vehicle_count * $days_in_period ) ) * 100 ) ) : 0;

        $repeat_customers = 0;
        foreach ( $email_counts as $c ) {
            if ( $c >= 2 ) {
                $repeat_customers++;
            }
        }
        $unique_customers = count( $email_counts );
        $repeat_rate = $unique_customers > 0 ? round( ( $repeat_customers / $unique_customers ) * 100 ) : 0;

        $summary = array(
            'total_reservations' => $total_count,
            'total_sales'        => $total_sales,
            'avg_price'          => $avg_price,
            'cancel_rate'        => $cancel_rate,
            'utilization_rate'   => $utilization_rate,
            'repeat_rate'        => $repeat_rate,
            'confirmed_count'    => $confirmed_count,
            'cancelled_count'    => $cancelled_count,
            'pending_count'      => $pending_count,
        );

        // ── Section 2: Monthly Trends (last 12 months, always full data) ──
        $monthly_map = array();
        for ( $i = 11; $i >= 0; $i-- ) {
            $d = ( clone $now )->modify( "-{$i} months" );
            $key = $d->format( 'Y-m' );
            $monthly_map[ $key ] = array( 'count' => 0, 'sales' => 0, 'cancelled' => 0 );
        }

        // Use ALL reservations for trend chart (not period-filtered)
        $all_reservations = $wpdb->get_results( "SELECT pickup_at, status, total_amount FROM {$table_r}" );
        foreach ( $all_reservations as $r ) {
            $d   = new DateTime( $r->pickup_at );
            $key = $d->format( 'Y-m' );
            if ( isset( $monthly_map[ $key ] ) ) {
                $monthly_map[ $key ]['count']++;
                if ( in_array( $r->status, array( 'confirmed', 'completed' ), true ) ) {
                    $monthly_map[ $key ]['sales'] += (int) $r->total_amount;
                }
                if ( $r->status === 'cancelled' ) {
                    $monthly_map[ $key ]['cancelled']++;
                }
            }
        }

        $monthly_trends = array();
        foreach ( $monthly_map as $month => $data ) {
            $parts = explode( '-', $month );
            $monthly_trends[] = array(
                'month'     => $month,
                'label'     => (int) $parts[1] . '月',
                'count'     => $data['count'],
                'sales'     => $data['sales'],
                'cancelled' => $data['cancelled'],
            );
        }

        // ── Section 3: Vehicle Analysis ──
        $vehicles_list = $wpdb->get_results( "SELECT id, name FROM {$table_v} WHERE status IN ('active','published') ORDER BY id ASC" );
        $vehicle_stats = array();
        foreach ( $vehicles_list as $v ) {
            $vehicle_stats[ $v->id ] = array(
                'name'  => $v->name,
                'count' => 0,
                'sales' => 0,
                'days'  => 0,
            );
        }

        // Only count confirmed/completed for vehicle analysis
        foreach ( $reservations as $r ) {
            if ( ! in_array( $r->status, array( 'confirmed', 'completed' ), true ) ) {
                continue;
            }
            $vid = (int) $r->vehicle_id;
            if ( ! isset( $vehicle_stats[ $vid ] ) ) {
                continue;
            }
            $vehicle_stats[ $vid ]['count']++;
            $vehicle_stats[ $vid ]['sales'] += (int) $r->total_amount;
            $pickup = new DateTime( $r->pickup_at );
            $return = new DateTime( $r->return_at );
            $vehicle_stats[ $vid ]['days'] += max( 1, (int) ceil( ( $return->getTimestamp() - $pickup->getTimestamp() ) / 86400 ) );
        }

        $vehicle_analysis = array();
        foreach ( $vehicle_stats as $vid => $stat ) {
            // Get stock for utilization calc
            $stock = (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT COALESCE(MAX(CAST(meta_value AS UNSIGNED)),1) FROM " . rc_table( 'vehicle_meta' ) . " WHERE vehicle_id = %d AND meta_key = 'stock'",
                $vid
            ) );
            if ( $stock < 1 ) $stock = 1;

            $vehicle_analysis[] = array(
                'vehicle_id'        => $vid,
                'vehicle_name'      => $stat['name'],
                'reservation_count' => $stat['count'],
                'total_sales'       => $stat['sales'],
                'total_days'        => $stat['days'],
                'avg_per_day'       => $stat['days'] > 0 ? round( $stat['sales'] / $stat['days'] ) : 0,
                'utilization'       => min( 100, round( ( $stat['days'] / ( $days_in_period * $stock ) ) * 100 ) ),
            );
        }

        // Sort by total_sales desc
        usort( $vehicle_analysis, function ( $a, $b ) {
            return $b['total_sales'] - $a['total_sales'];
        } );

        return rest_ensure_response( array(
            'period'           => $period,
            'summary'          => $summary,
            'monthly_trends'   => $monthly_trends,
            'vehicle_analysis' => $vehicle_analysis,
        ) );
    }
}
