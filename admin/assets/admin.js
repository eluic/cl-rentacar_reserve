(function ($) {
    'use strict';

    var API = rcAdminData.restUrl;
    var nonce = rcAdminData.nonce;

    function api(method, path, data) {
        var opts = {
            method: method,
            url: API + path,
            beforeSend: function (xhr) { xhr.setRequestHeader('X-WP-Nonce', nonce); },
            dataType: 'json',
            contentType: 'application/json'
        };
        if (data && method !== 'GET') opts.data = JSON.stringify(data);
        if (data && method === 'GET') opts.data = data;
        return $.ajax(opts);
    }

    function formatPrice(a) { return '¥' + Number(a).toLocaleString(); }
    function esc(s) { return $('<span>').text(s || '').html(); }
    function badge(status) {
        var map = { pending: 'pending', confirmed: 'confirmed', cancelled: 'cancelled', completed: 'completed',
                    unpaid: 'unpaid', paid: 'paid', refunded: 'refunded', no_show: 'cancelled',
                    pending_onsite: 'pending', sent: 'confirmed', failed: 'cancelled' };
        var labels = { pending: '保留中', confirmed: '確定', cancelled: 'キャンセル', completed: '完了',
                       unpaid: '未払い', paid: '支払い済み', refunded: '返金済み', no_show: 'ノーショー',
                       pending_onsite: '現地払い', sent: '送信済み', failed: '失敗' };
        var cls = map[status] || 'pending';
        return '<span class="rca-badge rca-badge-' + cls + '">' + esc(labels[status] || status) + '</span>';
    }
    function toast(msg, isError) {
        var el = $('<div class="rca-toast' + (isError ? ' rca-toast-error' : '') + '">' + esc(msg) + '</div>');
        $('body').append(el);
        setTimeout(function () { el.fadeOut(function () { el.remove(); }); }, 3000);
    }

    /* ── Page Router ──────────────────────────────────── */
    var $app = $('#rc-admin-app');
    if (!$app.length) return;
    var page = $app.data('page') || 'dashboard';

    var pages = {
        dashboard: loadDashboard,
        vehicles: loadVehicles,
        reservations: loadReservations,
        prices: loadPrices,
        options: loadOptions,
        slots: loadSlots,
        holidays: loadHolidays,
        payments: loadPayments,
        'mail-templates': loadMailTemplates,
        'mail-logs': loadMailLogs,
        settings: loadSettings,
        system: loadSystem
    };

    if (pages[page]) pages[page]();

    /* ── Dashboard ────────────────────────────────────── */
    function loadDashboard() {
        api('GET', '/admin/reservations/dashboard').done(function (d) {
            var html = '<div class="rca-cards">' +
                '<div class="rca-card"><div class="rca-card-value">' + d.month_count + '</div><div class="rca-card-label">今月の予約数</div></div>' +
                '<div class="rca-card"><div class="rca-card-value">' + formatPrice(d.month_sales) + '</div><div class="rca-card-label">今月の売上</div></div>' +
                '<div class="rca-card"><div class="rca-card-value">' + d.pending_count + '</div><div class="rca-card-label">保留中の予約</div></div>' +
                '<div class="rca-card"><div class="rca-card-value">' + d.vehicle_count + '</div><div class="rca-card-label">登録車両数</div></div>' +
                '</div>';
            html += '<h3 class="rca-section-title">本日の貸出 (' + d.today_pickups.length + '件)</h3>';
            if (d.today_pickups.length) {
                html += '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>予約番号</th><th>お客様</th><th>車両</th><th>貸出時間</th></tr></thead><tbody>';
                d.today_pickups.forEach(function (r) {
                    html += '<tr><td>' + esc(r.reservation_code) + '</td><td>' + esc(r.customer_name) + '</td><td>' + esc(r.vehicle_name) + '</td><td>' + esc(r.pickup_at) + '</td></tr>';
                });
                html += '</tbody></table></div>';
            } else { html += '<p style="color:#999">本日の貸出予約はありません。</p>'; }

            html += '<h3 class="rca-section-title">本日の返却 (' + d.today_returns.length + '件)</h3>';
            if (d.today_returns.length) {
                html += '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>予約番号</th><th>お客様</th><th>車両</th><th>返却時間</th></tr></thead><tbody>';
                d.today_returns.forEach(function (r) {
                    html += '<tr><td>' + esc(r.reservation_code) + '</td><td>' + esc(r.customer_name) + '</td><td>' + esc(r.vehicle_name) + '</td><td>' + esc(r.return_at) + '</td></tr>';
                });
                html += '</tbody></table></div>';
            } else { html += '<p style="color:#999">本日の返却予約はありません。</p>'; }
            $app.html(html);
        });
    }

    /* ── Vehicles ──────────────────────────────────────── */
    function loadVehicles() {
        var html = '<div class="rca-toolbar"><button class="rca-btn rca-btn-primary" id="rca-add-vehicle">+ 車両を追加</button></div>' +
            '<div id="rca-vehicles-table"></div>' +
            '<div class="rca-modal-overlay" id="rca-vehicle-modal"><div class="rca-modal">' +
            '<h3 class="rca-modal-title" id="rca-vehicle-modal-title">車両追加</h3>' +
            '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">車両名</label><input class="rca-input" id="rv-name"></div>' +
            '<div class="rca-form-group"><label class="rca-label">スラッグ</label><input class="rca-input" id="rv-slug"></div></div>' +
            '<div class="rca-form-group"><label class="rca-label">説明</label><textarea class="rca-textarea" id="rv-desc" rows="3"></textarea></div>' +
            '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">基本料金（円/日）</label><input type="number" class="rca-input" id="rv-price" value="0"></div>' +
            '<div class="rca-form-group"><label class="rca-label">在庫台数</label><input type="number" class="rca-input" id="rv-stock" value="1" min="0"></div></div>' +
            '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">定員</label><input type="number" class="rca-input" id="rv-seats" value="5" min="1"></div>' +
            '<div class="rca-form-group"><label class="rca-label">ミッション</label><select class="rca-select" id="rv-transmission"><option value="AT">AT</option><option value="MT">MT</option><option value="CVT">CVT</option></select></div></div>' +
            '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">車両クラス</label><input class="rca-input" id="rv-class"></div>' +
            '<div class="rca-form-group"><label class="rca-label">ステータス</label><select class="rca-select" id="rv-status"><option value="published">公開</option><option value="private">非公開</option></select></div></div>' +
            '<div class="rca-form-group"><label class="rca-label">サムネイル画像ID</label><input type="number" class="rca-input" id="rv-thumb" value="0"><small style="color:#999">WPメディアライブラリのIDを入力</small></div>' +
            '<input type="hidden" id="rv-id" value="0">' +
            '<div class="rca-modal-footer"><button class="rca-btn rca-btn-secondary" id="rca-vehicle-cancel">キャンセル</button><button class="rca-btn rca-btn-primary" id="rca-vehicle-save">保存</button></div>' +
            '</div></div>';
        $app.html(html);

        function refreshTable() {
            api('GET', '/admin/vehicles').done(function (d) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>ID</th><th>車両名</th><th>定員</th><th>MT</th><th>基本料金</th><th>在庫</th><th>状態</th><th>操作</th></tr></thead><tbody>';
                d.items.forEach(function (v) {
                    var seats = (v.meta && v.meta.seats) || '-';
                    var trans = (v.meta && v.meta.transmission) || '-';
                    t += '<tr><td>' + v.id + '</td><td>' + esc(v.name) + '</td><td>' + seats + '</td><td>' + trans + '</td><td>' + formatPrice(v.base_price) + '</td><td>' + v.stock + '</td><td>' + badge(v.status === 'published' ? 'confirmed' : 'cancelled') + '</td>' +
                        '<td><button class="rca-btn rca-btn-sm rca-btn-secondary rca-edit-vehicle" data-id="' + v.id + '">編集</button> <button class="rca-btn rca-btn-sm rca-btn-danger rca-del-vehicle" data-id="' + v.id + '">削除</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-vehicles-table').html(t);
            });
        }
        refreshTable();

        $('#rca-add-vehicle').on('click', function () { resetVehicleForm(); $('#rca-vehicle-modal').addClass('active'); });
        $('#rca-vehicle-cancel').on('click', function () { $('#rca-vehicle-modal').removeClass('active'); });

        $(document).on('click', '.rca-edit-vehicle', function () {
            var id = $(this).data('id');
            api('GET', '/admin/vehicles/' + id).done(function (v) {
                $('#rv-id').val(v.id);
                $('#rv-name').val(v.name);
                $('#rv-slug').val(v.slug);
                $('#rv-desc').val(v.description);
                $('#rv-price').val(v.base_price);
                $('#rv-stock').val(v.stock);
                $('#rv-seats').val((v.meta && v.meta.seats) || 5);
                $('#rv-transmission').val((v.meta && v.meta.transmission) || 'AT');
                $('#rv-class').val((v.meta && v.meta.vehicle_class) || '');
                $('#rv-status').val(v.status);
                $('#rv-thumb').val(v.thumbnail_id);
                $('#rca-vehicle-modal-title').text('車両編集');
                $('#rca-vehicle-modal').addClass('active');
            });
        });

        $(document).on('click', '.rca-del-vehicle', function () {
            if (!confirm('この車両を削除しますか？')) return;
            api('DELETE', '/admin/vehicles/' + $(this).data('id')).done(function () { toast('削除しました'); refreshTable(); });
        });

        $('#rca-vehicle-save').on('click', function () {
            var data = {
                name: $('#rv-name').val(), slug: $('#rv-slug').val(), description: $('#rv-desc').val(),
                base_price: parseInt($('#rv-price').val()), stock: parseInt($('#rv-stock').val()),
                seats: parseInt($('#rv-seats').val()), transmission: $('#rv-transmission').val(),
                vehicle_class: $('#rv-class').val(), status: $('#rv-status').val(),
                thumbnail_id: parseInt($('#rv-thumb').val()) || 0
            };
            var id = parseInt($('#rv-id').val());
            var req = id ? api('PUT', '/admin/vehicles/' + id, data) : api('POST', '/admin/vehicles', data);
            req.done(function () { toast('保存しました'); $('#rca-vehicle-modal').removeClass('active'); refreshTable(); })
               .fail(function () { toast('保存に失敗しました', true); });
        });

        function resetVehicleForm() {
            $('#rv-id').val(0); $('#rv-name,#rv-slug,#rv-desc,#rv-class').val('');
            $('#rv-price').val(0); $('#rv-stock').val(1); $('#rv-seats').val(5);
            $('#rv-transmission').val('AT'); $('#rv-status').val('published'); $('#rv-thumb').val(0);
            $('#rca-vehicle-modal-title').text('車両追加');
        }
    }

    /* ── Reservations ─────────────────────────────────── */
    function loadReservations() {
        var params = { page: 1, per_page: 20 };
        var html = '<div class="rca-toolbar"><div class="rca-search"><input class="rca-input" id="rca-res-search" placeholder="名前・メール・予約番号で検索" style="width:280px"><button class="rca-btn rca-btn-primary" id="rca-res-search-btn">検索</button></div>' +
            '<div class="rca-filters"><select class="rca-select" id="rca-res-status" style="width:120px"><option value="">全ステータス</option><option value="pending">保留中</option><option value="confirmed">確定</option><option value="cancelled">キャンセル</option><option value="completed">完了</option></select></div></div>' +
            '<div id="rca-res-table"></div><div class="rca-pagination" id="rca-res-pager"></div>';
        $app.html(html);

        function refresh() {
            params.search = $('#rca-res-search').val();
            params.status = $('#rca-res-status').val();
            api('GET', '/admin/reservations', params).done(function (d) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>予約番号</th><th>お客様</th><th>車両</th><th>貸出日</th><th>返却日</th><th>金額</th><th>予約状態</th><th>決済</th><th>操作</th></tr></thead><tbody>';
                d.items.forEach(function (r) {
                    t += '<tr><td>' + esc(r.reservation_code) + '</td><td>' + esc(r.customer_name) + '</td><td>' + esc(r.vehicle_name) + '</td><td>' + esc(r.pickup_at) + '</td><td>' + esc(r.return_at) + '</td><td>' + formatPrice(r.total_amount) + '</td><td>' + badge(r.status) + '</td><td>' + badge(r.payment_status) + '</td>' +
                        '<td><button class="rca-btn rca-btn-sm rca-btn-secondary rca-view-res" data-id="' + r.id + '">詳細</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-res-table').html(t);
                // Pagination
                var total = d.total;
                var totalPages = Math.ceil(total / params.per_page);
                var phtml = '';
                for (var i = 1; i <= totalPages; i++) {
                    phtml += '<button' + (i === params.page ? ' class="active"' : '') + ' data-page="' + i + '">' + i + '</button>';
                }
                $('#rca-res-pager').html(phtml);
            });
        }
        refresh();
        $('#rca-res-search-btn').on('click', function () { params.page = 1; refresh(); });
        $('#rca-res-status').on('change', function () { params.page = 1; refresh(); });
        $(document).on('click', '#rca-res-pager button', function () { params.page = parseInt($(this).data('page')); refresh(); });
        $(document).on('click', '.rca-view-res', function () {
            var id = $(this).data('id');
            api('GET', '/admin/reservations/' + id).done(function (r) {
                var m = '<div class="rca-modal-overlay active" id="rca-res-detail-modal"><div class="rca-modal" style="max-width:700px">' +
                    '<h3 class="rca-modal-title">予約詳細: ' + esc(r.reservation_code) + '</h3>' +
                    '<table style="width:100%;font-size:13px"><tbody>' +
                    '<tr><td><strong>お名前</strong></td><td>' + esc(r.customer_name) + '</td><td><strong>フリガナ</strong></td><td>' + esc(r.customer_kana) + '</td></tr>' +
                    '<tr><td><strong>メール</strong></td><td>' + esc(r.customer_email) + '</td><td><strong>電話</strong></td><td>' + esc(r.customer_tel) + '</td></tr>' +
                    '<tr><td><strong>郵便番号</strong></td><td>' + esc(r.customer_zip) + '</td><td><strong>住所</strong></td><td>' + esc(r.customer_address) + '</td></tr>' +
                    '<tr><td><strong>免許証番号</strong></td><td>' + esc(r.license_no) + '</td><td><strong>車両</strong></td><td>' + esc(r.vehicle_name) + '</td></tr>' +
                    '<tr><td><strong>貸出日時</strong></td><td>' + esc(r.pickup_at) + '</td><td><strong>返却日時</strong></td><td>' + esc(r.return_at) + '</td></tr>' +
                    '<tr><td><strong>合計金額</strong></td><td>' + formatPrice(r.total_amount) + '</td><td><strong>ステータス</strong></td><td>' + badge(r.status) + '</td></tr>' +
                    '<tr><td><strong>決済</strong></td><td>' + badge(r.payment_status) + '</td><td><strong>備考</strong></td><td>' + esc(r.note) + '</td></tr>' +
                    '</tbody></table>' +
                    '<div style="margin-top:16px"><label class="rca-label">ステータス変更</label><select class="rca-select" id="rca-res-status-change" style="width:200px;display:inline-block">' +
                    '<option value="pending"' + (r.status === 'pending' ? ' selected' : '') + '>保留中</option>' +
                    '<option value="confirmed"' + (r.status === 'confirmed' ? ' selected' : '') + '>確定</option>' +
                    '<option value="cancelled"' + (r.status === 'cancelled' ? ' selected' : '') + '>キャンセル</option>' +
                    '<option value="completed"' + (r.status === 'completed' ? ' selected' : '') + '>完了</option>' +
                    '<option value="no_show"' + (r.status === 'no_show' ? ' selected' : '') + '>ノーショー</option>' +
                    '</select> <button class="rca-btn rca-btn-primary rca-btn-sm" id="rca-res-update-status" data-id="' + r.id + '">更新</button></div>' +
                    '<div class="rca-modal-footer"><button class="rca-btn rca-btn-secondary" onclick="jQuery(\'#rca-res-detail-modal\').remove()">閉じる</button></div>' +
                    '</div></div>';
                $('body').append(m);
                $('#rca-res-update-status').on('click', function () {
                    api('PUT', '/admin/reservations/' + $(this).data('id'), { status: $('#rca-res-status-change').val() })
                        .done(function () { toast('更新しました'); $('#rca-res-detail-modal').remove(); refresh(); });
                });
            });
        });
    }

    /* ── Prices ────────────────────────────────────────── */
    function loadPrices() {
        var html = '<div class="rca-toolbar"><button class="rca-btn rca-btn-primary" id="rca-add-price">+ 料金プランを追加</button></div><div id="rca-prices-table"></div>';
        $app.html(html);
        function refresh() {
            api('GET', '/admin/prices').done(function (items) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>ID</th><th>車両ID</th><th>タイプ</th><th>ラベル</th><th>期間</th><th>金額</th><th>操作</th></tr></thead><tbody>';
                items.forEach(function (p) {
                    var period = p.date_from ? esc(p.date_from) + ' ～ ' + esc(p.date_to) : '-';
                    t += '<tr><td>' + p.id + '</td><td>' + p.vehicle_id + '</td><td>' + esc(p.price_type) + '</td><td>' + esc(p.label) + '</td><td>' + period + '</td><td>' + formatPrice(p.amount) + '</td><td><button class="rca-btn rca-btn-sm rca-btn-danger rca-del-price" data-id="' + p.id + '">削除</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-prices-table').html(t);
            });
        }
        refresh();
        $('#rca-add-price').on('click', function () {
            var vid = prompt('車両ID:'); if (!vid) return;
            var type = prompt('タイプ (base/daily/hourly/season):', 'daily'); if (!type) return;
            var label = prompt('ラベル:', '通常料金');
            var amount = prompt('金額（円）:', '5000');
            api('POST', '/admin/prices', { vehicle_id: parseInt(vid), price_type: type, label: label, amount: parseInt(amount) })
                .done(function () { toast('追加しました'); refresh(); });
        });
        $(document).on('click', '.rca-del-price', function () {
            if (!confirm('削除しますか？')) return;
            api('DELETE', '/admin/prices/' + $(this).data('id')).done(function () { toast('削除しました'); refresh(); });
        });
    }

    /* ── Options ───────────────────────────────────────── */
    function loadOptions() {
        var html = '<div class="rca-toolbar"><button class="rca-btn rca-btn-primary" id="rca-add-option">+ オプション追加</button></div><div id="rca-options-table"></div>';
        $app.html(html);
        function refresh() {
            api('GET', '/admin/options').done(function (items) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>ID</th><th>名前</th><th>金額</th><th>単位</th><th>状態</th><th>操作</th></tr></thead><tbody>';
                items.forEach(function (o) {
                    t += '<tr><td>' + o.id + '</td><td>' + esc(o.name) + '</td><td>' + formatPrice(o.amount) + '</td><td>' + esc(o.unit) + '</td><td>' + badge(o.status === 'published' ? 'confirmed' : 'cancelled') + '</td>' +
                        '<td><button class="rca-btn rca-btn-sm rca-btn-danger rca-del-option" data-id="' + o.id + '">削除</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-options-table').html(t);
            });
        }
        refresh();
        $('#rca-add-option').on('click', function () {
            var name = prompt('オプション名:'); if (!name) return;
            var amount = prompt('金額（円）:', '1000');
            var unit = prompt('単位 (per_reservation/per_day):', 'per_reservation');
            api('POST', '/admin/options', { name: name, amount: parseInt(amount), unit: unit }).done(function () { toast('追加しました'); refresh(); });
        });
        $(document).on('click', '.rca-del-option', function () {
            if (!confirm('削除しますか？')) return;
            api('DELETE', '/admin/options/' + $(this).data('id')).done(function () { toast('削除しました'); refresh(); });
        });
    }

    /* ── Slots ─────────────────────────────────────────── */
    function loadSlots() {
        var html = '<div class="rca-toolbar"><div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">車両ID</label><input type="number" class="rca-input" id="rca-slot-vid" value="1" style="width:80px"></div>' +
            '<div class="rca-form-group"><label class="rca-label">開始日</label><input type="date" class="rca-input" id="rca-slot-from"></div>' +
            '<div class="rca-form-group"><label class="rca-label">終了日</label><input type="date" class="rca-input" id="rca-slot-to"></div>' +
            '<div class="rca-form-group"><button class="rca-btn rca-btn-primary" id="rca-slot-load" style="margin-top:20px">表示</button></div></div></div>' +
            '<div class="rca-toolbar" style="margin-top:8px"><div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">一括設定: 台数</label><input type="number" class="rca-input" id="rca-slot-bulk-cap" value="1" style="width:80px" min="0"></div>' +
            '<div class="rca-form-group"><button class="rca-btn rca-btn-primary" id="rca-slot-bulk" style="margin-top:20px">一括適用</button></div></div></div>' +
            '<div id="rca-slot-table"></div>';
        $app.html(html);
        var today = new Date().toISOString().split('T')[0];
        var future = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
        $('#rca-slot-from').val(today); $('#rca-slot-to').val(future);

        function refresh() {
            var vid = $('#rca-slot-vid').val(), from = $('#rca-slot-from').val(), to = $('#rca-slot-to').val();
            api('GET', '/admin/slots', { vehicle_id: vid, from: from, to: to }).done(function (d) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>日付</th><th>容量</th><th>予約済み</th><th>空き</th><th>状態</th></tr></thead><tbody>';
                Object.keys(d.days).sort().forEach(function (date) {
                    var day = d.days[date];
                    t += '<tr><td>' + date + '</td><td>' + day.capacity + '</td><td>' + day.booked + '</td><td>' + day.available + '</td><td>' + badge(day.status === 'available' ? 'confirmed' : day.status === 'few' ? 'pending' : day.status === 'holiday' ? 'cancelled' : 'cancelled') + '</td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-slot-table').html(t);
            });
        }
        $('#rca-slot-load').on('click', refresh);
        $('#rca-slot-bulk').on('click', function () {
            var vid = $('#rca-slot-vid').val(), from = $('#rca-slot-from').val(), to = $('#rca-slot-to').val(), cap = $('#rca-slot-bulk-cap').val();
            api('POST', '/admin/slots/bulk', { vehicle_id: parseInt(vid), from: from, to: to, capacity: parseInt(cap) }).done(function (d) { toast(d.count + '日分更新しました'); refresh(); });
        });
    }

    /* ── Holidays ──────────────────────────────────────── */
    function loadHolidays() {
        var html = '<div class="rca-toolbar"><button class="rca-btn rca-btn-primary" id="rca-add-holiday">+ 休業日を追加</button></div><div id="rca-holidays-table"></div>';
        $app.html(html);
        function refresh() {
            api('GET', '/admin/holidays').done(function (items) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>日付</th><th>ラベル</th><th>車両ID (0=全体)</th><th>操作</th></tr></thead><tbody>';
                items.forEach(function (h) {
                    t += '<tr><td>' + esc(h.date) + '</td><td>' + esc(h.label) + '</td><td>' + h.vehicle_id + '</td><td><button class="rca-btn rca-btn-sm rca-btn-danger rca-del-holiday" data-id="' + h.id + '">削除</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-holidays-table').html(t);
            });
        }
        refresh();
        $('#rca-add-holiday').on('click', function () {
            var date = prompt('日付 (YYYY-MM-DD):'); if (!date) return;
            var label = prompt('ラベル:', '休業日');
            api('POST', '/admin/holidays', { date: date, label: label, vehicle_id: 0 }).done(function () { toast('追加しました'); refresh(); });
        });
        $(document).on('click', '.rca-del-holiday', function () {
            if (!confirm('削除しますか？')) return;
            api('DELETE', '/admin/holidays/' + $(this).data('id')).done(function () { toast('削除しました'); refresh(); });
        });
    }

    /* ── Payments ──────────────────────────────────────── */
    function loadPayments() {
        $app.html('<div id="rca-payments-table"></div>');
        api('GET', '/admin/payments', { per_page: 50 }).done(function (d) {
            var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>ID</th><th>予約番号</th><th>お客様</th><th>ゲートウェイ</th><th>金額</th><th>ステータス</th><th>日時</th></tr></thead><tbody>';
            d.items.forEach(function (p) {
                t += '<tr><td>' + p.id + '</td><td>' + esc(p.reservation_code) + '</td><td>' + esc(p.customer_name) + '</td><td>' + esc(p.gateway) + '</td><td>' + formatPrice(p.amount) + '</td><td>' + badge(p.status) + '</td><td>' + esc(p.created_at) + '</td></tr>';
            });
            t += '</tbody></table></div>';
            $app.html(t);
        });
    }

    /* ── Mail Templates ───────────────────────────────── */
    function loadMailTemplates() {
        $app.html('<div id="rca-tpl-list"></div>');
        api('GET', '/admin/mail-templates').done(function (items) {
            var html = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>キー</th><th>件名</th><th>送信先</th><th>有効</th><th>操作</th></tr></thead><tbody>';
            items.forEach(function (t) {
                html += '<tr><td>' + esc(t.template_key) + '</td><td>' + esc(t.subject) + '</td><td>' + esc(t.to_type) + '</td><td>' + (t.enabled == 1 ? '✓' : '✗') + '</td>' +
                    '<td><button class="rca-btn rca-btn-sm rca-btn-secondary rca-edit-tpl" data-id="' + t.id + '">編集</button></td></tr>';
            });
            html += '</tbody></table></div>';
            $app.html(html);
        });
        $(document).on('click', '.rca-edit-tpl', function () {
            var id = $(this).data('id');
            api('GET', '/admin/mail-templates/' + id).done(function (t) {
                var m = '<div class="rca-modal-overlay active" id="rca-tpl-modal"><div class="rca-modal" style="max-width:700px">' +
                    '<h3 class="rca-modal-title">テンプレート編集: ' + esc(t.template_key) + '</h3>' +
                    '<div class="rca-form-group"><label class="rca-label">件名</label><input class="rca-input" id="rca-tpl-subject" value="' + esc(t.subject).replace(/"/g, '&quot;') + '"></div>' +
                    '<div class="rca-form-group"><label class="rca-label">本文</label><textarea class="rca-textarea" id="rca-tpl-body" rows="12">' + esc(t.body) + '</textarea></div>' +
                    '<div class="rca-form-group"><label><input type="checkbox" id="rca-tpl-enabled"' + (t.enabled == 1 ? ' checked' : '') + '> 有効</label></div>' +
                    '<p style="font-size:11px;color:#999">プレースホルダー: {customer_name} {reservation_code} {vehicle_name} {pickup_at} {return_at} {total_amount} {cancel_url} {store_name} {store_tel} {store_email} {site_url}</p>' +
                    '<div class="rca-modal-footer"><button class="rca-btn rca-btn-secondary" onclick="jQuery(\'#rca-tpl-modal\').remove()">閉じる</button><button class="rca-btn rca-btn-primary" id="rca-tpl-save" data-id="' + t.id + '">保存</button></div></div></div>';
                $('body').append(m);
                $('#rca-tpl-save').on('click', function () {
                    api('PUT', '/admin/mail-templates/' + $(this).data('id'), {
                        subject: $('#rca-tpl-subject').val(), body: $('#rca-tpl-body').val(), enabled: $('#rca-tpl-enabled').is(':checked') ? 1 : 0
                    }).done(function () { toast('保存しました'); $('#rca-tpl-modal').remove(); loadMailTemplates(); });
                });
            });
        });
    }

    /* ── Mail Logs ─────────────────────────────────────── */
    function loadMailLogs() {
        $app.html('<div id="rca-logs-table"></div>');
        api('GET', '/admin/mail-logs', { per_page: 50 }).done(function (d) {
            var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>ID</th><th>テンプレート</th><th>宛先</th><th>件名</th><th>状態</th><th>リトライ</th><th>送信日</th><th>操作</th></tr></thead><tbody>';
            d.items.forEach(function (l) {
                t += '<tr><td>' + l.id + '</td><td>' + esc(l.template_key) + '</td><td>' + esc(l.to_address) + '</td><td>' + esc(l.subject) + '</td><td>' + badge(l.status) + '</td><td>' + l.retry_count + '</td><td>' + esc(l.sent_at || '-') + '</td>' +
                    '<td>' + (l.status === 'failed' ? '<button class="rca-btn rca-btn-sm rca-btn-primary rca-resend-mail" data-id="' + l.id + '">再送</button>' : '') + '</td></tr>';
            });
            t += '</tbody></table></div>';
            $app.html(t);
        });
        $(document).on('click', '.rca-resend-mail', function () {
            api('POST', '/admin/mail-logs/' + $(this).data('id') + '/resend').done(function (r) {
                toast(r.success ? '再送信しました' : '再送信に失敗しました', !r.success);
                loadMailLogs();
            });
        });
    }

    /* ── Settings ──────────────────────────────────────── */
    function loadSettings() {
        api('GET', '/admin/settings').done(function (s) {
            var html = '<form id="rca-settings-form">' +
                '<h3 class="rca-section-title">店舗情報</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">店舗名</label><input class="rca-input" name="store_name" value="' + esc(s.store_name) + '"></div>' +
                '<div class="rca-form-group"><label class="rca-label">電話番号</label><input class="rca-input" name="store_tel" value="' + esc(s.store_tel) + '"></div></div>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">メールアドレス</label><input class="rca-input" name="store_email" value="' + esc(s.store_email) + '"></div>' +
                '<div class="rca-form-group"><label class="rca-label">住所</label><input class="rca-input" name="store_address" value="' + esc(s.store_address) + '"></div></div>' +
                '<div class="rca-form-group"><label class="rca-label">営業時間</label><div class="rca-form-row"><input class="rca-input" name="business_hours_start" value="' + esc(s.business_hours_start) + '" style="width:120px"> ～ <input class="rca-input" name="business_hours_end" value="' + esc(s.business_hours_end) + '" style="width:120px"></div></div>' +
                '<h3 class="rca-section-title">reCAPTCHA v3</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">サイトキー</label><input class="rca-input" name="recaptcha_site_key" value="' + esc(s.recaptcha_site_key) + '"></div>' +
                '<div class="rca-form-group"><label class="rca-label">シークレットキー</label><input class="rca-input" name="recaptcha_secret_key" value="' + esc(s.recaptcha_secret_key) + '"></div></div>' +
                '<div class="rca-form-group"><label class="rca-label">スコア閾値</label><input class="rca-input" name="recaptcha_score" value="' + esc(s.recaptcha_score) + '" style="width:100px"></div>' +
                '<h3 class="rca-section-title">決済設定</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label><input type="checkbox" name="payment_onsite_enabled" value="1"' + (s.payment_onsite_enabled == '1' ? ' checked' : '') + '> 現地決済を有効にする</label></div>' +
                '<div class="rca-form-group"><label><input type="checkbox" name="payment_square_enabled" value="1"' + (s.payment_square_enabled == '1' ? ' checked' : '') + '> Square決済を有効にする</label></div></div>' +
                '<h3 class="rca-section-title">Square API（オプション）</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">Application ID</label><input class="rca-input" name="square_application_id" value="' + esc(s.square_application_id) + '"></div>' +
                '<div class="rca-form-group"><label class="rca-label">Location ID</label><input class="rca-input" name="square_location_id" value="' + esc(s.square_location_id) + '"></div></div>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">Access Token' + (s.square_access_token_set ? ' (設定済み)' : '') + '</label><input class="rca-input" name="square_access_token" placeholder="変更する場合のみ入力"></div>' +
                '<div class="rca-form-group"><label><input type="checkbox" name="square_sandbox_mode" value="1"' + (s.square_sandbox_mode == '1' ? ' checked' : '') + '> サンドボックスモード</label></div></div>' +
                '<h3 class="rca-section-title">その他</h3>' +
                '<div class="rca-form-group"><label class="rca-label">レート制限（1分あたり）</label><input class="rca-input" name="rate_limit_per_minute" value="' + esc(s.rate_limit_per_minute) + '" style="width:100px"></div>' +
                '<div style="margin-top:20px"><button type="submit" class="rca-btn rca-btn-primary">設定を保存</button></div>' +
                '</form>';

            html += '<h3 class="rca-section-title" style="margin-top:32px">メール送信テスト</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><input class="rca-input" id="rca-test-mail-to" placeholder="テスト送信先メール" style="width:300px"></div>' +
                '<div class="rca-form-group"><button class="rca-btn rca-btn-secondary" id="rca-test-mail-btn">テスト送信</button></div></div>';
            $app.html(html);

            $('#rca-settings-form').on('submit', function (e) {
                e.preventDefault();
                var data = {};
                $(this).find('input,select,textarea').each(function () {
                    var name = $(this).attr('name');
                    if (!name) return;
                    if ($(this).attr('type') === 'checkbox') {
                        data[name] = $(this).is(':checked') ? '1' : '0';
                    } else {
                        data[name] = $(this).val();
                    }
                });
                api('POST', '/admin/settings', data).done(function () { toast('設定を保存しました'); });
            });

            $('#rca-test-mail-btn').on('click', function () {
                var to = $('#rca-test-mail-to').val();
                if (!to) { alert('メールアドレスを入力してください'); return; }
                api('POST', '/admin/settings/test-mail', { to: to }).done(function (r) {
                    toast(r.success ? 'テストメールを送信しました' : 'メール送信に失敗しました', !r.success);
                });
            });
        });
    }

    /* ── System ────────────────────────────────────────── */
    function loadSystem() {
        api('GET', '/admin/settings/system').done(function (d) {
            var html = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>項目</th><th>値</th></tr></thead><tbody>' +
                '<tr><td>PHP バージョン</td><td>' + esc(d.php_version) + '</td></tr>' +
                '<tr><td>WordPress バージョン</td><td>' + esc(d.wp_version) + '</td></tr>' +
                '<tr><td>プラグインバージョン</td><td>' + esc(d.plugin_version) + '</td></tr>' +
                '<tr><td>DB バージョン</td><td>' + esc(d.db_version) + '</td></tr>' +
                '<tr><td>タイムゾーン</td><td>' + esc(d.timezone) + '</td></tr>' +
                '<tr><td>メモリ上限</td><td>' + esc(d.memory_limit) + '</td></tr>' +
                '<tr><td>アップロード上限</td><td>' + esc(d.upload_max) + '</td></tr>' +
                '<tr><td>OpenSSL</td><td>' + (d.openssl ? '✓ 有効' : '✗ 無効') + '</td></tr>' +
                '</tbody></table></div>';

            html += '<h3 class="rca-section-title" style="margin-top:24px">テーブル情報</h3>';
            html += '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>テーブル名</th><th>レコード数</th></tr></thead><tbody>';
            d.tables.forEach(function (t) {
                html += '<tr><td>' + esc(t.name) + '</td><td>' + t.rows + '</td></tr>';
            });
            html += '</tbody></table></div>';
            $app.html(html);
        });
    }

})(jQuery);
