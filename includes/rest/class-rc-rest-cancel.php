<?php
/**
 * Public REST: cancel endpoints.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Rest_Cancel {

    public function register_routes() {
        register_rest_route( RC_REST_NAMESPACE, '/cancel/lookup', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'lookup' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( RC_REST_NAMESPACE, '/cancel', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'cancel' ),
            'permission_callback' => '__return_true',
        ) );
    }

    /**
     * POST /cancel/lookup — Lookup reservation by code.
     */
    public function lookup( $request ) {
        if ( ! RC_Security::check_rate_limit( 'cancel_lookup' ) ) {
            return new WP_Error( 'rate_limited', 'リクエストが多すぎます。', array( 'status' => 429 ) );
        }

        $params = $request->get_json_params();
        $code   = isset( $params['code'] ) ? sanitize_text_field( $params['code'] ) : '';

        if ( empty( $code ) ) {
            return new WP_Error( 'validation', '予約番号を入力してください。', array( 'status' => 400 ) );
        }

        $reservation = RC_Model_Reservation::find_by_code( $code );
        if ( ! $reservation ) {
            return new WP_Error( 'not_found', '予約が見つかりません。', array( 'status' => 404 ) );
        }

        if ( RC_STATUS_CANCELLED === $reservation->status ) {
            return new WP_Error( 'already_cancelled', 'この予約は既にキャンセルされています。', array( 'status' => 409 ) );
        }

        $vehicle = RC_Model_Vehicle::find( $reservation->vehicle_id );

        return rest_ensure_response( array(
            'reservation_code' => $reservation->reservation_code,
            'vehicle_name'     => $vehicle ? $vehicle->name : '',
            'pickup_at'        => $reservation->pickup_at,
            'return_at'        => $reservation->return_at,
            'total_amount'     => (int) $reservation->total_amount,
            'status'           => $reservation->status,
            'customer_name'    => $reservation->customer_name,
            'masked_email'     => rc_mask_email( $reservation->customer_email ),
        ) );
    }

    /**
     * POST /cancel — Execute cancellation with email verification.
     */
    public function cancel( $request ) {
        if ( ! RC_Security::check_rate_limit( 'cancel' ) ) {
            return new WP_Error( 'rate_limited', 'リクエストが多すぎます。', array( 'status' => 429 ) );
        }

        $params = $request->get_json_params();
        $code   = isset( $params['code'] ) ? sanitize_text_field( $params['code'] ) : '';
        $email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';

        if ( empty( $code ) || empty( $email ) ) {
            return new WP_Error( 'validation', '予約番号とメールアドレスを入力してください。', array( 'status' => 400 ) );
        }

        $reservation = RC_Model_Reservation::find_by_code( $code );
        if ( ! $reservation ) {
            return new WP_Error( 'not_found', '予約が見つかりません。', array( 'status' => 404 ) );
        }

        // Email verification
        if ( strtolower( $reservation->customer_email ) !== strtolower( $email ) ) {
            return new WP_Error( 'auth_failed', 'メールアドレスが一致しません。', array( 'status' => 403 ) );
        }

        if ( RC_STATUS_CANCELLED === $reservation->status ) {
            return new WP_Error( 'already_cancelled', 'この予約は既にキャンセルされています。', array( 'status' => 409 ) );
        }

        // Execute cancellation
        $result = RC_Model_Reservation::cancel( $reservation->id );
        if ( ! $result ) {
            return new WP_Error( 'cancel_failed', 'キャンセル処理に失敗しました。', array( 'status' => 500 ) );
        }

        // Send emails
        RC_Mailer::send( RC_MAIL_APPLICANT_CANCELLED, $reservation->id );
        RC_Mailer::send( RC_MAIL_ADMIN_CANCELLED, $reservation->id );

        return rest_ensure_response( array(
            'success'          => true,
            'reservation_code' => $reservation->reservation_code,
            'message'          => 'キャンセルが完了しました。',
        ) );
    }
}
