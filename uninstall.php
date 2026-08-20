<?php
/**
 * Uninstall handler — removes all plugin data.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

// Drop all tables
$tables = array(
    'vehicles', 'vehicle_meta', 'prices', 'options', 'slots', 'holidays',
    'reservations', 'reservation_options', 'payments', 'refunds',
    'mail_templates', 'mail_logs', 'settings'
);

foreach ( $tables as $table ) {
    $full = $wpdb->prefix . 'rc_' . $table;
    $wpdb->query( "DROP TABLE IF EXISTS {$full}" );
}

// Remove options
delete_option( 'rc_opt_db_version' );

// Clear cron
wp_clear_scheduled_hook( 'rc_cron_retry_mail' );
wp_clear_scheduled_hook( 'rc_cron_reminder' );

// Clear transients
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_rc_rate_%'" );
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_rc_rate_%'" );
