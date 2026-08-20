<?php
/**
 * Mail sending with phpmailer_init hook + retry.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RC_Mailer {

    /**
     * Register hooks.
     */
    public static function init() {
        add_action( 'phpmailer_init', array( __CLASS__, 'configure_phpmailer' ), 999 );
    }

    /**
     * Configure PHPMailer From / Sender / Reply-To.
     *
     * @param PHPMailer\PHPMailer\PHPMailer $phpmailer PHPMailer instance.
     */
    public static function configure_phpmailer( $phpmailer ) {
        $domain      = wp_parse_url( home_url(), PHP_URL_HOST );
        $from_email  = 'wordpress@' . $domain;
        $store_name  = rc_get_setting( 'store_name', get_bloginfo( 'name' ) );
        $store_email = rc_get_setting( 'store_email', get_option( 'admin_email' ) );

        $phpmailer->setFrom( $from_email, $store_name );
        $phpmailer->Sender = $from_email;

        if ( ! empty( $store_email ) ) {
            $phpmailer->clearReplyTos();
            $phpmailer->addReplyTo( $store_email, $store_name );
        }
    }

    /**
     * Send a templated email for a reservation.
     *
     * @param string $template_key Template key.
     * @param int    $reservation_id Reservation ID.
     * @return bool
     */
    public static function send( $template_key, $reservation_id ) {
        $template = RC_Model_Mail_Template::find_by_key( $template_key );
        if ( ! $template || ! $template->enabled ) {
            return false;
        }

        $reservation = RC_Model_Reservation::find( $reservation_id );
        if ( ! $reservation ) {
            return false;
        }

        $vehicle = RC_Model_Vehicle::find( $reservation->vehicle_id );

        // Determine recipient
        if ( 'admin' === $template->to_type ) {
            $to = rc_get_setting( 'store_email', get_option( 'admin_email' ) );
        } else {
            $to = $reservation->customer_email;
        }

        // Build placeholders
        $placeholders = self::build_placeholders( $reservation, $vehicle );

        // Replace in subject and body
        $subject = self::replace_placeholders( $template->subject, $placeholders );
        $body    = self::replace_placeholders( $template->body, $placeholders );

        // Headers
        $headers = array( 'Content-Type: text/plain; charset=UTF-8' );

        // Log before sending
        $log_id = RC_Model_Mail_Log::create( array(
            'reservation_id' => $reservation_id,
            'template_key'   => $template_key,
            'to_address'     => $to,
            'subject'        => $subject,
            'body'           => $body,
            'status'         => 'pending',
            'retry_count'    => 0,
        ) );

        $sent = wp_mail( $to, $subject, $body, $headers );

        if ( $sent ) {
            RC_Model_Mail_Log::update( $log_id, array(
                'status'  => 'sent',
                'sent_at' => rc_now(),
            ) );
        } else {
            RC_Model_Mail_Log::update( $log_id, array(
                'status' => 'failed',
            ) );
            RC_Logger::error( 'Mail send failed', array(
                'template' => $template_key,
                'to'       => $to,
                'reservation_id' => $reservation_id,
            ) );
        }

        return $sent;
    }

    /**
     * Build placeholder values.
     *
     * @param object      $reservation Reservation row.
     * @param object|null $vehicle     Vehicle row.
     * @return array
     */
    private static function build_placeholders( $reservation, $vehicle = null ) {
        return array(
            '{customer_name}'    => $reservation->customer_name,
            '{reservation_code}' => $reservation->reservation_code,
            '{vehicle_name}'     => $vehicle ? $vehicle->name : '',
            '{pickup_at}'        => $reservation->pickup_at,
            '{return_at}'        => $reservation->return_at,
            '{total_amount}'     => rc_format_price( $reservation->total_amount ),
            '{cancel_url}'       => rc_cancel_url( $reservation->reservation_code ),
            '{store_name}'       => rc_get_setting( 'store_name', '' ),
            '{store_tel}'        => rc_get_setting( 'store_tel', '' ),
            '{store_email}'      => rc_get_setting( 'store_email', '' ),
            '{site_url}'         => home_url(),
        );
    }

    /**
     * Replace placeholders in text.
     *
     * @param string $text         Text with placeholders.
     * @param array  $placeholders Key-value pairs.
     * @return string
     */
    private static function replace_placeholders( $text, $placeholders ) {
        return str_replace( array_keys( $placeholders ), array_values( $placeholders ), $text );
    }

    /**
     * Retry failed emails (called by cron).
     */
    public static function retry_failed() {
        global $wpdb;
        $table = rc_table( 'mail_logs' );
        $rows  = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE status = 'failed' AND retry_count < %d ORDER BY created_at ASC LIMIT 20",
                RC_MAIL_MAX_RETRY
            )
        );

        foreach ( $rows as $row ) {
            $headers = array( 'Content-Type: text/plain; charset=UTF-8' );
            $sent    = wp_mail( $row->to_address, $row->subject, $row->body, $headers );

            if ( $sent ) {
                RC_Model_Mail_Log::update( $row->id, array(
                    'status'  => 'sent',
                    'sent_at' => rc_now(),
                    'retry_count' => $row->retry_count + 1,
                ) );
            } else {
                RC_Model_Mail_Log::update( $row->id, array(
                    'retry_count' => $row->retry_count + 1,
                ) );
            }
        }
    }

    /**
     * Send reminders for tomorrow's pickups (called by cron).
     */
    public static function send_reminders() {
        global $wpdb;
        $table    = rc_table( 'reservations' );
        $tomorrow = date( 'Y-m-d', strtotime( '+1 day', current_time( 'timestamp' ) ) );

        $reservations = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id FROM {$table} WHERE DATE(pickup_at) = %s AND status IN ('pending','confirmed')",
                $tomorrow
            )
        );

        foreach ( $reservations as $r ) {
            self::send( RC_MAIL_REMINDER, $r->id );
        }
    }
}
