<?php
/**
 * Security utilities: reCAPTCHA and rate limiting.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Security {

    /**
     * Verify reCAPTCHA v3 token.
     *
     * @param string $token Token from client.
     * @return bool
     */
    public static function verify_recaptcha( $token ) {
        $secret = rc_get_setting( 'recaptcha_secret_key' );
        if ( empty( $secret ) ) {
            // If not configured, skip verification
            return true;
        }
        if ( empty( $token ) ) {
            return false;
        }

        $response = wp_remote_post( 'https://www.google.com/recaptcha/api/siteverify', array(
            'body' => array(
                'secret'   => $secret,
                'response' => $token,
                'remoteip' => self::get_client_ip(),
            ),
        ) );

        if ( is_wp_error( $response ) ) {
            RC_Logger::error( 'reCAPTCHA verify failed', array( 'error' => $response->get_error_message() ) );
            return false;
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( empty( $body['success'] ) ) {
            return false;
        }

        $threshold = (float) rc_get_setting( 'recaptcha_score', '0.5' );
        return isset( $body['score'] ) && $body['score'] >= $threshold;
    }

    /**
     * Check rate limit per IP using transients.
     *
     * @param string $action Action name.
     * @return bool True if within limit, false if exceeded.
     */
    public static function check_rate_limit( $action = 'default' ) {
        $limit = (int) rc_get_setting( 'rate_limit_per_minute', 10 );
        if ( $limit <= 0 ) {
            return true;
        }

        $ip  = self::get_client_ip();
        $key = 'rc_rate_' . md5( $action . $ip );
        $current = (int) get_transient( $key );

        if ( $current >= $limit ) {
            return false;
        }

        set_transient( $key, $current + 1, 60 );
        return true;
    }

    /**
     * Get client IP address.
     *
     * @return string
     */
    public static function get_client_ip() {
        $headers = array(
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR',
        );
        foreach ( $headers as $header ) {
            if ( ! empty( $_SERVER[ $header ] ) ) {
                $ip = sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) );
                // X-Forwarded-For may contain multiple IPs
                if ( strpos( $ip, ',' ) !== false ) {
                    $ip = trim( explode( ',', $ip )[0] );
                }
                if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
                    return $ip;
                }
            }
        }
        return '127.0.0.1';
    }
}
