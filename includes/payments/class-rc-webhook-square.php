<?php
/**
 * Square webhook handler (legacy class — logic in REST controller).
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Webhook_Square {

    /**
     * Verify webhook signature.
     *
     * @param string $body      Raw request body.
     * @param string $signature Header signature.
     * @param string $url       Webhook URL.
     * @param string $sig_key   Webhook signature key.
     * @return bool
     */
    public static function verify_signature( $body, $signature, $url, $sig_key ) {
        if ( empty( $sig_key ) || empty( $signature ) ) {
            return false;
        }
        $expected = base64_encode( hash_hmac( 'sha256', $url . $body, $sig_key, true ) );
        return hash_equals( $expected, $signature );
    }
}
