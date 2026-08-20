<?php
/**
 * Simple logger using error_log.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Logger {

    /**
     * Log an info message.
     *
     * @param string $message Message.
     * @param array  $context Context data.
     */
    public static function info( $message, $context = array() ) {
        self::log( 'INFO', $message, $context );
    }

    /**
     * Log a warning message.
     *
     * @param string $message Message.
     * @param array  $context Context data.
     */
    public static function warning( $message, $context = array() ) {
        self::log( 'WARNING', $message, $context );
    }

    /**
     * Log an error message.
     *
     * @param string $message Message.
     * @param array  $context Context data.
     */
    public static function error( $message, $context = array() ) {
        self::log( 'ERROR', $message, $context );
    }

    /**
     * Write to error_log.
     *
     * @param string $level   Log level.
     * @param string $message Message.
     * @param array  $context Context data.
     */
    private static function log( $level, $message, $context = array() ) {
        $entry = sprintf(
            '[RentacarBooking][%s] %s',
            $level,
            $message
        );
        if ( ! empty( $context ) ) {
            $entry .= ' | ' . wp_json_encode( $context, JSON_UNESCAPED_UNICODE );
        }
        error_log( $entry );
    }
}
