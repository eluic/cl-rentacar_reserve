import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/api/*', cors())

/* ═══════════════════════════════════════════════════════
   Mock Data — CL Rentacar (Okinawa)
   ═══════════════════════════════════════════════════════ */
const vehicles = [
  {
    id: 1,
    name: 'ダイハツ ミラ (軽)',
    seats: 4,
    transmission: 'AT',
    base_price: 3300,
    thumbnail: 'https://sspark.genspark.ai/cfimages?u1=9TSBkW3jwdGSPkm%2BdQJXNdcF342NOnADxt90qGNLXRlQgmuj347zP%2FxViTQ%2Fs4YBCdmauxtBMRNg2mf21TavlqKALgVoeHYxVlZvvJ%2B%2BCihESfpxEvoZMuy0E02dcQxcSyKK8A%3D%3D&u2=BwsiXPqr1xezizl9&width=2560',
    status: 'active'
  },
  {
    id: 2,
    name: 'トヨタ ヴィッツ (コンパクト)',
    seats: 5,
    transmission: 'AT',
    base_price: 4400,
    thumbnail: 'https://sspark.genspark.ai/cfimages?u1=GEPuNfBVEoayy25VD6kBc1OCv%2FWI4xL7ttB1DjXOyZpdLtg2B7FURLvRGbv5Ku2uompO8XdrVMSWvaG35x2p%2BsmllzRcHls6x1CW&u2=odg7uEKej%2Bbti5iJ&width=2560',
    status: 'active'
  },
  {
    id: 3,
    name: 'トヨタ アクア (ハイブリッド)',
    seats: 5,
    transmission: 'AT',
    base_price: 5500,
    thumbnail: 'https://sspark.genspark.ai/cfimages?u1=NakWq5yXuiSSqeTPVW77CWQG2dfrwM5YLH7XhlpHPjq72SPTqIA9VPFnFsyUDhpC7KUjbCxHulD%2Bww%3D%3D&u2=OJorK5DvNmrnxT0%2B&width=2560',
    status: 'active'
  },
  {
    id: 4,
    name: 'トヨタ ノア (ワゴン)',
    seats: 7,
    transmission: 'AT',
    base_price: 8800,
    thumbnail: 'https://sspark.genspark.ai/cfimages?u1=R1m%2F4cvK0AeAKY7idIRlqOqy8px%2Bf9hnXJonLhkohZN7y6AWzIowpu%2BTHYTtCvaK1dgfiGWAi0EqDmDxkyaP3Ca69NDfo49keUHhDPS75w%3D%3D&u2=pGXxbG6doK6omOvn&width=2560',
    status: 'active'
  },
  {
    id: 5,
    name: 'ニッサン セレナ (ミニバン)',
    seats: 8,
    transmission: 'AT',
    base_price: 9900,
    thumbnail: 'https://sspark.genspark.ai/cfimages?u1=HHF0ncl2%2Bb2orstwJx1DbIM8chQL9No8h6NGw1ckWi1nWip%2F1cM1cJ5cwbwwWoWF08FXCA9XwX8l4f8izEvYGXyWGvZW7VouVMJXZA%3D%3D&u2=heeRif%2ByT9y70CM8&width=2560',
    status: 'active'
  },
  {
    id: 6,
    name: 'スズキ ジムニー (SUV)',
    seats: 4,
    transmission: 'AT',
    base_price: 6600,
    thumbnail: 'https://sspark.genspark.ai/cfimages?u1=KpCF0fsNAYkYehii4w%2B2smdjU6%2B4OLlbyx2ZZyD7prNRHqJJCoZBNcxFWIvY31ufBxjgQpPzb7lXQMOVocn3TLDSZsAmnSp3mcHwU82z9P8qwtn8GYZ1KGmcZXNorFzPmrapjU5NOd6%2BuwTGG%2FyoXPI%3D&u2=Hz7u69sjnUarkZYc&width=2560',
    status: 'active'
  }
]

