<?php
/**
 * Public REST: create reservation.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Reservations {

    public function register_routes() {
        register_rest_route( RC_REST_NAMESPACE, '/reservations', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'create_reservation' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( RC_REST_NAMESPACE, '/reservations/calculate', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'calculate_price' ),
            'permission_callback' => '__return_true',
        ) );
    }

    /**
     * POST /reservations — Create a new reservation.
     */
    public function create_reservation( $request ) {
        // Rate limit
        if ( ! RC_Security::check_rate_limit( 'reservation' ) ) {
            return new WP_Error( 'rate_limited', 'リクエストが多すぎます。しばらく待ってからお試しください。', array( 'status' => 429 ) );
        }

        $params = $request->get_json_params();

        // reCAPTCHA
        $recaptcha_token = isset( $params['recaptcha_token'] ) ? $params['recaptcha_token'] : '';
        if ( ! RC_Security::verify_recaptcha( $recaptcha_token ) ) {
            return new WP_Error( 'recaptcha_failed', 'セキュリティ検証に失敗しました。', array( 'status' => 403 ) );
        }

        // Validate required fields
        $required = array( 'vehicle_id', 'pickup_at', 'return_at', 'customer_name', 'customer_kana', 'customer_email', 'customer_tel', 'customer_zip', 'customer_address' );
        foreach ( $required as $field ) {
            if ( empty( $params[ $field ] ) ) {
                return new WP_Error( 'validation', $field . ' は必須です。', array( 'status' => 400 ) );
            }
        }

        // Sanitize inputs
        $vehicle_id = (int) $params['vehicle_id'];
        $pickup_at  = sanitize_text_field( $params['pickup_at'] );
        $return_at  = sanitize_text_field( $params['return_at'] );

        // Validate dates
        $pickup_dt = DateTime::createFromFormat( 'Y-m-d H:i', $pickup_at );
        $return_dt = DateTime::createFromFormat( 'Y-m-d H:i', $return_at );
        if ( ! $pickup_dt || ! $return_dt ) {
            return new WP_Error( 'validation', '日時のフォーマットが正しくありません。', array( 'status' => 400 ) );
        }
        if ( $return_dt <= $pickup_dt ) {
            return new WP_Error( 'validation', '返却日時は貸出日時より後にしてください。', array( 'status' => 400 ) );
        }

        $pickup_at_full = $pickup_dt->format( 'Y-m-d H:i:s' );
        $return_at_full = $return_dt->format( 'Y-m-d H:i:s' );

        // Check vehicle exists
        $vehicle = RC_Model_Vehicle::find( $vehicle_id );
        if ( ! $vehicle || 'published' !== $vehicle->status ) {
            return new WP_Error( 'not_found', '選択された車両は利用できません。', array( 'status' => 404 ) );
        }

        // Check availability for each day
        $days = rc_calc_rental_days( $pickup_at_full, $return_at_full );
        $check_date = clone $pickup_dt;
        for ( $i = 0; $i < $days; $i++ ) {
            $date_str = $check_date->format( 'Y-m-d' );
            $avail = RC_Model_Slot::get_availability( $vehicle_id, $date_str );
            if ( 'holiday' === $avail['status'] ) {
                return new WP_Error( 'unavailable', $date_str . ' は休業日です。', array( 'status' => 409 ) );
            }
            if ( $avail['available'] <= 0 ) {
                return new WP_Error( 'unavailable', $date_str . ' は空きがありません。', array( 'status' => 409 ) );
            }
            $check_date->modify( '+1 day' );
        }

        // Validate email
        $email = sanitize_email( $params['customer_email'] );
        if ( ! is_email( $email ) ) {
            return new WP_Error( 'validation', '正しいメールアドレスを入力してください。', array( 'status' => 400 ) );
        }

        // Calculate price
        $vehicle_price = RC_Model_Price::calculate( $vehicle_id, $pickup_at_full, $return_at_full );

        // Process options
        $options_total = 0;
        $option_items  = array();
        if ( ! empty( $params['options'] ) && is_array( $params['options'] ) ) {
            foreach ( $params['options'] as $opt ) {
                $opt_id  = (int) $opt['id'];
                $opt_qty = isset( $opt['quantity'] ) ? max( 1, (int) $opt['quantity'] ) : 1;
                $opt_amount = RC_Model_Option::calculate( $opt_id, $opt_qty, $days );
                $options_total += $opt_amount;
                $option_items[] = array(
                    'option_id' => $opt_id,
                    'quantity'  => $opt_qty,
                    'amount'    => $opt_amount,
                );
            }
        }

        $total_amount = $vehicle_price + $options_total;

        // Determine payment method
        $payment_method = isset( $params['payment_method'] ) ? sanitize_text_field( $params['payment_method'] ) : 'onsite';

        // Create reservation
        $reservation_data = array(
            'vehicle_id'       => $vehicle_id,
            'pickup_at'        => $pickup_at_full,
            'return_at'        => $return_at_full,
            'status'           => RC_STATUS_PENDING,
            'payment_status'   => RC_PAY_UNPAID,
            'customer_name'    => sanitize_text_field( $params['customer_name'] ),
            'customer_kana'    => sanitize_text_field( $params['customer_kana'] ),
            'customer_tel'     => rc_sanitize_tel( $params['customer_tel'] ),
            'customer_email'   => $email,
            'customer_zip'     => rc_sanitize_zip( $params['customer_zip'] ),
            'customer_address' => sanitize_textarea_field( $params['customer_address'] ),
            'total_amount'     => $total_amount,
            'note'             => isset( $params['note'] ) ? sanitize_textarea_field( $params['note'] ) : '',
            'raw_payload'      => wp_json_encode( $params, JSON_UNESCAPED_UNICODE ),
        );

        $reservation_id = RC_Model_Reservation::create( $reservation_data );
        if ( ! $reservation_id ) {
            return new WP_Error( 'create_failed', '予約の作成に失敗しました。', array( 'status' => 500 ) );
        }

        // Save reservation options
        global $wpdb;
        $ro_table = rc_table( 'reservation_options' );
        foreach ( $option_items as $item ) {
            $wpdb->insert( $ro_table, array(
                'reservation_id' => $reservation_id,
                'option_id'      => $item['option_id'],
                'quantity'        => $item['quantity'],
                'amount'         => $item['amount'],
                'created_at'     => rc_now(),
            ) );
        }

        // Handle payment
        if ( 'onsite' === $payment_method ) {
            RC_Model_Payment::create( array(
                'reservation_id' => $reservation_id,
                'gateway'        => 'onsite',
                'transaction_id' => '',
                'amount'         => $total_amount,
                'status'         => 'pending_onsite',
            ) );
            RC_Model_Reservation::update( $reservation_id, array(
                'status' => RC_STATUS_CONFIRMED,
            ) );
        }

        // Get the created reservation
        $reservation = RC_Model_Reservation::find( $reservation_id );

        // Send emails
        RC_Mailer::send( RC_MAIL_APPLICANT_CREATED, $reservation_id );
        RC_Mailer::send( RC_MAIL_ADMIN_CREATED, $reservation_id );

        return rest_ensure_response( array(
            'success'          => true,
            'reservation_code' => $reservation->reservation_code,
            'total_amount'     => $total_amount,
            'status'           => $reservation->status,
        ) );
    }

    /**
     * POST /reservations/calculate — Calculate price.
     */
    public function calculate_price( $request ) {
        $params     = $request->get_json_params();
        $vehicle_id = isset( $params['vehicle_id'] ) ? (int) $params['vehicle_id'] : 0;
        $pickup_at  = isset( $params['pickup_at'] ) ? sanitize_text_field( $params['pickup_at'] ) : '';
        $return_at  = isset( $params['return_at'] ) ? sanitize_text_field( $params['return_at'] ) : '';

        if ( ! $vehicle_id || ! $pickup_at || ! $return_at ) {
            return new WP_Error( 'validation', 'パラメータが不足しています。', array( 'status' => 400 ) );
        }

        $pickup_dt = DateTime::createFromFormat( 'Y-m-d H:i', $pickup_at );
        $return_dt = DateTime::createFromFormat( 'Y-m-d H:i', $return_at );
        if ( ! $pickup_dt || ! $return_dt ) {
            return new WP_Error( 'validation', '日時のフォーマットが正しくありません。', array( 'status' => 400 ) );
        }

        $pickup_at_full = $pickup_dt->format( 'Y-m-d H:i:s' );
        $return_at_full = $return_dt->format( 'Y-m-d H:i:s' );
        $days = rc_calc_rental_days( $pickup_at_full, $return_at_full );
        $vehicle_price = RC_Model_Price::calculate( $vehicle_id, $pickup_at_full, $return_at_full );

        // Options
        $options_total = 0;
        $option_details = array();
        if ( ! empty( $params['options'] ) && is_array( $params['options'] ) ) {
            foreach ( $params['options'] as $opt ) {
                $opt_id  = (int) $opt['id'];
                $opt_qty = isset( $opt['quantity'] ) ? max( 1, (int) $opt['quantity'] ) : 1;
                $option  = RC_Model_Option::find( $opt_id );
                $amt     = RC_Model_Option::calculate( $opt_id, $opt_qty, $days );
                $options_total += $amt;
                if ( $option ) {
                    $option_details[] = array(
                        'id'       => $opt_id,
                        'name'     => $option->name,
                        'quantity' => $opt_qty,
                        'amount'   => $amt,
                    );
                }
            }
        }

        return rest_ensure_response( array(
            'days'          => $days,
            'vehicle_price' => $vehicle_price,
            'options_total' => $options_total,
            'total_amount'  => $vehicle_price + $options_total,
            'options'       => $option_details,
        ) );
    }
}
