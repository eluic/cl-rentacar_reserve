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
        buildTransportTimeSelects();
        bindTransportType();
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
                '<div class="rc-vehicle-price">' + formatPrice(v.base_price) +
                '<span class="rc-vehicle-price-unit">〜</span></div>' +
                '</div>' +
                '<div class="rc-vehicle-action">' +
                '<button type="button" class="rc-vehicle-book-btn">予約する</button>' +
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

    /* ── Custom Availability Calendar ────────────────── */
    var calendarInitialized = false;
    var calendarYear, calendarMonth; // 0-indexed month
    var selectingField = 'pickup'; // 'pickup' or 'return'

    function initFlatpickr() {
        // Now uses custom calendar instead of flatpickr
        if (calendarInitialized) return;
        if (!state.selectedVehicle) return;
        calendarInitialized = true;

        var sv = state.selectedVehicle;
        $('#rc-selected-vehicle-summary').innerHTML =
            '<strong>' + escHTML(sv.name) + '</strong> — ' + sv.seats + i18n.seats + ' / ' + escHTML(sv.transmission) + ' / ' + formatPrice(sv.base_price) + i18n.perDay;

        var now = new Date();
        calendarYear = now.getFullYear();
        calendarMonth = now.getMonth();

        // Make date inputs clickable to switch selection target
        var pickupInput = $('#rc-pickup-date');
        var returnInput = $('#rc-return-date');
        if (pickupInput) pickupInput.addEventListener('click', function () { selectingField = 'pickup'; highlightActiveInput(); });
        if (returnInput) returnInput.addEventListener('click', function () { selectingField = 'return'; highlightActiveInput(); });

        // Time change handlers
        $('#rc-pickup-time').addEventListener('change', function () { state.pickupTime = this.value; checkStep2Ready(); });
        $('#rc-return-time').addEventListener('change', function () { state.returnTime = this.value; checkStep2Ready(); });
        state.pickupTime = $('#rc-pickup-time').value;
        state.returnTime = $('#rc-return-time').value;

        renderCalendar();
    }

    function highlightActiveInput() {
        var p = $('#rc-pickup-date');
        var r = $('#rc-return-date');
        if (p) p.style.borderColor = (selectingField === 'pickup') ? 'var(--rc-primary)' : '';
        if (r) r.style.borderColor = (selectingField === 'return') ? 'var(--rc-primary)' : '';
    }

    function loadAvail(m) {
        var sv = state.selectedVehicle;
        if (!sv) return Promise.resolve({});
        var key = sv.id + '_' + m;
        if (state.availabilityCache[key]) return Promise.resolve(state.availabilityCache[key]);
        return ajax('GET', '/availability', { vehicle_id: sv.id, month: m }).then(function (res) {
            state.availabilityCache[key] = res.days;
            return res.days;
        });
    }

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    function renderCalendar() {
        var container = $('#rc-availability-calendar');
        if (!container) return;

        var monthKey = calendarYear + '-' + pad2(calendarMonth + 1);
        loadAvail(monthKey).then(function (days) {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var todayStr = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());

            // Navigation
            var canPrev = !(calendarYear === today.getFullYear() && calendarMonth === today.getMonth());
            var html = '<div class="rc-cal-nav">' +
                '<button type="button" class="rc-cal-nav-btn" id="rc-cal-prev"' + (canPrev ? '' : ' disabled') + '>＜</button>' +
                '<span class="rc-cal-month">' + calendarYear + '年' + (calendarMonth + 1) + '月</span>' +
                '<button type="button" class="rc-cal-nav-btn" id="rc-cal-next">＞</button></div>';

            // Weekday headers (Mon-Sun)
            var hdrs = ['月', '火', '水', '木', '金', '土', '日'];
            html += '<div class="rc-cal-grid">';
            hdrs.forEach(function (h, i) {
                var cls = 'rc-cal-hdr';
                if (i === 5) cls += ' rc-cal-sat';
                if (i === 6) cls += ' rc-cal-sun';
                html += '<div class="' + cls + '">' + h + '</div>';
            });

            // Days
            var firstDay = new Date(calendarYear, calendarMonth, 1);
            var startDow = (firstDay.getDay() + 6) % 7; // Mon=0
            var daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

            // Empty cells before first day
            for (var e = 0; e < startDow; e++) {
                html += '<div class="rc-cal-cell rc-cal-empty"></div>';
            }

            for (var d = 1; d <= daysInMonth; d++) {
                var dateStr = calendarYear + '-' + pad2(calendarMonth + 1) + '-' + pad2(d);
                var dateObj = new Date(calendarYear, calendarMonth, d);
                var dow = (dateObj.getDay() + 6) % 7; // Mon=0
                var isPast = dateObj < today;
                var isToday = dateStr === todayStr;
                var dayInfo = days ? days[dateStr] : null;
                var status = dayInfo ? dayInfo.status : (isPast ? 'past' : 'unknown');
                var rawRemaining = dayInfo ? (dayInfo.remaining != null ? dayInfo.remaining : dayInfo.available) : 0;
                var remaining = Number(rawRemaining) || 0;

                var cellCls = 'rc-cal-cell';
                if (isPast) cellCls += ' rc-cal-past';
                if (isToday) cellCls += ' rc-cal-today';
                if (dow === 5) cellCls += ' rc-cal-sat';
                if (dow === 6) cellCls += ' rc-cal-sun';

                var selectable = !isPast && status !== 'full' && status !== 'holiday' && status !== 'blocked';
                if (selectable) cellCls += ' rc-cal-selectable';

                // Highlight selected dates
                if (dateStr === state.pickupDate || dateStr === state.returnDate) cellCls += ' rc-cal-selected';
                // Range highlight
                if (state.pickupDate && state.returnDate && dateStr > state.pickupDate && dateStr < state.returnDate) cellCls += ' rc-cal-range';

                // Status: show remaining count as number
                var statusHtml = '';
                if (isPast || status === 'past' || status === 'holiday' || status === 'blocked') {
                    statusHtml = '<div class="rc-cal-status rc-cal-status-closed">ー</div>';
                } else {
                    var cls = remaining <= 0 ? 'rc-cal-status-zero' : (remaining <= 1 ? 'rc-cal-status-few' : 'rc-cal-status-avail');
                    statusHtml = '<div class="rc-cal-status ' + cls + '">' + remaining + '台</div>';
                }

                html += '<div class="' + cellCls + '" data-date="' + dateStr + '">' +
                    '<div class="rc-cal-day">' + d + '</div>' +
                    statusHtml + '</div>';
            }

            // Trailing empty cells
            var totalCells = startDow + daysInMonth;
            var trailing = (7 - (totalCells % 7)) % 7;
            for (var t = 0; t < trailing; t++) {
                html += '<div class="rc-cal-cell rc-cal-empty"></div>';
            }
            html += '</div>';

            // Legend
            html += '<div class="rc-cal-legend">' +
                '<span>数字＝残り台数</span>' +
                '<span style="color:#e65100">1 残りわずか</span>' +
                '<span style="color:#c62828">0 満車</span>' +
                '<span>ー 受付外</span></div>';

            container.innerHTML = html;

            // Bind nav buttons
            var prevBtn = $('#rc-cal-prev');
            var nextBtn = $('#rc-cal-next');
            if (prevBtn) prevBtn.addEventListener('click', function () {
                calendarMonth--;
                if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
                renderCalendar();
            });
            if (nextBtn) nextBtn.addEventListener('click', function () {
                calendarMonth++;
                if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
                renderCalendar();
            });

            // Bind date clicks
            $$('.rc-cal-selectable', container).forEach(function (cell) {
                cell.addEventListener('click', function () {
                    var dt = this.getAttribute('data-date');
                    if (selectingField === 'pickup') {
                        state.pickupDate = dt;
                        $('#rc-pickup-date').value = dt;
                        // Auto-switch to return if pickup selected
                        selectingField = 'return';
                        highlightActiveInput();
                    } else {
                        state.returnDate = dt;
                        $('#rc-return-date').value = dt;
                        selectingField = 'pickup';
                        highlightActiveInput();
                    }
                    checkStep2Ready();
                    renderCalendar(); // Re-render to update highlights
                });
            });

            highlightActiveInput();
        });
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

        // Transport fields validation (only if 送迎希望)
        var transportType = form.querySelector('[name="transport_type"]:checked');
        var isPickup = transportType && transportType.value === 'pickup';
        if (isPickup) {
            var transportFields = ['arrival_flight', 'departure_flight'];
            var hasTransportError = false;
            transportFields.forEach(function (n) {
                var input = form.querySelector('[name="' + n + '"]');
                if (!input) return;
                input.classList.remove('rc-invalid');
                if (!input.value.trim()) {
                    input.classList.add('rc-invalid');
                    hasTransportError = true;
                    valid = false;
                }
            });
            var tErr = $('#rc-transport-error');
            if (tErr) tErr.textContent = hasTransportError ? 'フライト情報を入力してください' : '';
        } else {
            var tErr2 = $('#rc-transport-error');
            if (tErr2) tErr2.textContent = '';
        }
        return valid;
    }

    function bindTransportType() {
        var radios = $$('[name="transport_type"]');
        radios.forEach(function (r) {
            r.addEventListener('change', function () {
                var fields = $('#rc-transport-fields');
                var locWrap = $('#rc-pickup-location');
                if (this.value === 'direct') {
                    if (fields) fields.style.display = 'none';
                    if (locWrap) locWrap.style.display = 'none';
                    var tErr = $('#rc-transport-error');
                    if (tErr) tErr.textContent = '';
                    if (fields) $$('.rc-invalid', fields).forEach(function (el) { el.classList.remove('rc-invalid'); });
                } else {
                    if (fields) fields.style.display = '';
                    if (locWrap) locWrap.style.display = '';
                }
            });
        });
    }

    function buildTransportTimeSelects() {
        // No longer needed - flight info simplified to text fields
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
            note: form.querySelector('[name="note"]').value.trim(),
            adults: form.querySelector('[name="adults"]').value,
            children: form.querySelector('[name="children"]').value
        };
        // Transport info
        var gv = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
        var transportRadio = form.querySelector('[name="transport_type"]:checked');
        state.customer.transport_type = transportRadio ? transportRadio.value : 'pickup';
        var locationRadio = form.querySelector('[name="pickup_location"]:checked');
        state.customer.pickup_location = locationRadio ? locationRadio.value : '';
        state.customer.arrival_flight = gv('arrival_flight');
        state.customer.departure_flight = gv('departure_flight');
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
            '<div class="rc-confirm-row"><span class="rc-confirm-label">ご利用人数</span><span class="rc-confirm-value">大人 ' + state.customer.adults + '名 / 子供 ' + state.customer.children + '名</span></div>' +
            '</div>';

        // Transport info
        var c = state.customer;
        var typeLabel = c.transport_type === 'direct' ? '直接来店' : '送迎希望';
        html += '<div class="rc-confirm-section"><h3>利用交通機関</h3>';
        html += '<div class="rc-confirm-row"><span class="rc-confirm-label">来店方法</span><span class="rc-confirm-value">' + typeLabel + '</span></div>';
        if (c.transport_type === 'pickup') {
            var locLabel = c.pickup_location === 'akamine_station' ? '赤嶺駅' : '那覇空港';
            html += '<div class="rc-confirm-row"><span class="rc-confirm-label">送迎場所</span><span class="rc-confirm-value">' + locLabel + '</span></div>';
            html += '<div class="rc-confirm-row"><span class="rc-confirm-label">到着便</span><span class="rc-confirm-value">' + escHTML(c.arrival_flight) + '</span></div>';
            html += '<div class="rc-confirm-row"><span class="rc-confirm-label">出発便</span><span class="rc-confirm-value">' + escHTML(c.departure_flight) + '</span></div>';
        }
        html += '</div>';

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