const options = [
  { id: 1, name: 'チャイルドシート', description: '0〜4歳向けチャイルドシート', amount: 550, unit: 'per_day', status: 'active' },
  { id: 2, name: 'ジュニアシート', description: '4〜10歳向けジュニアシート', amount: 330, unit: 'per_day', status: 'active' },
  { id: 3, name: 'カーナビ (多言語)', description: '日本語・英語・中国語・韓国語対応', amount: 1100, unit: 'per_reservation', status: 'active' },
  { id: 4, name: 'ETC車載器', description: '高速道路料金所スムーズ通過', amount: 330, unit: 'per_reservation', status: 'active' },
  { id: 5, name: '免責補償制度(CDW)', description: '事故時の自己負担額を免除', amount: 1100, unit: 'per_day', status: 'active' },
  { id: 6, name: '安心パック (NOC補償)', description: '休業補償・ロードサービス込み', amount: 550, unit: 'per_day', status: 'active' },
  { id: 7, name: 'Wi-Fiルーター', description: 'モバイルWi-Fi（データ無制限）', amount: 880, unit: 'per_day', status: 'active' }
]

// Generate availability for the next 3 months
function generateAvailability(vehicleId: number, month: string) {
  const days: Record<string, { status: string; remaining: number }> = {}
  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, mon - 1, d)
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    if (date < today) {
      days[dateStr] = { status: 'full', remaining: 0 }
      continue
    }

    // Sundays: holidays (closed)
    if (date.getDay() === 0) {
      days[dateStr] = { status: 'holiday', remaining: 0 }
      continue
    }

    // Pseudo-random availability based on date + vehicleId
    const seed = (d * 7 + vehicleId * 13 + mon * 3) % 10
    if (seed < 5) {
      days[dateStr] = { status: 'available', remaining: 3 }
    } else if (seed < 8) {
      days[dateStr] = { status: 'few', remaining: 1 }
    } else {
      days[dateStr] = { status: 'full', remaining: 0 }
    }
  }
  return days
}

/* ═══════════════════════════════════════════════════════
   REST API Endpoints — rentacar/v1
   ═══════════════════════════════════════════════════════ */

// GET /api/rentacar/v1/vehicles
app.get('/api/rentacar/v1/vehicles', (c) => {
  return c.json(vehicles.filter(v => v.status === 'active'))
})

// GET /api/rentacar/v1/options
app.get('/api/rentacar/v1/options', (c) => {
  return c.json(options.filter(o => o.status === 'active'))
})

// GET /api/rentacar/v1/availability?vehicle_id=1&month=2026-09
app.get('/api/rentacar/v1/availability', (c) => {
  const vehicleId = parseInt(c.req.query('vehicle_id') || '1')
  const month = c.req.query('month') || new Date().toISOString().substring(0, 7)
  const days = generateAvailability(vehicleId, month)
  return c.json({ vehicle_id: vehicleId, month, days })
})

// POST /api/rentacar/v1/reservations/calculate
app.post('/api/rentacar/v1/reservations/calculate', async (c) => {
  const body = await c.req.json()
  const vehicle = vehicles.find(v => v.id === body.vehicle_id)
  if (!vehicle) return c.json({ error: '車両が見つかりません' }, 404)

  const pickup = new Date(body.pickup_at)
  const returnAt = new Date(body.return_at)
  const diffMs = returnAt.getTime() - pickup.getTime()
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  const vehiclePrice = vehicle.base_price * days
  let optionsTotal = 0
  const calcOptions: { id: number; name: string; quantity: number; amount: number }[] = []

  if (body.options && Array.isArray(body.options)) {
    body.options.forEach((opt: { id: number; quantity: number }) => {
      const optDef = options.find(o => o.id === opt.id)
      if (optDef) {
        const qty = opt.quantity || 1
        const amount = optDef.unit === 'per_day' ? optDef.amount * days * qty : optDef.amount * qty
        optionsTotal += amount
        calcOptions.push({ id: optDef.id, name: optDef.name, quantity: qty, amount })
      }
    })
  }

  return c.json({
    vehicle_price: vehiclePrice,
    options: calcOptions,
    options_total: optionsTotal,
    total_amount: vehiclePrice + optionsTotal,
    days
  })
})

// POST /api/rentacar/v1/reservations  (mock — always succeeds)
app.post('/api/rentacar/v1/reservations', async (c) => {
  const body = await c.req.json()
  const code = 'RC-' + Math.random().toString(36).substring(2, 10).toUpperCase()

  // Recalculate for response
  const vehicle = vehicles.find(v => v.id === body.vehicle_id)
  const pickup = new Date(body.pickup_at)
  const returnAt = new Date(body.return_at)
  const diffMs = returnAt.getTime() - pickup.getTime()
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const vehiclePrice = vehicle ? vehicle.base_price * days : 0
  let optionsTotal = 0
  if (body.options && Array.isArray(body.options)) {
    body.options.forEach((opt: { id: number; quantity: number }) => {
      const optDef = options.find(o => o.id === opt.id)
      if (optDef) {
        const qty = opt.quantity || 1
        optionsTotal += optDef.unit === 'per_day' ? optDef.amount * days * qty : optDef.amount * qty
      }
    })
  }

  return c.json({
    success: true,
    reservation_code: code,
    total_amount: vehiclePrice + optionsTotal,
    status: 'confirmed',
    message: '予約が確定しました'
  })
})

