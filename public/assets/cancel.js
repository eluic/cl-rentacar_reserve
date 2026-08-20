(function () {
    'use strict';

    var D = rcCancelData;
    var API = D.restUrl;
    var i18n = D.i18n;
    var state = { code: '', reservationData: null };

    function $(sel) { return document.querySelector(sel); }

    function ajax(method, path, data) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, API + path, true);
            xhr.setRequestHeader('X-WP-Nonce', D.nonce);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = function () {
                try {
                    var res = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300) resolve(res);
                    else reject(res);
                } catch (e) { reject({ message: i18n.errorOccurred }); }
            };
            xhr.onerror = function () { reject({ message: i18n.errorOccurred }); };
            xhr.send(JSON.stringify(data));
        });
    }

    function escHTML(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatPrice(a) { return '¥' + Number(a).toLocaleString(); }

    function showStep(n) {
        document.querySelectorAll('.rc-cancel-step').forEach(function (el) {
            el.style.display = el.getAttribute('data-step') == n ? '' : 'none';
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function init() {
        if (!$('#rc-cancel-app')) return;

        // Auto-fill from URL
        var urlParams = new URLSearchParams(window.location.search);
        var codeParam = urlParams.get('code');
        if (codeParam) {
            $('#rc-cancel-code').value = codeParam;
        }

        // Lookup button
        $('#rc-cancel-lookup-btn').addEventListener('click', function () {
            var code = $('#rc-cancel-code').value.trim();
            if (!code) {
                $('#rc-cancel-code-error').textContent = '予約番号を入力してください';
                return;
            }
            $('#rc-cancel-code-error').textContent = '';
            this.disabled = true;
            this.textContent = i18n.processing;

            ajax('POST', '/cancel/lookup', { code: code }).then(function (data) {
                state.code = code;
                state.reservationData = data;
                renderDetails(data);
                showStep(2);
            }).catch(function (err) {
                $('#rc-cancel-code-error').textContent = err.message || i18n.errorOccurred;
            }).finally(function () {
                var btn = $('#rc-cancel-lookup-btn');
                btn.disabled = false;
                btn.textContent = i18n.lookup;
            });
        });

        // Back button
        $('#rc-cancel-back-btn').addEventListener('click', function () { showStep(1); });

        // Agree checkbox
        $('#rc-cancel-agree').addEventListener('change', function () {
            $('#rc-cancel-submit-btn').disabled = !this.checked;
        });

        // Submit cancel
        $('#rc-cancel-submit-btn').addEventListener('click', function () {
            var email = $('#rc-cancel-email').value.trim();
            if (!email) {
                $('#rc-cancel-email-error').textContent = 'メールアドレスを入力してください';
                return;
            }
            if (!confirm(i18n.confirmCancel)) return;

            this.disabled = true;
            this.textContent = i18n.processing;

            ajax('POST', '/cancel', { code: state.code, email: email }).then(function (res) {
                if (res.success) {
                    showStep(3);
                } else {
                    alert(res.message || i18n.errorOccurred);
                }
            }).catch(function (err) {
                $('#rc-cancel-email-error').textContent = err.message || i18n.errorOccurred;
            }).finally(function () {
                var btn = $('#rc-cancel-submit-btn');
                btn.disabled = false;
                btn.textContent = i18n.cancel;
            });
        });
    }

    function renderDetails(data) {
        var html = '<div class="rc-confirm-row"><span class="rc-confirm-label">予約番号</span><span class="rc-confirm-value">' + escHTML(data.reservation_code) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">車両</span><span class="rc-confirm-value">' + escHTML(data.vehicle_name) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">貸出日時</span><span class="rc-confirm-value">' + escHTML(data.pickup_at) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">返却日時</span><span class="rc-confirm-value">' + escHTML(data.return_at) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">合計金額</span><span class="rc-confirm-value">' + formatPrice(data.total_amount) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">お名前</span><span class="rc-confirm-value">' + escHTML(data.customer_name) + '</span></div>' +
            '<div class="rc-confirm-row"><span class="rc-confirm-label">メール</span><span class="rc-confirm-value">' + escHTML(data.masked_email) + '</span></div>';
        $('#rc-cancel-details').innerHTML = html;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
