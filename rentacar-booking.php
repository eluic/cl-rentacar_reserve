<?php
/**
 * Plugin Name:       Rentacar Booking
 * Plugin URI:        https://example.com/rentacar-booking
 * Description:       レンタカー予約システム — 車両管理・予約管理・決済・メール通知を一括管理
 * Version:           1.1.1
 * Author:            CL Rentacar
 * Author URI:        https://example.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       rentacar-booking
 * Domain Path:       /languages
 * Requires PHP:      7.4
 * Requires at least: 5.8
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ── Constants & helpers ────────────────────────────── */
require_once __DIR__ . '/includes/helpers/rc-constants.php';
require_once __DIR__ . '/includes/helpers/rc-helpers.php';

/* ── Core classes ───────────────────────────────────── */
require_once __DIR__ . '/includes/class-rc-activator.php';
require_once __DIR__ . '/includes/class-rc-deactivator.php';
require_once __DIR__ . '/includes/class-rc-migration.php';
require_once __DIR__ . '/includes/class-rc-logger.php';
require_once __DIR__ . '/includes/class-rc-security.php';
require_once __DIR__ . '/includes/class-rc-assets.php';
require_once __DIR__ . '/includes/class-rc-shortcode.php';
require_once __DIR__ . '/includes/class-rc-rest.php';
require_once __DIR__ . '/includes/class-rc-mailer.php';

/* ── Models ─────────────────────────────────────────── */
require_once __DIR__ . '/includes/models/class-rc-model-vehicle.php';
require_once __DIR__ . '/includes/models/class-rc-model-reservation.php';
require_once __DIR__ . '/includes/models/class-rc-model-slot.php';
require_once __DIR__ . '/includes/models/class-rc-model-vehicle-block.php';
require_once __DIR__ . '/includes/models/class-rc-model-price.php';
require_once __DIR__ . '/includes/models/class-rc-model-option.php';
require_once __DIR__ . '/includes/models/class-rc-model-payment.php';
require_once __DIR__ . '/includes/models/class-rc-model-refund.php';
require_once __DIR__ . '/includes/models/class-rc-model-mail-template.php';
require_once __DIR__ . '/includes/models/class-rc-model-mail-log.php';

/* ── Payments ───────────────────────────────────────── */
require_once __DIR__ . '/includes/payments/interface-rc-payment-gateway.php';
require_once __DIR__ . '/includes/payments/class-rc-payment-manager.php';
require_once __DIR__ . '/includes/payments/class-rc-gateway-square.php';
require_once __DIR__ . '/includes/payments/class-rc-gateway-onsite.php';
require_once __DIR__ . '/includes/payments/class-rc-webhook-square.php';

/* ── REST controllers ───────────────────────────────── */
require_once __DIR__ . '/includes/rest/class-rc-rest-vehicles.php';
require_once __DIR__ . '/includes/rest/class-rc-rest-availability.php';
require_once __DIR__ . '/includes/rest/class-rc-rest-reservations.php';
require_once __DIR__ . '/includes/rest/class-rc-rest-cancel.php';
require_once __DIR__ . '/includes/rest/class-rc-rest-options.php';
require_once __DIR__ . '/includes/rest/class-rc-rest-payment-config.php';
require_once __DIR__ . '/includes/rest/class-rc-rest-webhook-square.php';

/* ── Admin REST controllers ─────────────────────────── */
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-vehicles.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-vehicle-prices.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-vehicle-blocks.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-options.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-holidays.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-reservations.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-payments.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-mail-templates.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-mail-logs.php';
require_once __DIR__ . '/includes/rest/admin/class-rc-rest-admin-settings.php';

/* ── Admin ──────────────────────────────────────────── */
require_once __DIR__ . '/admin/class-rc-admin.php';

/* ── Public ─────────────────────────────────────────── */
require_once __DIR__ . '/public/class-rc-public.php';

/* ── Plugin class ───────────────────────────────────── */
require_once __DIR__ . '/includes/class-rc-plugin.php';

/* ── Activation / Deactivation ──────────────────────── */
register_activation_hook( __FILE__, array( 'RC_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'RC_Deactivator', 'deactivate' ) );

/* ── Boot ───────────────────────────────────────────── */
add_action( 'plugins_loaded', function() {
    RC_Plugin::get_instance();
} );