// POST /api/rentacar/v1/cancel/lookup (mock)
app.post('/api/rentacar/v1/cancel/lookup', async (c) => {
  const body = await c.req.json()
  const code = body.code || ''
  if (!code.startsWith('RC-')) {
    return c.json({ message: '予約番号が見つかりません' }, 404)
  }
  return c.json({
    reservation_code: code,
    vehicle_name: 'トヨタ ヴィッツ (コンパクト)',
    pickup_at: '2026-09-15 09:00',
    return_at: '2026-09-17 17:00',
    total_amount: 13200,
    customer_name: '山田 太郎',
    masked_email: 'ya****@example.com',
    status: 'confirmed'
  })
})

// POST /api/rentacar/v1/cancel (mock)
app.post('/api/rentacar/v1/cancel', async (c) => {
  return c.json({
    success: true,
    message: 'キャンセルが完了しました'
  })
})

// GET /api/rentacar/v1/payment-config
app.get('/api/rentacar/v1/payment-config', (c) => {
  return c.json({
    onsite_enabled: true,
    square_enabled: false
  })
})

/* ═══════════════════════════════════════════════════════
   HTML Pages
   ═══════════════════════════════════════════════════════ */

const HEAD = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<link rel="stylesheet" href="/static/booking.css">
<link rel="stylesheet" href="/static/cancel.css">
`

const NAV = `
<header style="background:linear-gradient(135deg,#00bcd4,#0097a7);color:#fff;padding:0;">
  <div style="max-width:960px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:28px;">🚗</span>
      <div>
        <div style="font-size:20px;font-weight:700;letter-spacing:1px;">CL Rentacar</div>
        <div style="font-size:11px;opacity:0.85;">沖縄のレンタカー</div>
      </div>
    </div>
    <nav style="display:flex;gap:6px;flex-wrap:wrap;">
      <a href="/" style="color:#fff;text-decoration:none;padding:8px 16px;border-radius:50px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.15);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">🏠 トップ</a>
      <a href="/booking" style="color:#fff;text-decoration:none;padding:8px 16px;border-radius:50px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.15);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">📅 予約フォーム</a>
      <a href="/cancel" style="color:#fff;text-decoration:none;padding:8px 16px;border-radius:50px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.15);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">❌ キャンセル</a>
    </nav>
  </div>
</header>
`

const FOOTER = `
<footer style="background:#263238;color:#90a4ae;text-align:center;padding:24px 20px;font-size:12px;margin-top:40px;">
  <div>© 2026 CL Rentacar Okinawa — プレビューデモ（モックデータ）</div>
  <div style="margin-top:4px;">このプレビューはWordPressプラグインの動作確認用です</div>
