<?php
/**
 * Vehicle model.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Model_Vehicle {

    /**
     * Get all published vehicles.
     *
     * @param array $args Query arguments.
     * @return array
     */
    public static function all( $args = array() ) {
        global $wpdb;
        $table = rc_table( 'vehicles' );

        $defaults = array(
            'status'   => 'published',
            'orderby'  => 'sort_order',
            'order'    => 'ASC',
            'per_page' => 100,
            'page'     => 1,
        );
        $args = wp_parse_args( $args, $defaults );

        $where = '1=1';
        $params = array();

        if ( ! empty( $args['status'] ) && 'all' !== $args['status'] ) {
            $where .= ' AND status = %s';
            $params[] = $args['status'];
        }
        if ( ! empty( $args['search'] ) ) {
            $where .= ' AND (name LIKE %s OR slug LIKE %s)';
            $like = '%' . $wpdb->esc_like( $args['search'] ) . '%';
            $params[] = $like;
            $params[] = $like;
        }

        $orderby = sanitize_sql_orderby( $args['orderby'] . ' ' . $args['order'] );
        if ( ! $orderby ) {
            $orderby = 'sort_order ASC';
        }

        $offset = ( (int) $args['page'] - 1 ) * (int) $args['per_page'];
        $limit  = (int) $args['per_page'];

        if ( ! empty( $params ) ) {
            $sql = $wpdb->prepare(
                "SELECT * FROM {$table} WHERE {$where} ORDER BY {$orderby} LIMIT %d OFFSET %d",
                array_merge( $params, array( $limit, $offset ) )
            );
        } else {
            $sql = $wpdb->prepare(
                "SELECT * FROM {$table} WHERE {$where} ORDER BY {$orderby} LIMIT %d OFFSET %d",
                $limit, $offset
            );
        }

        return $wpdb->get_results( $sql );
    }

    /**
     * Count vehicles.
     *
     * @param string $status Status filter.
     * @return int
     */
    public static function count( $status = 'all' ) {
        global $wpdb;
        $table = rc_table( 'vehicles' );
        if ( 'all' !== $status ) {
            return (int) $wpdb->get_var(
                $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE status = %s", $status )
            );
        }
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
    }

    /**
     * Find by ID.
     *
     * @param int $id Vehicle ID.
     * @return object|null
     */
    public static function find( $id ) {
        global $wpdb;
        $table = rc_table( 'vehicles' );
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id )
        );
    }

    /**
     * Find by slug.
     *
     * @param string $slug Vehicle slug.
     * @return object|null
     */
    public static function find_by_slug( $slug ) {
        global $wpdb;
        $table = rc_table( 'vehicles' );
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$table} WHERE slug = %s", $slug )
        );
    }

    /**
     * Create a vehicle.
     *
     * @param array $data Vehicle data.
     * @return int|false Inserted ID or false.
     */
    public static function create( $data ) {
        global $wpdb;
        $table = rc_table( 'vehicles' );
        $now   = rc_now();

        $defaults = array(
            'slug'         => '',
            'name'         => '',
            'description'  => '',
            'thumbnail_id' => 0,
            'base_price'   => 0,
            'stock'        => 1,
            'status'       => 'published',
            'sort_order'   => 0,
            'created_at'   => $now,
            'updated_at'   => $now,
        );
        $data = wp_parse_args( $data, $defaults );

        // Auto-generate slug
        if ( empty( $data['slug'] ) && ! empty( $data['name'] ) ) {
            $data['slug'] = sanitize_title( $data['name'] ) . '-' . wp_rand( 1000, 9999 );
        }

        $result = $wpdb->insert( $table, $data );
        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Update a vehicle.
     *
     * @param int   $id   Vehicle ID.
     * @param array $data Updated data.
     * @return bool
     */
    public static function update( $id, $data ) {
        global $wpdb;
        $table = rc_table( 'vehicles' );
        $data['updated_at'] = rc_now();
        return false !== $wpdb->update( $table, $data, array( 'id' => $id ) );
    }

    /**
     * Delete a vehicle.
     *
     * @param int $id Vehicle ID.
     * @return bool
     */
    public static function delete( $id ) {
        global $wpdb;
        // Delete related meta
        $wpdb->delete( rc_table( 'vehicle_meta' ), array( 'vehicle_id' => $id ) );
        // Delete related prices
        $wpdb->delete( rc_table( 'prices' ), array( 'vehicle_id' => $id ) );
        // Delete related slots
        $wpdb->delete( rc_table( 'slots' ), array( 'vehicle_id' => $id ) );
        // Delete related blocks
        $wpdb->delete( rc_table( 'vehicle_blocks' ), array( 'vehicle_id' => $id ) );
        // Delete vehicle
        return false !== $wpdb->delete( rc_table( 'vehicles' ), array( 'id' => $id ) );
    }

    /**
     * Get vehicle meta value.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $meta_key   Meta key.
     * @param string $default    Default value.
     * @return string
     */
    public static function get_meta( $vehicle_id, $meta_key, $default = '' ) {
        global $wpdb;
        $table = rc_table( 'vehicle_meta' );
        $val = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT meta_value FROM {$table} WHERE vehicle_id = %d AND meta_key = %s LIMIT 1",
                $vehicle_id, $meta_key
            )
        );
        return ( null !== $val ) ? $val : $default;
    }

    /**
     * Set vehicle meta value.
     *
     * @param int    $vehicle_id Vehicle ID.
     * @param string $meta_key   Meta key.
     * @param string $meta_value Meta value.
     * @return bool
     */
    public static function set_meta( $vehicle_id, $meta_key, $meta_value ) {
        global $wpdb;
        $table = rc_table( 'vehicle_meta' );
        $existing = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT id FROM {$table} WHERE vehicle_id = %d AND meta_key = %s LIMIT 1",
                $vehicle_id, $meta_key
            )
        );
        if ( $existing ) {
            return false !== $wpdb->update(
                $table,
                array( 'meta_value' => $meta_value ),
                array( 'id' => $existing )
            );
        }
        return false !== $wpdb->insert( $table, array(
            'vehicle_id' => $vehicle_id,
            'meta_key'   => $meta_key,
            'meta_value' => $meta_value,
        ) );
    }

    /**
     * Get all meta for a vehicle.
     *
     * @param int $vehicle_id Vehicle ID.
     * @return array Associative array of meta_key => meta_value.
     */
    public static function get_all_meta( $vehicle_id ) {
        global $wpdb;
        $table = rc_table( 'vehicle_meta' );
        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT meta_key, meta_value FROM {$table} WHERE vehicle_id = %d", $vehicle_id )
        );
        $meta = array();
        foreach ( $rows as $row ) {
            $meta[ $row->meta_key ] = $row->meta_value;
        }
        return $meta;
    }

    /**
     * Get thumbnail URL.
     *
     * @param int    $thumbnail_id WP Media attachment ID.
     * @param string $size         Image size.
     * @return string URL or empty.
     */
    public static function get_thumbnail_url( $thumbnail_id, $size = 'medium' ) {
        if ( ! $thumbnail_id ) {
            return '';
        }
        $url = wp_get_attachment_image_url( $thumbnail_id, $size );
        return $url ? $url : '';
    }
}
