<?php
/**
 * Mail log model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Mail_Log {

    /**
     * Get logs with filters.
     *
     * @param array $args Query arguments.
     * @return array
     */
    public static function all( $args = array() ) {
        global $wpdb;
        $table = rc_table( 'mail_logs' );

        $defaults = array(
            'reservation_id' => 0,
            'status'         => '',
            'per_page'       => 20,
            'page'           => 1,
        );
        $args   = wp_parse_args( $args, $defaults );
        $where  = '1=1';
        $params = array();

        if ( ! empty( $args['reservation_id'] ) ) {
            $where .= ' AND reservation_id = %d';
            $params[] = (int) $args['reservation_id'];
        }
        if ( ! empty( $args['status'] ) ) {
            $where .= ' AND status = %s';
            $params[] = $args['status'];
        }

        $offset = ( (int) $args['page'] - 1 ) * (int) $args['per_page'];
        $limit  = (int) $args['per_page'];
        $params[] = $limit;
        $params[] = $offset;

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE {$where} ORDER BY created_at DESC LIMIT %d OFFSET %d",
                $params
            )
        );
    }

    /**
     * Find by ID.
     *
     * @param int $id Log ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM " . rc_table( 'mail_logs' ) . " WHERE id = %d", $id )
        );
    }

    /**
     * Create a log entry.
     *
     * @param array $data Log data.
     * @return int|false
     */
    public static function create( $data ) {
        global $wpdb;
        $defaults = array(
            'reservation_id' => 0,
            'template_key'   => '',
            'to_address'     => '',
            'subject'        => '',
            'body'           => '',
            'status'         => 'pending',
            'retry_count'    => 0,
            'sent_at'        => null,
            'created_at'     => rc_now(),
        );
        $data = wp_parse_args( $data, $defaults );
        $result = $wpdb->insert( rc_table( 'mail_logs' ), $data );
        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Update a log entry.
     *
     * @param int   $id   Log ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        return false !== $wpdb->update( rc_table( 'mail_logs' ), $data, array( 'id' => $id ) );
    }

    /**
     * Count logs.
     *
     * @param array $args Filter.
     * @return int
     */
    public static function count( $args = array() ) {
        global $wpdb;
        $table  = rc_table( 'mail_logs' );
        $where  = '1=1';
        $params = array();

        if ( ! empty( $args['status'] ) ) {
            $where .= ' AND status = %s';
            $params[] = $args['status'];
        }
        if ( ! empty( $params ) ) {
            return (int) $wpdb->get_var(
                $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE {$where}", $params )
            );
        }
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
    }

    /**
     * Resend a failed mail log entry.
     *
     * @param int $id Log ID.
     * @return bool
     */
    public static function resend( $id ) {
        $log = self::find( $id );
        if ( ! $log ) {
            return false;
        }
        $headers = array( 'Content-Type: text/plain; charset=UTF-8' );
        $sent = wp_mail( $log->to_address, $log->subject, $log->body, $headers );
        if ( $sent ) {
            self::update( $id, array(
                'status'      => 'sent',
                'sent_at'     => rc_now(),
                'retry_count' => $log->retry_count + 1,
            ) );
        } else {
            self::update( $id, array( 'retry_count' => $log->retry_count + 1 ) );
        }
        return $sent;
    }
}