</footer>
`

// ── Top Page ──
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
  ${HEAD}
  <title>CL Rentacar — 沖縄レンタカー予約</title>
  <style>
    body { margin: 0; font-family: "Noto Sans JP","Hiragino Sans",sans-serif; color: #333; background: #f5f9fa; }
    .hero { background: linear-gradient(135deg, #00838f 0%, #00bcd4 50%, #26c6da 100%); color: #fff; padding: 60px 20px; text-align: center; }
    .hero h1 { font-size: 36px; margin-bottom: 12px; }
    .hero p { font-size: 16px; opacity: 0.9; margin-bottom: 32px; }
    .hero-btn { display: inline-block; background: #fff; color: #00bcd4; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 700; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
    .hero-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.2); }
    .features { max-width: 960px; margin: -40px auto 0; padding: 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; position: relative; z-index: 1; }
    .feat-card { background: #fff; border-radius: 12px; padding: 28px 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; transition: transform 0.2s; }
    .feat-card:hover { transform: translateY(-4px); }
    .feat-icon { font-size: 40px; margin-bottom: 12px; }
    .feat-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
    .feat-desc { font-size: 13px; color: #666; line-height: 1.6; }
    .demo-note { max-width: 700px; margin: 40px auto; padding: 20px; background: #fff3e0; border: 1px solid #ffe082; border-radius: 8px; text-align: center; font-size: 13px; color: #e65100; }
    .vehicles-section { max-width: 960px; margin: 40px auto; padding: 0 20px; }
    .vehicles-section h2 { font-size: 24px; font-weight: 700; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #00bcd4; }
    .vgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .vcard { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); transition: transform 0.2s; }
    .vcard:hover { transform: translateY(-3px); }
    .vcard img { width: 100%; height: 180px; object-fit: cover; }
    .vcard-info { padding: 16px; }
    .vcard-name { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .vcard-meta { font-size: 13px; color: #666; margin-bottom: 8px; }
    .vcard-price { font-size: 22px; font-weight: 700; color: #00bcd4; }
    .vcard-unit { font-size: 12px; color: #999; }
  </style>
</head>
<body>
  ${NAV}
  <section class="hero">
    <h1>🌴 CL Rentacar Okinawa</h1>
    <p>沖縄を自由にドライブ！格安レンタカーで最高の旅を</p>
    <a href="/booking" class="hero-btn">🚗 今すぐ予約する</a>
  </section>

  <div class="features">
    <div class="feat-card">
      <div class="feat-icon">💰</div>
      <div class="feat-title">格安料金</div>
      <div class="feat-desc">軽自動車 ¥3,300〜 / 日<br>沖縄最安値クラスの料金設定</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">🏝️</div>
      <div class="feat-title">空港近くの好立地</div>
      <div class="feat-desc">那覇空港から送迎10分<br>スムーズにドライブ開始</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">🛡️</div>
      <div class="feat-title">安心補償プラン</div>
      <div class="feat-desc">免責補償・NOC補償<br>オプション充実で安心ドライブ</div>
    </div>
  </div>

  <div class="demo-note">
    ⚠️ <strong>プレビューモード</strong>：これはWordPressプラグイン「rentacar-booking」のデモプレビューです。<br>
    実際のデータではなく、モックデータで動作しています。予約は実行されません。
  </div>

  <section class="vehicles-section">
    <h2>🚙 取り扱い車両</h2>
    <div class="vgrid">
      ${vehicles.map(v => `
      <div class="vcard">
        <img src="${v.thumbnail}" alt="${v.name}" loading="lazy">
        <div class="vcard-info">
          <div class="vcard-name">${v.name}</div>
          <div class="vcard-meta">👤 ${v.seats}人乗り ⚙️ ${v.transmission}</div>
          <div class="vcard-price">¥${v.base_price.toLocaleString()}<span class="vcard-unit"> / 日</span></div>
        </div>
      </div>
      `).join('')}
    </div>
  </section>

  ${FOOTER}
</body>
</html>`)
})

