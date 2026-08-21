<?php
/**
 * Admin menu and page registration.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Admin {

    public static function init() {
        add_action( 'admin_menu', array( __CLASS__, 'add_menus' ) );
    }

    public static function add_menus() {
        // Main menu
        add_menu_page(
            'レンタカー予約',
            'レンタカー予約',
            'manage_options',
            'rc-dashboard',
            array( __CLASS__, 'render_page' ),
            'dashicons-car',
            30
        );

        $submenus = array(
            array( 'rc-dashboard',       'ダッシュボード',       'render_page' ),
            array( 'rc-vehicles',        '車両管理',           'render_page' ),
            array( 'rc-reservations',    '予約管理',           'render_page' ),
            array( 'rc-options',         'オプション',         'render_page' ),
            array( 'rc-holidays',        '休業日',             'render_page' ),
            array( 'rc-mail-templates',  'メールテンプレート', 'render_page' ),
            array( 'rc-mail-logs',       'メールログ',         'render_page' ),
            array( 'rc-settings',        '設定',               'render_page' ),
            array( 'rc-system',          'システム情報',       'render_page' ),
        );

        foreach ( $submenus as $sm ) {
            add_submenu_page(
                'rc-dashboard',
                $sm[1],
                $sm[1],
                'manage_options',
                $sm[0],
                array( __CLASS__, $sm[2] )
            );
        }
    }

    public static function render_page() {
        $screen = get_current_screen();
        $page   = '';
        if ( $screen ) {
            // Extract page slug from screen id
            $parts = explode( '_page_', $screen->id );
            $page  = end( $parts );
            if ( strpos( $page, 'toplevel_page_' ) === 0 ) {
                $page = str_replace( 'toplevel_page_', '', $screen->id );
            }
        }
        // Map slug to view file
        $slug = str_replace( 'rc-', '', $page );
        if ( empty( $slug ) ) {
            $slug = 'dashboard';
        }
        $view = RC_PLUGIN_DIR . 'admin/views/' . $slug . '.php';
        if ( file_exists( $view ) ) {
            include $view;
        } else {
            echo '<div class="wrap"><h1>レンタカー予約</h1>';
            echo '<div id="rc-admin-app" data-page="' . esc_attr( $slug ) . '"></div></div>';
        }
    }
}
