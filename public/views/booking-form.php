<?php
/**
 * Booking form template — 6 steps.
 *
 * @package RentacarBooking
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="rc-booking-app" class="rc-booking">
    <!-- Progress bar -->
    <div class="rc-progress">
        <div class="rc-progress-steps">
            <div class="rc-progress-step active" data-step="1"><span class="rc-step-num">1</span><span class="rc-step-label">車両選択</span></div>
            <div class="rc-progress-step" data-step="2"><span class="rc-step-num">2</span><span class="rc-step-label">日時選択</span></div>
            <div class="rc-progress-step" data-step="3"><span class="rc-step-num">3</span><span class="rc-step-label">オプション</span></div>
            <div class="rc-progress-step" data-step="4"><span class="rc-step-num">4</span><span class="rc-step-label">お客様情報</span></div>
            <div class="rc-progress-step" data-step="5"><span class="rc-step-num">5</span><span class="rc-step-label">確認</span></div>
            <div class="rc-progress-step" data-step="6"><span class="rc-step-num">6</span><span class="rc-step-label">完了</span></div>
        </div>
        <div class="rc-progress-bar"><div class="rc-progress-fill" style="width:16.66%"></div></div>
    </div>

    <!-- Step 1: Vehicle Selection -->
    <div class="rc-step" data-step="1">
        <h2 class="rc-step-title">車両を選択してください</h2>
        <div id="rc-vehicle-list" class="rc-vehicle-grid">
            <div class="rc-loading">車両情報を読み込み中...</div>
        </div>
    </div>

    <!-- Step 2: Date/Time Selection -->
    <div class="rc-step" data-step="2" style="display:none">
        <h2 class="rc-step-title">貸出・返却日時を選択</h2>
        <div class="rc-selected-vehicle-summary" id="rc-selected-vehicle-summary"></div>
        <div class="rc-datetime-section">
            <div class="rc-datetime-row">
                <div class="rc-datetime-group">
                    <label class="rc-label">貸出日</label>
                    <input type="text" id="rc-pickup-date" class="rc-input" placeholder="日付を選択" readonly>
                </div>
                <div class="rc-datetime-group">
                    <label class="rc-label">貸出時間</label>
                    <select id="rc-pickup-time" class="rc-select"></select>
                </div>
            </div>
            <div class="rc-datetime-row">
                <div class="rc-datetime-group">
                    <label class="rc-label">返却日</label>
                    <input type="text" id="rc-return-date" class="rc-input" placeholder="日付を選択" readonly>
                </div>
                <div class="rc-datetime-group">
                    <label class="rc-label">返却時間</label>
                    <select id="rc-return-time" class="rc-select"></select>
                </div>
            </div>
        </div>
        <div id="rc-calendar-legend" class="rc-calendar-legend">
            <span class="rc-legend-item"><span class="rc-legend-dot available"></span>空きあり</span>
            <span class="rc-legend-item"><span class="rc-legend-dot few"></span>残りわずか</span>
            <span class="rc-legend-item"><span class="rc-legend-dot full"></span>空きなし</span>
            <span class="rc-legend-item"><span class="rc-legend-dot holiday"></span>休業日</span>
        </div>
        <div class="rc-step-nav">
            <button type="button" class="rc-btn rc-btn-secondary rc-prev-btn">戻る</button>
            <button type="button" class="rc-btn rc-btn-primary rc-next-btn" id="rc-step2-next" disabled>次へ</button>
        </div>
    </div>

    <!-- Step 3: Options -->
    <div class="rc-step" data-step="3" style="display:none">
        <h2 class="rc-step-title">追加オプションを選択</h2>
        <div id="rc-options-list" class="rc-options-list">
            <div class="rc-loading">オプション情報を読み込み中...</div>
        </div>
        <div class="rc-step-nav">
            <button type="button" class="rc-btn rc-btn-secondary rc-prev-btn">戻る</button>
            <button type="button" class="rc-btn rc-btn-primary rc-next-btn">次へ</button>
        </div>
    </div>

    <!-- Step 4: Customer Info -->
    <div class="rc-step" data-step="4" style="display:none">
        <h2 class="rc-step-title">お客様情報を入力</h2>
        <form id="rc-customer-form" class="rc-form" novalidate>
            <div class="rc-form-row">
                <div class="rc-form-group">
                    <label class="rc-label rc-required">お名前</label>
                    <input type="text" name="customer_name" class="rc-input" placeholder="例: 山田 太郎" required>
                    <span class="rc-error-msg"></span>
                </div>
                <div class="rc-form-group">
                    <label class="rc-label rc-required">フリガナ</label>
                    <input type="text" name="customer_kana" class="rc-input" placeholder="例: ヤマダ タロウ" required>
                    <span class="rc-error-msg"></span>
                </div>
            </div>
            <div class="rc-form-row">
                <div class="rc-form-group">
                    <label class="rc-label rc-required">メールアドレス</label>
                    <input type="email" name="customer_email" class="rc-input" placeholder="例: taro@example.com" required>
                    <span class="rc-error-msg"></span>
                </div>
                <div class="rc-form-group">
                    <label class="rc-label rc-required">電話番号</label>
                    <input type="tel" name="customer_tel" class="rc-input" placeholder="例: 090-1234-5678" required>
                    <span class="rc-error-msg"></span>
                </div>
            </div>
            <div class="rc-form-row">
                <div class="rc-form-group rc-form-group-sm">
                    <label class="rc-label rc-required">郵便番号</label>
                    <input type="text" name="customer_zip" class="rc-input" placeholder="例: 900-0001" required>
                    <span class="rc-error-msg"></span>
                </div>
                <div class="rc-form-group rc-form-group-lg">
                    <label class="rc-label rc-required">住所</label>
                    <input type="text" name="customer_address" class="rc-input" placeholder="例: 沖縄県那覇市..." required>
                    <span class="rc-error-msg"></span>
                </div>
            </div>
            <div class="rc-form-row">
                <div class="rc-form-group rc-form-group-full">
                    <label class="rc-label">備考</label>
                    <textarea name="note" class="rc-textarea" rows="3" placeholder="ご要望がございましたらご記入ください"></textarea>
                </div>
            </div>
        </form>
        <div class="rc-step-nav">
            <button type="button" class="rc-btn rc-btn-secondary rc-prev-btn">戻る</button>
            <button type="button" class="rc-btn rc-btn-primary rc-next-btn" id="rc-step4-next">次へ</button>
        </div>
    </div>

    <!-- Step 5: Confirmation -->
    <div class="rc-step" data-step="5" style="display:none">
        <h2 class="rc-step-title">ご予約内容の確認</h2>
        <div id="rc-confirm-summary" class="rc-confirm-summary"></div>
        <div class="rc-payment-section" id="rc-payment-section">
            <h3>お支払い方法</h3>
            <div id="rc-payment-methods" class="rc-payment-methods"></div>
        </div>
        <div class="rc-terms">
            <label class="rc-checkbox-label">
                <input type="checkbox" id="rc-agree-terms">
                <span>利用規約に同意する</span>
            </label>
        </div>
        <div class="rc-step-nav">
            <button type="button" class="rc-btn rc-btn-secondary rc-prev-btn">戻る</button>
            <button type="button" class="rc-btn rc-btn-primary rc-confirm-btn" id="rc-submit-btn" disabled>予約を確定する</button>
        </div>
    </div>

    <!-- Step 6: Complete -->
    <div class="rc-step" data-step="6" style="display:none">
        <div class="rc-complete">
            <div class="rc-complete-icon">&#10003;</div>
            <h2 class="rc-step-title">ご予約ありがとうございます</h2>
            <div class="rc-complete-code">
                <span class="rc-complete-label">予約番号</span>
                <span class="rc-complete-value" id="rc-reservation-code"></span>
            </div>
            <p class="rc-complete-message">ご登録のメールアドレスに確認メールをお送りしました。<br>メールが届かない場合は、迷惑メールフォルダもご確認ください。</p>
            <div id="rc-complete-details" class="rc-complete-details"></div>
        </div>
    </div>
</div>