// ── Booking Form ──
app.get('/booking', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
  ${HEAD}
  <title>レンタカー予約 — CL Rentacar</title>
  <style>body { margin: 0; background: #f5f9fa; font-family: "Noto Sans JP","Hiragino Sans",sans-serif; }</style>
</head>
<body>
  ${NAV}
  <main style="padding: 20px 0 40px;">
    <!-- Booking form HTML (from booking-form.php) -->
    <div id="rc-booking-app" class="rc-booking">
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
      <div class="rc-step" data-step="1">
        <h2 class="rc-step-title">車両を選択してください</h2>
        <div id="rc-vehicle-list" class="rc-vehicle-grid"><div class="rc-loading"><span class="rc-spinner"></span>車両情報を読み込み中...</div></div>
      </div>
      <div class="rc-step" data-step="2" style="display:none">
        <h2 class="rc-step-title">貸出・返却日時を選択</h2>
        <div class="rc-selected-vehicle-summary" id="rc-selected-vehicle-summary"></div>
        <div class="rc-datetime-section">
          <div class="rc-datetime-row">
            <div class="rc-datetime-group"><label class="rc-label">貸出日</label><input type="text" id="rc-pickup-date" class="rc-input" placeholder="日付を選択" readonly></div>
            <div class="rc-datetime-group"><label class="rc-label">貸出時間</label><select id="rc-pickup-time" class="rc-select"></select></div>
          </div>
          <div class="rc-datetime-row">
            <div class="rc-datetime-group"><label class="rc-label">返却日</label><input type="text" id="rc-return-date" class="rc-input" placeholder="日付を選択" readonly></div>
            <div class="rc-datetime-group"><label class="rc-label">返却時間</label><select id="rc-return-time" class="rc-select"></select></div>
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
      <div class="rc-step" data-step="3" style="display:none">
        <h2 class="rc-step-title">追加オプションを選択</h2>
        <div id="rc-options-list" class="rc-options-list"><div class="rc-loading"><span class="rc-spinner"></span>オプション情報を読み込み中...</div></div>
        <div class="rc-step-nav">
          <button type="button" class="rc-btn rc-btn-secondary rc-prev-btn">戻る</button>
          <button type="button" class="rc-btn rc-btn-primary rc-next-btn">次へ</button>
        </div>
      </div>
      <div class="rc-step" data-step="4" style="display:none">
        <h2 class="rc-step-title">お客様情報を入力</h2>
        <form id="rc-customer-form" class="rc-form" novalidate>
          <div class="rc-form-row">
            <div class="rc-form-group"><label class="rc-label rc-required">お名前</label><input type="text" name="customer_name" class="rc-input" placeholder="例: 山田 太郎" required><span class="rc-error-msg"></span></div>
            <div class="rc-form-group"><label class="rc-label rc-required">フリガナ</label><input type="text" name="customer_kana" class="rc-input" placeholder="例: ヤマダ タロウ" required><span class="rc-error-msg"></span></div>
          </div>
          <div class="rc-form-row">
            <div class="rc-form-group"><label class="rc-label rc-required">メールアドレス</label><input type="email" name="customer_email" class="rc-input" placeholder="例: taro@example.com" required><span class="rc-error-msg"></span></div>
            <div class="rc-form-group"><label class="rc-label rc-required">電話番号</label><input type="tel" name="customer_tel" class="rc-input" placeholder="例: 090-1234-5678" required><span class="rc-error-msg"></span></div>
          </div>
          <div class="rc-form-row">
            <div class="rc-form-group rc-form-group-sm"><label class="rc-label rc-required">郵便番号</label><input type="text" name="customer_zip" class="rc-input" placeholder="例: 900-0001" required><span class="rc-error-msg"></span></div>
            <div class="rc-form-group rc-form-group-lg"><label class="rc-label rc-required">住所</label><input type="text" name="customer_address" class="rc-input" placeholder="例: 沖縄県那覇市..." required><span class="rc-error-msg"></span></div>
          </div>
          <div class="rc-form-row">
            <div class="rc-form-group"><label class="rc-label rc-required">免許証番号</label><input type="text" name="license_no" class="rc-input" placeholder="免許証番号を入力" required><span class="rc-error-msg"></span></div>
          </div>
          <div class="rc-form-row">
            <div class="rc-form-group rc-form-group-full"><label class="rc-label">備考</label><textarea name="note" class="rc-textarea" rows="3" placeholder="ご要望がございましたらご記入ください"></textarea></div>
          </div>
        </form>
        <div class="rc-step-nav">
          <button type="button" class="rc-btn rc-btn-secondary rc-prev-btn">戻る</button>
          <button type="button" class="rc-btn rc-btn-primary rc-next-btn" id="rc-step4-next">次へ</button>
        </div>
      </div>
      <div class="rc-step" data-step="5" style="display:none">
        <h2 class="rc-step-title">ご予約内容の確認</h2>
        <div id="rc-confirm-summary" class="rc-confirm-summary"></div>
        <div class="rc-payment-section" id="rc-payment-section">
          <h3>お支払い方法</h3>
          <div id="rc-payment-methods" class="rc-payment-methods"></div>
        </div>
        <div class="rc-terms">
          <label class="rc-checkbox-label"><input type="checkbox" id="rc-agree-terms"><span>利用規約に同意する</span></label>
        </div>
        <div class="rc-step-nav">
          <button type="button" class="rc-btn rc-btn-secondary rc-prev-btn">戻る</button>
          <button type="button" class="rc-btn rc-btn-primary rc-confirm-btn" id="rc-submit-btn" disabled>予約を確定する</button>
        </div>
      </div>
      <div class="rc-step" data-step="6" style="display:none">
        <div class="rc-complete">
          <div class="rc-complete-icon">&#10003;</div>
          <h2 class="rc-step-title" style="border:none;">ご予約ありがとうございます</h2>
          <div class="rc-complete-code"><span class="rc-complete-label">予約番号</span><span class="rc-complete-value" id="rc-reservation-code"></span></div>
          <p class="rc-complete-message">ご登録のメールアドレスに確認メールをお送りしました。<br>メールが届かない場合は、迷惑メールフォルダもご確認ください。</p>
          <div id="rc-complete-details" class="rc-complete-details"></div>
          <div style="margin-top:24px;"><a href="/booking" class="rc-btn rc-btn-primary" style="text-decoration:none;">新しい予約をする</a></div>
        </div>
      </div>
    </div>
  </main>
  ${FOOTER}

  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ja.js"></script>
  <script>
    // Provide rcBookingData (replaces wp_localize_script)
    var rcBookingData = {
      restUrl: '/api/rentacar/v1',
      nonce: 'preview-nonce',
      recaptchaSiteKey: '',
      paymentOnsite: '1',
      paymentSquare: '0',
      i18n: {
        seats: '人乗り',
        perDay: ' / 日',
        perReservation: ' / 予約',
        days: '日間',
        totalAmount: '合計金額',
        onsite: '現地払い',
        onsiteDesc: '店舗にて現金またはカードでお支払い',
        squarePay: 'クレジットカード',
        processing: '処理中...',
        errorOccurred: 'エラーが発生しました',
        invalidEmail: '有効なメールアドレスを入力してください'
      }
    };
  </script>
  <script src="/static/booking.js"></script>
</body>
</html>`)
})

// ── Cancel Form ──
app.get('/cancel', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
  ${HEAD}
  <title>予約キャンセル — CL Rentacar</title>
  <style>body { margin: 0; background: #f5f9fa; font-family: "Noto Sans JP","Hiragino Sans",sans-serif; }</style>
</head>
<body>
  ${NAV}
  <main style="padding: 20px 0 40px;">
    <div id="rc-cancel-app" class="rc-cancel">
      <div class="rc-cancel-step" data-step="1">
        <h2 class="rc-step-title">予約キャンセル</h2>
        <p class="rc-cancel-desc">キャンセルする予約の予約番号を入力してください。<br><small style="color:#999;">（デモ: "RC-" で始まる任意の文字列を入力してください）</small></p>
        <div class="rc-form-group"><label class="rc-label">予約番号</label><input type="text" id="rc-cancel-code" class="rc-input" placeholder="RC-XXXXXXXX" maxlength="11"><span class="rc-error-msg" id="rc-cancel-code-error"></span></div>
        <button type="button" class="rc-btn rc-btn-primary" id="rc-cancel-lookup-btn">予約を検索</button>
      </div>
      <div class="rc-cancel-step" data-step="2" style="display:none">
        <h2 class="rc-step-title">予約内容の確認</h2>
        <div id="rc-cancel-details" class="rc-cancel-details"></div>
        <div class="rc-form-group"><label class="rc-label">ご本人確認のため、ご登録のメールアドレスを入力してください</label><input type="email" id="rc-cancel-email" class="rc-input" placeholder="ご登録のメールアドレス"><span class="rc-error-msg" id="rc-cancel-email-error"></span></div>
        <div class="rc-cancel-policy">
          <h4>キャンセルポリシー</h4>
          <p>ご予約のキャンセルは無料です。キャンセル後の取り消しはできません。</p>
          <label class="rc-checkbox-label"><input type="checkbox" id="rc-cancel-agree"><span>キャンセルポリシーに同意する</span></label>
        </div>
        <div class="rc-step-nav">
          <button type="button" class="rc-btn rc-btn-secondary" id="rc-cancel-back-btn">戻る</button>
          <button type="button" class="rc-btn rc-btn-danger" id="rc-cancel-submit-btn" disabled>キャンセルする</button>
        </div>
      </div>
      <div class="rc-cancel-step" data-step="3" style="display:none">
        <div class="rc-complete">
          <div class="rc-complete-icon rc-cancel-icon">&#10003;</div>
          <h2 class="rc-step-title" style="border:none;">キャンセルが完了しました</h2>
          <p class="rc-complete-message">ご予約のキャンセル処理が完了しました。<br>確認メールをお送りしましたのでご確認ください。</p>
          <div style="margin-top:24px;"><a href="/" class="rc-btn rc-btn-primary" style="text-decoration:none;">トップに戻る</a></div>
        </div>
      </div>
    </div>
  </main>
  ${FOOTER}

  <script>
    var rcCancelData = {
      restUrl: '/api/rentacar/v1',
      nonce: 'preview-nonce',
      i18n: {
        processing: '処理中...',
        errorOccurred: 'エラーが発生しました',
        lookup: '予約を検索',
        cancel: 'キャンセルする',
        confirmCancel: '本当にキャンセルしますか？この操作は取り消せません。'
      }
    };
  </script>
  <script src="/static/cancel.js"></script>
</body>
</html>`)
})

export default app
