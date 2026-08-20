<?php
/**
 * Version-based DB migration.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Migration {

    /**
     * Run pending migrations.
     *
     * @param string $from_version Current DB version stored in options.
     */
    public static function run( $from_version ) {
        $migrations = self::get_migrations();
        foreach ( $migrations as $version => $method ) {
            if ( version_compare( $from_version, $version, '<' ) ) {
                call_user_func( array( __CLASS__, $method ) );
            }
        }
        // dbDelta is idempotent — always safe to call
        RC_Activator::create_tables();
        update_option( RC_OPT_DB_VERSION, RC_DB_VERSION );
    }

    /**
     * Migration map: version => method name.
     *
     * @return array
     */
    private static function get_migrations() {
        return array(
            // '1.1.0' => 'migrate_to_1_1_0',
        );
    }
}
