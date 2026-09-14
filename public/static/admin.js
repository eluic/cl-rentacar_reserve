(function ($) {
    'use strict';

    var API = rcAdminData.restUrl;
    var nonce = rcAdminData.nonce;

    function api(method, path, data) {
        var opts = {
            method: method,
            url: API + path,
            dataType: 'json',
            contentType: 'application/json'
        };
        if (nonce && nonce !== 'preview-nonce') {
            opts.beforeSend = function (xhr) { xhr.setRequestHeader('X-WP-Nonce', nonce); };
        }
        if (data && method !== 'GET') opts.data = JSON.stringify(data);
        if (data && method === 'GET') opts.data = data;
        return $.ajax(opts);
    }

    function formatPrice(a) { return '¥' + Number(a).toLocaleString(); }
    function esc(s) { return $('<span>').text(s || '').html(); }
    function badge(status) {
        var map = { pending: 'pending', confirmed: 'confirmed', cancelled: 'cancelled', completed: 'completed',
                    no_show: 'cancelled', sent: 'confirmed', failed: 'cancelled' };
        var labels = { pending: '保留中', confirmed: '確定', cancelled: 'キャンセル', completed: '完了',
                       no_show: 'ノーショー', sent: '送信済み', failed: '失敗' };
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
        analytics: loadAnalytics,
        vehicles: loadVehicles,
        reservations: loadReservations,
        options: loadOptions,
        holidays: loadHolidays,
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

    /* ── Analytics ──────────────────────────────────────── */
    function loadAnalytics() {
        var chartInstances = {};

        function destroyCharts() {
            Object.keys(chartInstances).forEach(function (k) {
                if (chartInstances[k]) { chartInstances[k].destroy(); chartInstances[k] = null; }
            });
        }

        // Period filter
        var html = '<div class="rca-toolbar" style="margin-bottom:20px">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
            '<span style="font-size:14px;font-weight:600;color:#555">📅 期間:</span>' +
            '<select class="rca-select" id="rca-analytics-period" style="width:180px">' +
            '<option value="all">全期間</option>' +
            '<option value="this_month">今月</option>' +
            '<option value="last_month">先月</option>' +
            '<option value="last_3months">過去3ヶ月</option>' +
            '<option value="last_6months">過去6ヶ月</option>' +
            '<option value="this_year">今年</option>' +
            '</select></div></div>' +
            '<div id="rca-analytics-content"><div class="rc-loading"><span class="rc-spinner"></span> 分析データを読み込み中...</div></div>';
        $app.html(html);

        function loadData(period) {
            destroyCharts();
            $('#rca-analytics-content').html('<div class="rc-loading">分析データを読み込み中...</div>');
            api('GET', '/admin/analytics', { period: period }).done(function (d) {
                renderAnalytics(d);
            }).fail(function () {
                $('#rca-analytics-content').html('<p style="color:red;text-align:center;padding:40px">データの取得に失敗しました</p>');
            });
        }

        $('#rca-analytics-period').on('change', function () {
            loadData($(this).val());
        });
        loadData('all');

        function renderAnalytics(d) {
            var s = d.summary;
            var out = '';

            // ── Section 1: KPI Summary Panels ──
            out += '<div class="rca-analytics-kpi">' +
                '<div class="rca-kpi-card">' +
                  '<div class="rca-kpi-icon" style="background:#e3f2fd;color:#1565c0">📋</div>' +
                  '<div class="rca-kpi-data"><div class="rca-kpi-value">' + s.total_reservations + '<span class="rca-kpi-unit">件</span></div><div class="rca-kpi-label">総予約件数</div></div></div>' +
                '<div class="rca-kpi-card">' +
                  '<div class="rca-kpi-icon" style="background:#e8f5e9;color:#2e7d32">💰</div>' +
                  '<div class="rca-kpi-data"><div class="rca-kpi-value">' + formatPrice(s.total_sales) + '</div><div class="rca-kpi-label">総売上</div></div></div>' +
                '<div class="rca-kpi-card">' +
                  '<div class="rca-kpi-icon" style="background:#fff3e0;color:#e65100">📊</div>' +
                  '<div class="rca-kpi-data"><div class="rca-kpi-value">' + formatPrice(s.avg_price) + '</div><div class="rca-kpi-label">平均単価</div></div></div>' +
                '<div class="rca-kpi-card">' +
                  '<div class="rca-kpi-icon" style="background:#fce4ec;color:#c62828">❌</div>' +
                  '<div class="rca-kpi-data"><div class="rca-kpi-value">' + s.cancel_rate + '<span class="rca-kpi-unit">%</span></div><div class="rca-kpi-label">キャンセル率</div></div></div>' +
                '<div class="rca-kpi-card">' +
                  '<div class="rca-kpi-icon" style="background:#e0f7fa;color:#00838f">🚗</div>' +
                  '<div class="rca-kpi-data"><div class="rca-kpi-value">' + s.utilization_rate + '<span class="rca-kpi-unit">%</span></div><div class="rca-kpi-label">稼働率</div></div></div>' +
                '<div class="rca-kpi-card">' +
                  '<div class="rca-kpi-icon" style="background:#f3e5f5;color:#7b1fa2">🔄</div>' +
                  '<div class="rca-kpi-data"><div class="rca-kpi-value">' + s.repeat_rate + '<span class="rca-kpi-unit">%</span></div><div class="rca-kpi-label">リピート率</div></div></div>' +
                '</div>';

            // Status breakdown mini
            out += '<div class="rca-status-mini" style="margin-bottom:24px">' +
                '<span class="rca-status-pill" style="background:#e8f5e9;color:#2e7d32">確定/完了 ' + s.confirmed_count + '件</span>' +
                '<span class="rca-status-pill" style="background:#fff3e0;color:#e65100">保留中 ' + s.pending_count + '件</span>' +
                '<span class="rca-status-pill" style="background:#ffebee;color:#c62828">キャンセル ' + s.cancelled_count + '件</span>' +
                '</div>';

            // ── Section 2: Monthly Trends Chart ──
            out += '<div class="rca-analytics-section">' +
                '<h3 class="rca-section-title">📈 月別売上推移</h3>' +
                '<div class="rca-chart-container" style="position:relative;height:320px;background:#fff;border-radius:8px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.1)">' +
                '<canvas id="rca-monthly-chart"></canvas></div></div>';

            // ── Section 3: Vehicle Analysis ──
            out += '<div class="rca-analytics-section" style="margin-top:24px">' +
                '<h3 class="rca-section-title">🚗 車両別分析</h3>' +
                '<div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start">' +
                '<div class="rca-table-wrap"><table class="rca-table" id="rca-vehicle-analysis-table"><thead><tr>' +
                '<th>車両名</th><th>予約数</th><th>売上</th><th>稼働日数</th><th>日額平均</th><th>稼働率</th></tr></thead><tbody>';

            d.vehicle_analysis.forEach(function (v) {
                var barWidth = Math.min(100, v.utilization);
                out += '<tr><td style="font-weight:600;white-space:nowrap">' + esc(v.vehicle_name) + '</td>' +
                    '<td style="text-align:center">' + v.reservation_count + '件</td>' +
                    '<td style="text-align:right;font-weight:600">' + formatPrice(v.total_sales) + '</td>' +
                    '<td style="text-align:center">' + v.total_days + '日</td>' +
                    '<td style="text-align:right">' + formatPrice(v.avg_per_day) + '</td>' +
                    '<td style="min-width:100px"><div class="rca-bar-bg"><div class="rca-bar-fill" style="width:' + barWidth + '%">' + v.utilization + '%</div></div></td></tr>';
            });

            out += '</tbody></table></div>' +
                '<div style="background:#fff;border-radius:8px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.1)">' +
                '<div style="font-size:14px;font-weight:700;margin-bottom:12px;text-align:center;color:#555">売上構成比</div>' +
                '<div style="position:relative;height:250px"><canvas id="rca-vehicle-pie"></canvas></div></div>' +
                '</div></div>';

            $('#rca-analytics-content').html(out);

            // ── Render Charts ──
            renderMonthlyChart(d.monthly_trends);
            renderVehiclePie(d.vehicle_analysis);
        }

        function renderMonthlyChart(trends) {
            var ctx = document.getElementById('rca-monthly-chart');
            if (!ctx) return;
            var labels = trends.map(function (t) { return t.label; });
            var salesData = trends.map(function (t) { return t.sales; });
            var countData = trends.map(function (t) { return t.count; });

            chartInstances.monthly = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '売上 (¥)',
                            data: salesData,
                            backgroundColor: 'rgba(0, 188, 212, 0.6)',
                            borderColor: '#00bcd4',
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y',
                            order: 2
                        },
                        {
                            label: '予約件数',
                            data: countData,
                            type: 'line',
                            borderColor: '#ff9800',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#ff9800',
                            fill: true,
                            tension: 0.3,
                            yAxisID: 'y1',
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    if (ctx.dataset.yAxisID === 'y') return '売上: ¥' + ctx.parsed.y.toLocaleString();
                                    return '予約: ' + ctx.parsed.y + '件';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            position: 'left',
                            title: { display: true, text: '売上 (¥)' },
                            ticks: { callback: function (v) { return '¥' + v.toLocaleString(); } }
                        },
                        y1: {
                            beginAtZero: true,
                            position: 'right',
                            title: { display: true, text: '予約件数' },
                            grid: { drawOnChartArea: false },
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }

        function renderVehiclePie(vehicleData) {
            var ctx = document.getElementById('rca-vehicle-pie');
            if (!ctx) return;
            var filtered = vehicleData.filter(function (v) { return v.total_sales > 0; });
            if (!filtered.length) {
                $(ctx).parent().html('<p style="text-align:center;color:#999;padding:40px">データなし</p>');
                return;
            }
            var colors = ['#00bcd4', '#ff9800', '#4caf50', '#e53935', '#9c27b0', '#3f51b5', '#795548', '#607d8b'];
            chartInstances.vehiclePie = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: filtered.map(function (v) { return v.vehicle_name.split(' (')[0]; }),
                    datasets: [{
                        data: filtered.map(function (v) { return v.total_sales; }),
                        backgroundColor: colors.slice(0, filtered.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                                    var pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                                    return ctx.label + ': ¥' + ctx.parsed.toLocaleString() + ' (' + pct + '%)';
                                }
                            }
                        }
                    },
                    cutout: '55%'
                }
            });
        }
    }

    /* ── Vehicles (with Pricing & Blocks tabs) ────────── */
    function loadVehicles() {
        var html = '<div class="rca-toolbar"><button class="rca-btn rca-btn-primary" id="rca-add-vehicle">+ 車両を追加</button></div>' +
            '<div id="rca-vehicles-table"></div>';
        $app.html(html);

        function refreshTable() {
            api('GET', '/admin/vehicles').done(function (d) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>ID</th><th>車両名</th><th>定員</th><th>MT</th><th>基本料金</th><th>在庫</th><th>状態</th><th>操作</th></tr></thead><tbody>';
                d.items.forEach(function (v) {
                    var seats = (v.meta && v.meta.seats) || '-';
                    var trans = (v.meta && v.meta.transmission) || '-';
                    t += '<tr><td>' + v.id + '</td><td>' + esc(v.name) + '</td><td>' + seats + '</td><td>' + trans + '</td><td>' + formatPrice(v.base_price) + '</td><td>' + v.stock + '</td><td>' + badge(v.status === 'published' ? 'confirmed' : 'cancelled') + '</td>' +
                        '<td><button class="rca-btn rca-btn-sm rca-btn-secondary rca-edit-vehicle" data-id="' + v.id + '">編集</button> ' +
                        '<button class="rca-btn rca-btn-sm" style="background:#ff9800;color:#fff" data-id="' + v.id + '" data-name="' + esc(v.name) + '" onclick="window._openVehicleBlocks(' + v.id + ',\'' + esc(v.name).replace(/'/g, "\\'") + '\')">ブロック</button> ' +
                        '<button class="rca-btn rca-btn-sm rca-btn-danger rca-del-vehicle" data-id="' + v.id + '">削除</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-vehicles-table').html(t);
            });
        }
        refreshTable();

        $('#rca-add-vehicle').on('click', function () { openVehicleModal(0); });

        $(document).on('click', '.rca-edit-vehicle', function () {
            openVehicleModal($(this).data('id'));
        });

        $(document).on('click', '.rca-del-vehicle', function () {
            if (!confirm('この車両を削除しますか？')) return;
            api('DELETE', '/admin/vehicles/' + $(this).data('id')).done(function () { toast('削除しました'); refreshTable(); });
        });

        // ── Vehicle Edit Modal (with inline pricing) ──
        function openVehicleModal(id) {
            $('.rca-modal-overlay').remove();
            var pricingSection = id
                ? '<div style="border-top:2px solid #00bcd4;margin-top:24px;padding-top:16px">' +
                  '<h4 style="font-size:15px;font-weight:700;color:#00bcd4;margin-bottom:12px">📅 期間別料金設定</h4>' +
                  '<p style="font-size:12px;color:#666;margin-bottom:12px">期間ごとの日額料金を設定します。基本料金は上の「基本料金」が適用されます。<br>例: 10/1〜10/31 → ¥5,500/日</p>' +
                  '<div id="rv-pricing-list"><div class="rc-loading" style="padding:12px">読み込み中...</div></div>' +
                  '<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-top:12px">' +
                  '<div style="font-size:13px;font-weight:600;margin-bottom:8px">＋ 料金期間を追加</div>' +
                  '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">開始日</label><input type="date" class="rca-input" id="rv-p-from"></div>' +
                  '<div class="rca-form-group"><label class="rca-label">終了日</label><input type="date" class="rca-input" id="rv-p-to"></div>' +
                  '<div class="rca-form-group"><label class="rca-label">日額（円）</label><input type="number" class="rca-input" id="rv-p-amount" value="5000" min="0"></div></div>' +
                  '<div class="rca-form-row" style="margin-top:4px"><div class="rca-form-group"><label class="rca-label">ラベル</label><input class="rca-input" id="rv-p-label" placeholder="例: ハイシーズン"></div>' +
                  '<div class="rca-form-group" style="padding-top:20px"><button class="rca-btn rca-btn-primary rca-btn-sm" id="rv-p-add">追加</button></div></div>' +
                  '</div></div>'
                : '';

            var m = '<div class="rca-modal-overlay active" id="rca-vehicle-modal"><div class="rca-modal" style="max-width:720px;max-height:90vh;overflow-y:auto">' +
                '<h3 class="rca-modal-title">' + (id ? '車両編集' : '車両追加') + '</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">車両名</label><input class="rca-input" id="rv-name"></div>' +
                '<div class="rca-form-group"><label class="rca-label">スラッグ</label><input class="rca-input" id="rv-slug"></div></div>' +
                '<div class="rca-form-group"><label class="rca-label">説明</label><textarea class="rca-textarea" id="rv-desc" rows="3"></textarea></div>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">基本料金（円/日）</label><input type="number" class="rca-input" id="rv-price" value="0"></div>' +
                '<div class="rca-form-group"><label class="rca-label">在庫台数</label><input type="number" class="rca-input" id="rv-stock" value="1" min="0"></div></div>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">定員</label><input type="number" class="rca-input" id="rv-seats" value="5" min="1"></div>' +
                '<div class="rca-form-group"><label class="rca-label">ミッション</label><select class="rca-select" id="rv-transmission"><option value="AT">AT</option><option value="MT">MT</option><option value="CVT">CVT</option></select></div></div>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">車両クラス</label><input class="rca-input" id="rv-class"></div>' +
                '<div class="rca-form-group"><label class="rca-label">ステータス</label><select class="rca-select" id="rv-status"><option value="published">公開</option><option value="private">非公開</option></select></div></div>' +
                '<div class="rca-form-group"><label class="rca-label">車両画像</label>' +
                '<div id="rv-thumb-wrap" style="display:flex;align-items:center;gap:12px;margin-top:4px">' +
                '<div id="rv-thumb-preview" style="width:120px;height:80px;border:2px dashed #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8f9fa;flex-shrink:0">' +
                '<span style="color:#bbb;font-size:12px" id="rv-thumb-placeholder">画像なし</span></div>' +
                '<div style="display:flex;flex-direction:column;gap:6px">' +
                '<button type="button" class="rca-btn rca-btn-secondary rca-btn-sm" id="rv-thumb-select" style="white-space:nowrap">メディアライブラリから選択</button>' +
                '<button type="button" class="rca-btn rca-btn-sm" id="rv-thumb-clear" style="white-space:nowrap;background:#eee;color:#666;display:none">クリア</button>' +
                '</div></div>' +
                '<input type="hidden" id="rv-thumb" value="0">' +
                '</div>' +
                '<input type="hidden" id="rv-id" value="0">' +
                pricingSection +
                '<div class="rca-modal-footer" style="margin-top:20px"><button class="rca-btn rca-btn-secondary" id="rca-vehicle-cancel">閉じる</button><button class="rca-btn rca-btn-primary" id="rca-vehicle-save">車両情報を保存</button></div>' +
                '</div></div>';
            $('body').append(m);

            if (id) {
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
                    if (v.thumbnail_url) {
                        $('#rv-thumb-preview').html('<img src="' + v.thumbnail_url + '" style="width:100%;height:100%;object-fit:cover">');
                        $('#rv-thumb-clear').show();
                    }
                });
                // Load pricing inline
                refreshVehiclePricing(id);
            }

            // Media library picker
            $('#rv-thumb-select').on('click', function () {
                if (typeof wp !== 'undefined' && wp.media) {
                    var frame = wp.media({
                        title: '車両画像を選択',
                        button: { text: '決定する' },
                        multiple: false,
                        library: { type: 'image' }
                    });
                    frame.on('select', function () {
                        var att = frame.state().get('selection').first().toJSON();
                        $('#rv-thumb').val(att.id);
                        var url = (att.sizes && att.sizes.medium) ? att.sizes.medium.url : att.url;
                        $('#rv-thumb-preview').html('<img src="' + url + '" style="width:100%;height:100%;object-fit:cover">');
                        $('#rv-thumb-clear').show();
                    });
                    frame.open();
                } else {
                    // Fallback for non-WP environments (preview)
                    var url = prompt('画像URLを入力してください:');
                    if (url) {
                        $('#rv-thumb').val(1);
                        $('#rv-thumb-preview').html('<img src="' + url + '" style="width:100%;height:100%;object-fit:cover">');
                        $('#rv-thumb-clear').show();
                    }
                }
            });
            $('#rv-thumb-clear').on('click', function () {
                $('#rv-thumb').val(0);
                $('#rv-thumb-preview').html('<span style="color:#bbb;font-size:12px" id="rv-thumb-placeholder">画像なし</span>');
                $(this).hide();
            });

            $('#rca-vehicle-cancel').on('click', function () { $('#rca-vehicle-modal').remove(); });
            $('#rca-vehicle-save').on('click', function () {
                var data = {
                    name: $('#rv-name').val(), slug: $('#rv-slug').val(), description: $('#rv-desc').val(),
                    base_price: parseInt($('#rv-price').val()), stock: parseInt($('#rv-stock').val()),
                    seats: parseInt($('#rv-seats').val()), transmission: $('#rv-transmission').val(),
                    vehicle_class: $('#rv-class').val(), status: $('#rv-status').val(),
                    thumbnail_id: parseInt($('#rv-thumb').val()) || 0
                };
                var vid = parseInt($('#rv-id').val());
                var req = vid ? api('PUT', '/admin/vehicles/' + vid, data) : api('POST', '/admin/vehicles', data);
                req.done(function () { toast('保存しました'); $('#rca-vehicle-modal').remove(); refreshTable(); })
                   .fail(function () { toast('保存に失敗しました', true); });
            });

            // Pricing add button
            $('#rv-p-add').on('click', function () {
                var data = {
                    date_from: $('#rv-p-from').val(),
                    date_to: $('#rv-p-to').val(),
                    price: parseInt($('#rv-p-amount').val()),
                    label: $('#rv-p-label').val()
                };
                if (!data.date_from || !data.date_to) { toast('開始日と終了日を入力してください', true); return; }
                api('POST', '/admin/vehicles/' + id + '/prices', data).done(function () {
                    toast('料金を追加しました');
                    $('#rv-p-from, #rv-p-to, #rv-p-label').val('');
                    refreshVehiclePricing(id);
                });
            });

            // Pricing delete (delegated)
            $(document).on('click', '.rca-del-vp', function () {
                var pid = $(this).data('id');
                if (!confirm('この料金設定を削除しますか？')) return;
                api('DELETE', '/admin/vehicles/' + id + '/prices/' + pid).done(function () {
                    toast('削除しました');
                    refreshVehiclePricing(id);
                });
            });

            // Pricing inline edit
            $(document).on('click', '.rca-edit-vp', function () {
                var $row = $(this).closest('tr');
                var pid = $row.data('id');
                var df = $row.data('from');
                var dt = $row.data('to');
                var pr = $row.data('price');
                var lb = $row.data('label');
                $row.html(
                    '<td><input type="date" class="rca-input" id="rca-ep-from-' + pid + '" value="' + df + '" style="font-size:12px;padding:4px 6px"></td>' +
                    '<td><input class="rca-input" id="rca-ep-label-' + pid + '" value="' + esc(lb) + '" style="font-size:12px;padding:4px 6px"></td>' +
                    '<td><div style="display:flex;align-items:center;gap:2px"><input type="number" class="rca-input" id="rca-ep-price-' + pid + '" value="' + pr + '" style="font-size:12px;padding:4px 6px;width:80px" min="0"><span style="font-size:11px;white-space:nowrap">/日</span></div>' +
                    '<input type="date" class="rca-input" id="rca-ep-to-' + pid + '" value="' + dt + '" style="font-size:12px;padding:4px 6px;margin-top:4px"></td>' +
                    '<td><button class="rca-btn rca-btn-sm rca-btn-primary rca-save-vp" data-id="' + pid + '" style="margin-right:4px">保存</button>' +
                    '<button class="rca-btn rca-btn-sm rca-btn-secondary rca-cancel-vp">中止</button></td>'
                );
            });

            // Pricing inline save
            $(document).on('click', '.rca-save-vp', function () {
                var pid = $(this).data('id');
                var data = {
                    date_from: $('#rca-ep-from-' + pid).val(),
                    date_to: $('#rca-ep-to-' + pid).val(),
                    price: parseInt($('#rca-ep-price-' + pid).val()),
                    label: $('#rca-ep-label-' + pid).val()
                };
                if (!data.date_from || !data.date_to) { toast('日付を入力してください', true); return; }
                api('PUT', '/admin/vehicles/' + id + '/prices/' + pid, data).done(function () {
                    toast('更新しました');
                    refreshVehiclePricing(id);
                }).fail(function () { toast('更新に失敗しました', true); });
            });

            // Pricing inline cancel
            $(document).on('click', '.rca-cancel-vp', function () {
                refreshVehiclePricing(id);
            });
        }

        function refreshVehiclePricing(vid) {
            api('GET', '/admin/vehicles/' + vid + '/prices').done(function (items) {
                if (!items.length) {
                    $('#rv-pricing-list').html('<p style="color:#999;text-align:center;padding:8px;font-size:13px">期間別料金はまだ設定されていません</p>');
                    return;
                }
                var t = '<div class="rca-table-wrap" style="font-size:13px"><table class="rca-table"><thead><tr><th>期間</th><th>ラベル</th><th>日額</th><th style="width:120px"></th></tr></thead><tbody>';
                items.forEach(function (p) {
                    var fromParts = p.date_from.split('-');
                    var toParts = p.date_to.split('-');
                    var period = parseInt(fromParts[1]) + '/' + parseInt(fromParts[2]) + ' ～ ' + parseInt(toParts[1]) + '/' + parseInt(toParts[2]);
                    t += '<tr class="rca-vp-row" data-id="' + p.id + '" data-from="' + p.date_from + '" data-to="' + p.date_to + '" data-price="' + p.price + '" data-label="' + esc(p.label) + '">' +
                        '<td>' + period + '</td><td>' + esc(p.label) + '</td><td><strong>' + formatPrice(p.price) + '</strong>/日</td>' +
                        '<td><button class="rca-btn rca-btn-sm rca-btn-secondary rca-edit-vp" data-id="' + p.id + '" style="margin-right:4px">編集</button>' +
                        '<button class="rca-btn rca-btn-sm rca-btn-danger rca-del-vp" data-id="' + p.id + '">削除</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rv-pricing-list').html(t);
            });
        }

        // ── Vehicle Blocks Modal ──
        window._openVehicleBlocks = function (vid, vname) {
            openBlocksModal(vid, vname);
        };

        function openBlocksModal(vid, vname) {
            $('.rca-modal-overlay').remove();
            var m = '<div class="rca-modal-overlay active" id="rca-blocks-modal"><div class="rca-modal" style="max-width:700px">' +
                '<h3 class="rca-modal-title" style="color:#ff9800">🔧 メンテナンスブロック: ' + esc(vname) + '</h3>' +
                '<p style="font-size:12px;color:#666;margin-bottom:16px">設定した期間中、この車両は予約不可になります。車検・修理・点検などのメンテナンス期間を管理できます。</p>' +
                '<div id="rca-blocks-table"><div class="rc-loading">読み込み中...</div></div>' +
                '<h4 style="margin-top:20px;font-size:14px;font-weight:700">新しいブロック期間を追加</h4>' +
                '<div class="rca-form-row" style="margin-top:8px">' +
                '<div class="rca-form-group"><label class="rca-label">開始日</label><input type="date" class="rca-input" id="rca-block-from"></div>' +
                '<div class="rca-form-group"><label class="rca-label">終了日</label><input type="date" class="rca-input" id="rca-block-to"></div>' +
                '</div>' +
                '<div class="rca-form-row" style="margin-top:4px">' +
                '<div class="rca-form-group"><label class="rca-label">理由</label><input class="rca-input" id="rca-block-reason" placeholder="例: 定期点検、タイヤ交換、車検"></div>' +
                '<div class="rca-form-group" style="padding-top:20px"><button class="rca-btn" style="background:#ff9800;color:#fff" id="rca-block-add">ブロック追加</button></div>' +
                '</div>' +
                '<div class="rca-modal-footer"><button class="rca-btn rca-btn-secondary" onclick="jQuery(\'#rca-blocks-modal\').remove()">閉じる</button></div>' +
                '</div></div>';
            $('body').append(m);

            function refreshBlocks() {
                api('GET', '/admin/vehicles/' + vid + '/blocks').done(function (items) {
                    if (!items.length) {
                        $('#rca-blocks-table').html('<p style="color:#999;text-align:center;padding:16px">ブロック設定はありません。</p>');
                        return;
                    }
                    var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>開始日</th><th>終了日</th><th>理由</th><th>操作</th></tr></thead><tbody>';
                    items.forEach(function (b) {
                        t += '<tr><td>' + esc(b.date_from) + '</td><td>' + esc(b.date_to) + '</td><td>' + esc(b.reason) + '</td>' +
                            '<td><button class="rca-btn rca-btn-sm rca-btn-danger rca-del-block" data-id="' + b.id + '">解除</button></td></tr>';
                    });
                    t += '</tbody></table></div>';
                    $('#rca-blocks-table').html(t);
                });
            }
            refreshBlocks();

            $('#rca-block-add').on('click', function () {
                var data = {
                    date_from: $('#rca-block-from').val(),
                    date_to: $('#rca-block-to').val(),
                    reason: $('#rca-block-reason').val()
                };
                if (!data.date_from || !data.date_to) { toast('開始日と終了日を入力してください', true); return; }
                if (!data.reason) { toast('理由を入力してください', true); return; }
                api('POST', '/admin/vehicles/' + vid + '/blocks', data).done(function () {
                    toast('ブロックを追加しました');
                    refreshBlocks();
                });
            });

            $(document).on('click', '.rca-del-block', function () {
                if (!confirm('このブロックを解除しますか？')) return;
                api('DELETE', '/admin/vehicles/' + vid + '/blocks/' + $(this).data('id')).done(function () {
                    toast('ブロックを解除しました');
                    refreshBlocks();
                });
            });
        }
    }

    /* ── Reservations (no payment_status) ─────────────── */
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
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>予約番号</th><th>お客様</th><th>車両</th><th>貸出日</th><th>返却日</th><th>金額</th><th>ステータス</th><th>操作</th></tr></thead><tbody>';
                d.items.forEach(function (r) {
                    t += '<tr><td>' + esc(r.reservation_code) + '</td><td>' + esc(r.customer_name) + '</td><td>' + esc(r.vehicle_name) + '</td><td>' + esc(r.pickup_at) + '</td><td>' + esc(r.return_at) + '</td><td>' + formatPrice(r.total_amount) + '</td><td>' + badge(r.status) + '</td>' +
                        '<td><button class="rca-btn rca-btn-sm rca-btn-secondary rca-view-res" data-id="' + r.id + '">詳細</button></td></tr>';
                });
                t += '</tbody></table></div>';
                $('#rca-res-table').html(t);
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
                    '<table style="width:100%;font-size:13px;border-collapse:collapse"><tbody>' +
                    '<tr><td style="padding:6px;font-weight:700">お名前</td><td style="padding:6px">' + esc(r.customer_name) + '</td><td style="padding:6px;font-weight:700">フリガナ</td><td style="padding:6px">' + esc(r.customer_kana) + '</td></tr>' +
                    '<tr><td style="padding:6px;font-weight:700">メール</td><td style="padding:6px">' + esc(r.customer_email) + '</td><td style="padding:6px;font-weight:700">電話</td><td style="padding:6px">' + esc(r.customer_tel) + '</td></tr>' +
                    '<tr><td style="padding:6px;font-weight:700">郵便番号</td><td style="padding:6px">' + esc(r.customer_zip) + '</td><td style="padding:6px;font-weight:700">住所</td><td style="padding:6px">' + esc(r.customer_address) + '</td></tr>' +
                    '<tr><td style="padding:6px;font-weight:700">車両</td><td colspan="3" style="padding:6px">' + esc(r.vehicle_name) + '</td></tr>' +
                    '<tr><td style="padding:6px;font-weight:700">貸出日時</td><td style="padding:6px">' + esc(r.pickup_at) + '</td><td style="padding:6px;font-weight:700">返却日時</td><td style="padding:6px">' + esc(r.return_at) + '</td></tr>' +
                    '<tr><td style="padding:6px;font-weight:700">合計金額</td><td style="padding:6px">' + formatPrice(r.total_amount) + '</td><td style="padding:6px;font-weight:700">ステータス</td><td style="padding:6px">' + badge(r.status) + '</td></tr>' +
                    '<tr><td style="padding:6px;font-weight:700">備考</td><td colspan="3" style="padding:6px">' + esc(r.note || '-') + '</td></tr>' +
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

    /* ── Options ───────────────────────────────────────── */
    function loadOptions() {
        var html = '<div class="rca-toolbar"><button class="rca-btn rca-btn-primary" id="rca-add-option">+ オプション追加</button></div><div id="rca-options-table"></div>';
        $app.html(html);
        function refresh() {
            api('GET', '/admin/options').done(function (items) {
                var t = '<div class="rca-table-wrap"><table class="rca-table"><thead><tr><th>ID</th><th>名前</th><th>金額</th><th>単位</th><th>状態</th><th>操作</th></tr></thead><tbody>';
                items.forEach(function (o) {
                    t += '<tr><td>' + o.id + '</td><td>' + esc(o.name) + '</td><td>' + formatPrice(o.amount) + '</td><td>' + esc(o.unit === 'per_day' ? '日額' : '予約毎') + '</td><td>' + badge(o.status === 'published' ? 'confirmed' : 'cancelled') + '</td>' +
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

    /* ── Settings (no payment/Square sections) ────────── */
    function loadSettings() {
        api('GET', '/admin/settings').done(function (s) {
            var html = '<form id="rca-settings-form">' +
                '<h3 class="rca-section-title">店舗情報</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">店舗名</label><input class="rca-input" name="store_name" value="' + esc(s.store_name) + '"></div>' +
                '<div class="rca-form-group"><label class="rca-label">電話番号</label><input class="rca-input" name="store_tel" value="' + esc(s.store_tel) + '"></div></div>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">メールアドレス</label><input class="rca-input" name="store_email" value="' + esc(s.store_email) + '"></div>' +
                '<div class="rca-form-group"><label class="rca-label">住所</label><input class="rca-input" name="store_address" value="' + esc(s.store_address) + '"></div></div>' +
                '<div class="rca-form-group"><label class="rca-label">営業時間</label><div class="rca-form-row"><input class="rca-input" name="business_hours_start" value="' + esc(s.business_hours_start) + '" style="width:120px"> <span style="line-height:36px">～</span> <input class="rca-input" name="business_hours_end" value="' + esc(s.business_hours_end) + '" style="width:120px"></div></div>' +
                '<h3 class="rca-section-title">reCAPTCHA v3</h3>' +
                '<div class="rca-form-row"><div class="rca-form-group"><label class="rca-label">サイトキー</label><input class="rca-input" name="recaptcha_site_key" value="' + esc(s.recaptcha_site_key) + '"></div>' +
                '<div class="rca-form-group"><label class="rca-label">シークレットキー</label><input class="rca-input" name="recaptcha_secret_key" value="' + esc(s.recaptcha_secret_key) + '"></div></div>' +
                '<div class="rca-form-group"><label class="rca-label">スコア閾値</label><input class="rca-input" name="recaptcha_score" value="' + esc(s.recaptcha_score) + '" style="width:100px"></div>' +
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
