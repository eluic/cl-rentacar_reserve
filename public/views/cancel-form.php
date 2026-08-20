<?php
/**
 * Cancel form template — 3 steps.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="rc-cancel-app" class="rc-cancel">
    <!-- Step 1: Reservation Code -->
    <div class="rc-cancel-step" data-step="1">
        <h2 class="rc-step-title">予約キャンセル</h2>
        <p class="rc-cancel-desc">キャンセルする予約の予約番号を入力してください。</p>
        <div class="rc-form-group">
            <label class="rc-label">予約番号</label>
            <input type="text" id="rc-cancel-code" class="rc-input" placeholder="RC-XXXXXXXX" maxlength="11">
            <span class="rc-error-msg" id="rc-cancel-code-error"></span>
        </div>
        <button type="button" class="rc-btn rc-btn-primary" id="rc-cancel-lookup-btn">予約を検索</button>
    </div>

    <!-- Step 2: Confirm + Email Verification -->
    <div class="rc-cancel-step" data-step="2" style="display:none">
        <h2 class="rc-step-title">予約内容の確認</h2>
        <div id="rc-cancel-details" class="rc-cancel-details"></div>
        <div class="rc-form-group">
            <label class="rc-label">ご本人確認のため、ご登録のメールアドレスを入力してください</label>
            <input type="email" id="rc-cancel-email" class="rc-input" placeholder="ご登録のメールアドレス">
            <span class="rc-error-msg" id="rc-cancel-email-error"></span>
        </div>
        <div class="rc-cancel-policy">
            <h4>キャンセルポリシー</h4>
            <p>ご予約のキャンセルは無料です。キャンセル後の取り消しはできません。</p>
            <label class="rc-checkbox-label">
                <input type="checkbox" id="rc-cancel-agree">
                <span>キャンセルポリシーに同意する</span>
            </label>
        </div>
        <div class="rc-step-nav">
            <button type="button" class="rc-btn rc-btn-secondary" id="rc-cancel-back-btn">戻る</button>
            <button type="button" class="rc-btn rc-btn-danger" id="rc-cancel-submit-btn" disabled>キャンセルする</button>
        </div>
    </div>

    <!-- Step 3: Complete -->
    <div class="rc-cancel-step" data-step="3" style="display:none">
        <div class="rc-complete">
            <div class="rc-complete-icon rc-cancel-icon">&#10003;</div>
            <h2 class="rc-step-title">キャンセルが完了しました</h2>
            <p class="rc-complete-message">ご予約のキャンセル処理が完了しました。<br>確認メールをお送りしましたのでご確認ください。</p>
        </div>
    </div>
</div>
