<?php
/**
 * Mail template model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Mail_Template {

    /**
     * Get all templates.
     *
     * @return array
     */
    public static function all() {
        global $wpdb;
        return $wpdb->get_results(
            "SELECT * FROM " . rc_table( 'mail_templates' ) . " ORDER BY id ASC"
        );
    }

    /**
     * Find by ID.
     *
     * @param int $id Template ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM " . rc_table( 'mail_templates' ) . " WHERE id = %d", $id
            )
        );
    }

    /**
     * Find by template key.
     *
     * @param string $key Template key.
     * @return object|null
     */
    public static function find_by_key( $key ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM " . rc_table( 'mail_templates' ) . " WHERE template_key = %s", $key
            )
        );
    }

    /**
     * Update a template.
     *
     * @param int   $id   Template ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        $data['updated_at'] = rc_now();
        return false !== $wpdb->update(
            rc_table( 'mail_templates' ), $data, array( 'id' => $id )
        );
    }
}
