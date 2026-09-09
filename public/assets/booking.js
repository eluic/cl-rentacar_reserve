(function () {
    'use strict';

    var D = rcBookingData;
    var API = D.restUrl;
    var i18n = D.i18n;
    var state = {
        step: 1,
        vehicles: [],
        options: [],
        selectedVehicle: null,
        pickupDate: '',
        pickupTime: '',
        returnDate: '',
        returnTime: '',
        selectedOptions: [],
        customer: {},
        paymentMethod: 'onsite',
        availabilityCache: {},
        totalAmount: 0,
        calcResult: null
    };

    /* ── Helpers ─────────────────────────────────────── */
    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

    function ajax(method, path, data) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            var url = API + path;
            if (method === 'GET' && data) {
                var params = Object.keys(data).map(function (k) {
                    return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
                }).join('&');
                url += '?' + params;
                data = null;
            }
            xhr.open(method, url, true);
            // Only send WP nonce in real WP environment
            if (D.nonce && D.nonce !== 'preview-nonce') {
                xhr.setRequestHeader('X-WP-Nonce', D.nonce);
            }
            if (method !== 'GET') {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            xhr.onload = function () {
                try {
                    var res = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300) resolve(res);
                    else reject(res);
                } catch (e) { reject({ message: i18n.errorOccurred }); }
            };
            xhr.onerror = function () { reject({ message: i18n.errorOccurred }); };
            xhr.send(data ? JSON.stringify(data) : null);
        });
    }

    function formatPrice(amount) {
        return '¥' + Number(amount).toLocaleString();
    }

    function escHTML(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    /* ── Init ────────────────────────────────────────── */
    function init() {
        var app = $('#rc-booking-app');
        if (!app) return;

        loadVehicles();
        loadOptions();
        buildTimeSelects();
        bindNavigation();
    }

    /* ── Step Navigation ─────────────────────────────── */
    function goToStep(n) {
        state.step = n;
        $$('.rc-step').forEach(function (el) {
            el.style.display = el.getAttribute('data-step') == n ? '' : 'none';
        });
        // Update progress
        $$('.rc-progress-step').forEach(function (el) {
            var s = parseInt(el.getAttribute('data-step'));
            el.classList.toggle('active', s === n);
            el.classList.toggle('completed', s < n);
        });
        var fill = $('.rc-progress-fill');
        if (fill) fill.style.width = (n / 6 * 100) + '%';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (n === 2) initFlatpickr();
        if (n === 3) renderOptions();
        if (n === 5) renderConfirmation();
    }

    function bindNavigation() {
        document.addEventListener('click', function (e) {
            if (e.target.classList.contains('rc-prev-btn')) {
                goToStep(state.step - 1);
            }
            if (e.target.classList.contains('rc-next-btn')) {
                if (state.step === 2) {
                    if (validateStep2()) goToStep(3);
                } else if (state.step === 3) {
                    collectOptions();
                    goToStep(4);
                } else if (state.step === 4) {
                    // Step4 next handled separately
                }
            }
        });

        // Step 4 next
        var step4next = $('#rc-step4-next');
        if (step4next) {
            step4next.addEventListener('click', function () {
                if (validateStep4()) {
                    collectCustomer();
                    calculateTotal().then(function () {
                        goToStep(5);
                    });
                }
            });
        }

        // Terms checkbox
        document.addEventListener('change', function (e) {
            if (e.target.id === 'rc-agree-terms') {
                var btn = $('#rc-submit-btn');
                if (btn) btn.disabled = !e.target.checked;
            }
        });

        // Submit
        var submitBtn = $('#rc-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function () {
                submitReservation();
            });
        }
    }

    /* ── Step 1: Vehicles ────────────────────────────── */
    function loadVehicles() {
        ajax('GET', '/vehicles').then(function (data) {
            state.vehicles = data;
            renderVehicles();
        }).catch(function () {
            $('#rc-vehicle-list').innerHTML = '<p style="color:red">車両情報の読み込みに失敗しました。</p>';
        });
    }

    function renderVehicles() {
        var container = $('#rc-vehicle-list');
        if (!state.vehicles.length) {
            container.innerHTML = '<p>現在利用可能な車両はありません。</p>';
            return;
        }
        var html = '';
        state.vehicles.forEach(function (v) {
            var img = v.thumbnail
                ? '<img class="rc-vehicle-img" src="' + escHTML(v.thumbnail) + '" alt="' + escHTML(v.name) + '" loading="lazy">'
                : '<div class="rc-vehicle-img-placeholder">&#128663;</div>';
            html += '<div class="rc-vehicle-card" data-id="' + v.id + '">' +
                img +
                '<div class="rc-vehicle-info">' +
                '<div class="rc-vehicle-name">' + escHTML(v.name) + '</div>' +
                '<div class="rc-vehicle-meta">' +
                '<span class="rc-vehicle-meta-item"><span class="rc-vehicle-meta-icon">👤</span>' + v.seats + i18n.seats + '</span>' +
                '<span class="rc-vehicle-meta-item"><span class="rc-vehicle-meta-icon">⚙️</span>' + escHTML(v.transmission) + '</span>' +
                '</div>' +
                '<div class="rc-vehicle-price">' + formatPrice(v.base_price) +
                '<span class="rc-vehicle-price-unit"> ' + i18n.perDay + '</span></div>' +
                '</div></div>';
        });
        container.innerHTML = html;

        $$('.rc-vehicle-card', container).forEach(function (card) {
            card.addEventListener('click', function () {
                var vid = parseInt(this.getAttribute('data-id'));
                state.selectedVehicle = state.vehicles.find(function (v) { return v.id === vid; });
                $$('.rc-vehicle-card').forEach(function (c) { c.classList.remove('selected'); });
                this.classList.add('selected');
                // Auto-advance after short delay
                setTimeout(function () { goToStep(2); }, 300);
            });
        });
    }

    /* ── Step 2: Date/Time ───────────────────────────── */
    function buildTimeSelects() {
        var pickupSel = $('#rc-pickup-time');
        var returnSel = $('#rc-return-time');
        if (!pickupSel || !returnSel) return;

        for (var h = 8; h <= 20; h++) {
            ['00', '30'].forEach(function (m) {
                if (h === 20 && m === '30') return;
                var t = String(h).padStart(2, '0') + ':' + m;
                pickupSel.innerHTML += '<option value="' + t + '">' + t + '</option>';
                returnSel.innerHTML += '<option value="' + t + '">' + t + '</option>';
            });
        }
        pickupSel.value = '09:00';
        returnSel.value = '17:00';
    }

    var flatpickrInstances = {};
    var flatpickrInitialized = false;
    function initFlatpickr() {
        if (flatpickrInitialized) return;
        if (!state.selectedVehicle) return;
        if (typeof flatpickr === 'undefined') return;
        flatpickrInitialized = true;

        var sv = state.selectedVehicle;
        $('#rc-selected-vehicle-summary').innerHTML =
            '<strong>' + escHTML(sv.name) + '</strong> — ' + sv.seats + i18n.seats + ' / ' + escHTML(sv.transmission) + ' / ' + formatPrice(sv.base_price) + i18n.perDay;

        // Load availability for current month
        var now = new Date();
        var month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

        function loadAvail(m) {
            var key = sv.id + '_' + m;
            if (state.availabilityCache[key]) return Promise.resolve(state.availabilityCache[key]);
            return ajax('GET', '/availability', { vehicle_id: sv.id, month: m }).then(function (res) {
                state.availabilityCache[key] = res.days;
                return res.days;
            });
        }

        var pickupFP = flatpickr('#rc-pickup-date', {
            locale: 'ja',
            dateFormat: 'Y-m-d',
            minDate: 'today',
            disableMobile: true,
            disable: [isDateDisabled],
            onDayCreate: function (dObj, dStr, fp, dayElem) {
                colorDay(dayElem, sv.id);
            },
            onMonthChange: function (selectedDates, dateStr, instance) {
                var y = instance.currentYear;
                var m2 = String(instance.currentMonth + 1).padStart(2, '0');
                loadAvail(y + '-' + m2).then(function () { instance.redraw(); });
            },
            onChange: function (sel) {
                if (sel[0]) {
                    state.pickupDate = flatpickr.formatDate(sel[0], 'Y-m-d');
                    checkStep2Ready();
                }
            }
        });

        var returnFP = flatpickr('#rc-return-date', {
            locale: 'ja',
            dateFormat: 'Y-m-d',
            minDate: 'today',
            disableMobile: true,
            disable: [isDateDisabled],
            onDayCreate: function (dObj, dStr, fp, dayElem) {
                colorDay(dayElem, sv.id);
            },
            onMonthChange: function (selectedDates, dateStr, instance) {
                var y = instance.currentYear;
                var m2 = String(instance.currentMonth + 1).padStart(2, '0');
                loadAvail(y + '-' + m2).then(function () { instance.redraw(); });
            },
            onChange: function (sel) {
                if (sel[0]) {
                    state.returnDate = flatpickr.formatDate(sel[0], 'Y-m-d');
                    checkStep2Ready();
                }
            }
        });

        flatpickrInstances.pickup = pickupFP;
        flatpickrInstances.returnFP = returnFP;

        // Preload current month
        loadAvail(month).then(function () {
            pickupFP.redraw();
            returnFP.redraw();
        });

        // Time change handlers
        $('#rc-pickup-time').addEventListener('change', function () { state.pickupTime = this.value; checkStep2Ready(); });
        $('#rc-return-time').addEventListener('change', function () { state.returnTime = this.value; checkStep2Ready(); });
        state.pickupTime = $('#rc-pickup-time').value;
        state.returnTime = $('#rc-return-time').value;
    }

    function colorDay(dayElem, vehicleId) {
        var dateStr = flatpickr.formatDate(dayElem.dateObj, 'Y-m-d');
        var monthKey = dateStr.substring(0, 7);
        var cacheKey = vehicleId + '_' + monthKey;
        var days = state.availabilityCache[cacheKey];
        if (!days || !days[dateStr]) return;

        var s = days[dateStr].status;
        dayElem.classList.add('rc-day-' + s);

        // Disable dates that are full, holiday, or blocked
        if (s === 'full' || s === 'holiday' || s === 'blocked') {
            dayElem.classList.add('flatpickr-disabled');
            dayElem.setAttribute('aria-disabled', 'true');
        }
    }

    /** Check if a date should be disabled based on availability cache */
    function isDateDisabled(dateObj) {
        if (!state.selectedVehicle) return false;
        var dateStr = flatpickr.formatDate(dateObj, 'Y-m-d');
        var monthKey = dateStr.substring(0, 7);
        var cacheKey = state.selectedVehicle.id + '_' + monthKey;
        var days = state.availabilityCache[cacheKey];
        if (!days || !days[dateStr]) return false;
        var s = days[dateStr].status;
        return s === 'full' || s === 'holiday' || s === 'blocked';
    }

    function checkStep2Ready() {
        var btn = $('#rc-step2-next');
        if (btn) {
            btn.disabled = !(state.pickupDate && state.returnDate && state.pickupTime && state.returnTime);
        }
    }

    function validateStep2() {
        if (!state.pickupDate || !state.returnDate) return false;
        var pickup = new Date(state.pickupDate + 'T' + state.pickupTime);
        var ret = new Date(state.returnDate + 'T' + state.returnTime);
        if (ret <= pickup) {
            alert('返却日時は貸出日時より後にしてください。');
            return false;
        }
        return true;
    }

    /* ── Step 3: Options ─────────────────────────────── */
    function loadOptions() {
        ajax('GET', '/options').then(function (data) {
            state.options = data;
        });
    }

    function renderOptions() {
        var container = $('#rc-options-list');
        if (!state.options.length) {
            container.innerHTML = '<p>追加オプションはありません。</p>';
            return;
        }
        var html = '';
        state.options.forEach(function (o) {
            var unitLabel = o.unit === 'per_day' ? i18n.perDay : i18n.perReservation;
            html += '<div class="rc-option-item" data-id="' + o.id + '">' +
                '<div class="rc-option-left">' +
                '<input type="checkbox" class="rc-option-check" data-id="' + o.id + '">' +
                '<div><div class="rc-option-name">' + escHTML(o.name) + '</div>' +
                (o.description ? '<div class="rc-option-desc">' + escHTML(o.description) + '</div>' : '') +
                '</div></div>' +
                '<div class="rc-option-right">' +
                '<div class="rc-option-price">' + formatPrice(o.amount) + '</div>' +
                '<div class="rc-option-unit">' + unitLabel + '</div>' +
                '<input type="number" class="rc-option-qty" data-id="' + o.id + '" value="1" min="1" max="10" style="display:none">' +
                '</div></div>';
        });
        container.innerHTML = html;

        $$('.rc-option-check', container).forEach(function (cb) {
            cb.addEventListener('change', function () {
                var item = this.closest('.rc-option-item');
                item.classList.toggle('checked', this.checked);
                var qty = item.querySelector('.rc-option-qty');
                qty.style.display = this.checked ? 'block' : 'none';
            });
        });
    }

    function collectOptions() {
        state.selectedOptions = [];
        $$('.rc-option-check:checked').forEach(function (cb) {
            var id = parseInt(cb.getAttribute('data-id'));
            var item = cb.closest('.rc-option-item');
            var qty = parseInt(item.querySelector('.rc-option-qty').value) || 1;
            state.selectedOptions.push({ id: id, quantity: qty });
        });
    }

    /* ── Step 4: Customer Form ───────────────────────── */
    function validateStep4() {
        var form = $('#rc-customer-form');
        var valid = true;
        var fields = [
            { name: 'customer_name', label: 'お名前' },
            { name: 'customer_kana', label: 'フリガナ' },
            { name: 'customer_email', label: 'メールアドレス' },
            { name: 'customer_tel', label: '電話番号' },
            { name: 'customer_zip', label: '郵便番号' },
            { name: 'customer_address', label: '住所' }
        ];

        fields.forEach(function (f) {
            var input = form.querySelector('[name="' + f.name + '"]');
            var errEl = input ? input.parentElement.querySelector('.rc-error-msg') : null;
            if (!input) return;
            input.classList.remove('rc-invalid');
            if (errEl) errEl.textContent = '';

            var val = input.value.trim();
            if (!val) {
                input.classList.add('rc-invalid');
                if (errEl) errEl.textContent = f.label + 'を入力してください';
                valid = false;
            }
            // Email validation
            if (f.name === 'customer_email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                input.classList.add('rc-invalid');
                if (errEl) errEl.textContent = i18n.invalidEmail;
                valid = false;
            }
        });
        return valid;
    }

    function collectCustomer() {
        var form = $('#rc-customer-form');
        state.customer = {
            customer_name: form.querySelector('[name="customer_name"]').value.trim(),
            customer_kana: form.querySelector('[name="customer_kana"]').value.trim(),
            customer_email: form.querySelector('[name="customer_email"]').value.trim(),
            customer_tel: form.querySelector('[name="customer_tel"]').value.trim(),
            customer_zip: form.querySelector('[name="customer_zip"]').value.trim(),
            customer_address: form.querySelector('[name="customer_address"]').value.trim(),
            note: form.querySelector('[name="note"]').value.trim()
        };
    }

    /* ── Price Calculation ────────────────────────────── */
    function calculateTotal() {
        var payload = {
            vehicle_id: state.selectedVehicle.id,
            pickup_at: state.pickupDate + ' ' + state.pickupTime,
            return_at: state.returnDate + ' ' + state.returnTime,
            options: state.selectedOptions
        };
        return ajax('POST', '/reservations/calculate', payload).then(function (res) {
            state.calcResult = res;
            state.totalAmount = res.total_amount;
        }).catch(function () {
            state.totalAmount = 0;
        });
    }

    /* ── Step 5: Confirmation ────────────────────────── */
    function renderConfirmation() {
        var sv = state.selectedVehicle;
        var calc = state.calcResult || {};
        var html = '<div class="rc-confirm-section"><h3>車両情報</h3>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">車両</span><span class="rc-confirm-value">' + escHTML(sv.name) + '</span></div>' +
            '</div>';

        html += '<div class="rc-confirm-section"><h3>利用期間</h3>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">貸出日時</span><span class="rc-confirm-value">' + state.pickupDate + ' ' + state.pickupTime + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">返却日時</span><span class="rc-confirm-value">' + state.returnDate + ' ' + state.returnTime + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">利用日数</span><span class="rc-confirm-value">' + (calc.days || '-') + i18n.days + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">車両料金</span><span class="rc-confirm-value">' + formatPrice(calc.vehicle_price || 0) + '</span></div>' +
            '</div>';

        if (calc.options && calc.options.length) {
            html += '<div class="rc-confirm-section"><h3>追加オプション</h3>';
            calc.options.forEach(function (o) {
                html += '<div class="rc-confirm-row"><span class="rc-confirm-label">' + escHTML(o.name) + ' x' + o.quantity + '</span><span class="rc-confirm-value">' + formatPrice(o.amount) + '</span></div>';
            });
            html += '</div>';
        }

        html += '<div class="rc-confirm-section"><h3>お客様情報</h3>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">お名前</span><span class="rc-confirm-value">' + escHTML(state.customer.customer_name) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">フリガナ</span><span class="rc-confirm-value">' + escHTML(state.customer.customer_kana) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">メール</span><span class="rc-confirm-value">' + escHTML(state.customer.customer_email) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">電話番号</span><span class="rc-confirm-value">' + escHTML(state.customer.customer_tel) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">郵便番号</span><span class="rc-confirm-value">' + escHTML(state.customer.customer_zip) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">住所</span><span class="rc-confirm-value">' + escHTML(state.customer.customer_address) + '</span></div>' +
            '</div>';

        html += '<div class="rc-confirm-total">' + i18n.totalAmount + ': ' + formatPrice(state.totalAmount) + '</div>';

        $('#rc-confirm-summary').innerHTML = html;

        // Payment methods
        renderPaymentMethods();
    }

    function renderPaymentMethods() {
        var container = $('#rc-payment-methods');
        var html = '';
        if (D.paymentOnsite === '1') {
            html += '<div class="rc-payment-method selected" data-method="onsite">' +
                '<div class="rc-payment-method-name">' + i18n.onsite + '</div>' +
                '<div class="rc-payment-method-desc">' + i18n.onsiteDesc + '</div></div>';
        }
        if (D.paymentSquare === '1') {
            html += '<div class="rc-payment-method" data-method="square">' +
                '<div class="rc-payment-method-name">' + i18n.squarePay + '</div>' +
                '<div class="rc-payment-method-desc">クレジットカード決済</div></div>';
        }
        container.innerHTML = html;

        state.paymentMethod = D.paymentOnsite === '1' ? 'onsite' : 'square';

        $$('.rc-payment-method', container).forEach(function (el) {
            el.addEventListener('click', function () {
                $$('.rc-payment-method').forEach(function (m) { m.classList.remove('selected'); });
                this.classList.add('selected');
                state.paymentMethod = this.getAttribute('data-method');
            });
        });
    }

    /* ── Submit ───────────────────────────────────────── */
    function submitReservation() {
        var btn = $('#rc-submit-btn');
        btn.disabled = true;
        btn.textContent = i18n.processing;

        var payload = Object.assign({}, state.customer, {
            vehicle_id: state.selectedVehicle.id,
            pickup_at: state.pickupDate + ' ' + state.pickupTime,
            return_at: state.returnDate + ' ' + state.returnTime,
            options: state.selectedOptions,
            payment_method: state.paymentMethod,
            recaptcha_token: ''
        });

        // reCAPTCHA (skipped in preview mode)
        var submitWithToken = function (token) {
            payload.recaptcha_token = token || '';
            ajax('POST', '/reservations', payload).then(function (res) {
                if (res.success) {
                    showComplete(res);
                } else {
                    alert(res.message || i18n.errorOccurred);
                    btn.disabled = false;
                    btn.textContent = '予約を確定する';
                }
            }).catch(function (err) {
                alert(err.message || i18n.errorOccurred);
                btn.disabled = false;
                btn.textContent = '予約を確定する';
            });
        };

        if (D.recaptchaSiteKey && typeof grecaptcha !== 'undefined') {
            grecaptcha.ready(function () {
                grecaptcha.execute(D.recaptchaSiteKey, { action: 'reservation' }).then(function (token) {
                    submitWithToken(token);
                });
            });
        } else {
            submitWithToken('');
        }
    }

    function showComplete(res) {
        $('#rc-reservation-code').textContent = res.reservation_code;
        var details = '<div class="rc-confirm-row"><span class="rc-confirm-label">合計金額</span><span class="rc-confirm-value">' + formatPrice(res.total_amount) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">ステータス</span><span class="rc-confirm-value">' + (res.status === 'confirmed' ? '確定' : '受付中') + '</span></div>';
        $('#rc-complete-details').innerHTML = details;
        goToStep(6);
    }

    /* ── Boot ──────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
