<?php
/**
 * Helper functions.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Return the prefixed table name.
 *
 * @param string $name Table name without prefix (e.g. 'vehicles').
 * @return string Full table name (e.g. 'wp_rc_vehicles').
 */
function rc_table( $name ) {
    global $wpdb;
    return $wpdb->prefix . 'rc_' . $name;
}

/**
 * Format price for display (JPY).
 *
 * @param int $amount Amount in yen.
 * @return string Formatted price string.
 */
function rc_format_price( $amount ) {
    return '¥' . number_format( (int) $amount );
}

/**
 * Current datetime in MySQL format (Asia/Tokyo).
 *
 * @return string Y-m-d H:i:s
 */
function rc_now() {
    return current_time( 'mysql' );
}

/**
 * Current date in Y-m-d format (Asia/Tokyo).
 *
 * @return string Y-m-d
 */
function rc_today() {
    return current_time( 'Y-m-d' );
}

/**
 * Generate a unique reservation code.
 *
 * @return string e.g. RC-A1B2C3D4
 */
function rc_generate_reservation_code() {
    $chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code   = '';
    for ( $i = 0; $i < RC_RESERVATION_CODE_LENGTH; $i++ ) {
        $code .= $chars[ wp_rand( 0, strlen( $chars ) - 1 ) ];
    }
    return RC_RESERVATION_PREFIX . $code;
}

/**
 * Sanitize a phone number (digits, hyphens, plus).
 *
 * @param string $tel Raw phone number.
 * @return string Sanitized phone number.
 */
function rc_sanitize_tel( $tel ) {
    return preg_replace( '/[^0-9\-\+]/', '', $tel );
}

/**
 * Sanitize a postal code (digits, hyphens).
 *
 * @param string $zip Raw zip code.
 * @return string Sanitized zip code.
 */
function rc_sanitize_zip( $zip ) {
    return preg_replace( '/[^0-9\-]/', '', $zip );
}

/**
 * Mask an email address for privacy display.
 *
 * @param string $email Full email address.
 * @return string Masked email (e.g. te****@example.com).
 */
function rc_mask_email( $email ) {
    if ( ! is_email( $email ) ) {
        return '****@****.***';
    }
    $parts  = explode( '@', $email );
    $local  = $parts[0];
    $domain = $parts[1];
    $len    = strlen( $local );
    if ( $len <= 2 ) {
        $masked = $local[0] . str_repeat( '*', 4 );
    } else {
        $masked = substr( $local, 0, 2 ) . str_repeat( '*', 4 );
    }
    return $masked . '@' . $domain;
}

/**
 * Calculate rental days from pickup and return datetimes.
 *
 * @param string $pickup_at  Y-m-d H:i:s
 * @param string $return_at  Y-m-d H:i:s
 * @return int Number of rental days (minimum 1).
 */
function rc_calc_rental_days( $pickup_at, $return_at ) {
    $pickup  = new DateTime( $pickup_at );
    $return  = new DateTime( $return_at );
    $diff    = $pickup->diff( $return );
    $days    = $diff->days;
    // If there are remaining hours, count as an extra day
    if ( $diff->h > 0 || $diff->i > 0 ) {
        $days += 1;
    }
    return max( 1, $days );
}

/**
 * Get a setting value from rc_settings table.
 *
 * @param string $key     Setting key.
 * @param mixed  $default Default value.
 * @return mixed
 */
function rc_get_setting( $key, $default = '' ) {
    global $wpdb;
    $table = rc_table( 'settings' );
    $val   = $wpdb->get_var(
        $wpdb->prepare( "SELECT setting_value FROM {$table} WHERE setting_key = %s LIMIT 1", $key )
    );
    return ( null !== $val ) ? $val : $default;
}

/**
 * Update a setting value in rc_settings table.
 *
 * @param string $key   Setting key.
 * @param string $value Setting value.
 * @return bool
 */
function rc_update_setting( $key, $value ) {
    global $wpdb;
    $table    = rc_table( 'settings' );
    $existing = $wpdb->get_var(
        $wpdb->prepare( "SELECT id FROM {$table} WHERE setting_key = %s LIMIT 1", $key )
    );
    if ( $existing ) {
        return false !== $wpdb->update(
            $table,
            array( 'setting_value' => $value, 'updated_at' => rc_now() ),
            array( 'setting_key' => $key ),
            array( '%s', '%s' ),
            array( '%s' )
        );
    }
    return false !== $wpdb->insert(
        $table,
        array( 'setting_key' => $key, 'setting_value' => $value, 'updated_at' => rc_now() ),
        array( '%s', '%s', '%s' )
    );
}

/**
 * Encrypt a sensitive value using AUTH_KEY.
 *
 * @param string $plain Plain text.
 * @return string Base64 encoded encrypted string.
 */
function rc_encrypt( $plain ) {
    if ( empty( $plain ) ) {
        return '';
    }
    $key    = substr( hash( 'sha256', AUTH_KEY ), 0, 32 );
    $iv     = substr( hash( 'sha256', SECURE_AUTH_KEY ), 0, 16 );
    $cipher = openssl_encrypt( $plain, 'AES-256-CBC', $key, 0, $iv );
    return base64_encode( $cipher );
}

/**
 * Decrypt a sensitive value using AUTH_KEY.
 *
 * @param string $encrypted Base64 encoded encrypted string.
 * @return string Decrypted plain text.
 */
function rc_decrypt( $encrypted ) {
    if ( empty( $encrypted ) ) {
        return '';
    }
    $key   = substr( hash( 'sha256', AUTH_KEY ), 0, 32 );
    $iv    = substr( hash( 'sha256', SECURE_AUTH_KEY ), 0, 16 );
    $plain = openssl_decrypt( base64_decode( $encrypted ), 'AES-256-CBC', $key, 0, $iv );
    return ( false !== $plain ) ? $plain : '';
}

/**
 * Validate katakana string.
 *
 * @param string $str Input string.
 * @return bool
 */
function rc_is_katakana( $str ) {
    return (bool) preg_match( '/\A[ァ-ヶー　\s]+\z/u', $str );
}

/**
 * Get cancel page URL.
 *
 * @param string $code Reservation code.
 * @return string
 */
function rc_cancel_url( $code = '' ) {
    $page_id = (int) rc_get_setting( 'cancel_page_id', 0 );
    if ( $page_id > 0 ) {
        $url = get_permalink( $page_id );
    } else {
        $url = home_url( '/cancel/' );
    }
    if ( $code ) {
        $url = add_query_arg( 'code', $code, $url );
    }
    return $url;
}
