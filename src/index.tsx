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

// Count how many reservations overlap a given date for a given vehicle
function countBookedOnDate(vehicleId: number, dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  let count = 0
  for (const r of mockReservations) {
    if (r.vehicle_id !== vehicleId) continue
    if (r.status === 'cancelled') continue
    const pickup = new Date(r.pickup_at)
    const ret = new Date(r.return_at)
    pickup.setHours(0, 0, 0, 0)
    ret.setHours(23, 59, 59, 999)
    if (d >= pickup && d <= ret) count++
  }
  return count
}

// Generate availability for a month, reflecting actual reservations & blocks
function generateAvailability(vehicleId: number, month: string) {
  const vehicle = vehicles.find(v => v.id === vehicleId)
  const stock = vehicle ? 2 : 0 // each vehicle has 2 units in demo
  const days: Record<string, { status: string; remaining: number }> = {}
  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check vehicle blocks
  const blocks = mockVehicleBlocks.filter((b: any) => b.vehicle_id === vehicleId)

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

    // Check maintenance blocks
    const isBlocked = blocks.some((b: any) => dateStr >= b.date_from && dateStr <= b.date_to)
    if (isBlocked) {
      days[dateStr] = { status: 'blocked', remaining: 0 }
      continue
    }

    // Count existing reservations for this vehicle on this date
    const booked = countBookedOnDate(vehicleId, dateStr)
    const remaining = Math.max(0, stock - booked)

    if (remaining <= 0) {
      days[dateStr] = { status: 'full', remaining: 0 }
    } else if (remaining <= 1) {
      days[dateStr] = { status: 'few', remaining }
    } else {
      days[dateStr] = { status: 'available', remaining }
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
        <div id="rc-availability-calendar" class="rc-avail-calendar"></div>
        <div class="rc-datetime-section">
          <div class="rc-datetime-row">
            <div class="rc-datetime-group"><label class="rc-label">貸出日</label><input type="text" id="rc-pickup-date" class="rc-input" placeholder="カレンダーから選択" readonly></div>
            <div class="rc-datetime-group"><label class="rc-label">貸出時間</label><select id="rc-pickup-time" class="rc-select"></select></div>
          </div>
          <div class="rc-datetime-row">
            <div class="rc-datetime-group"><label class="rc-label">返却日</label><input type="text" id="rc-return-date" class="rc-input" placeholder="カレンダーから選択" readonly></div>
            <div class="rc-datetime-group"><label class="rc-label">返却時間</label><select id="rc-return-time" class="rc-select"></select></div>
          </div>
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
            <div class="rc-form-group">
              <label class="rc-label rc-required">ご利用人数</label>
              <div class="rc-passenger-row">
                <label class="rc-passenger-label">大人</label>
                <select name="adults" class="rc-select rc-select-num"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select>
                <label class="rc-passenger-label">子供</label>
                <select name="children" class="rc-select rc-select-num"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select>
              </div>
            </div>
          </div>
          <div class="rc-form-row">
            <div class="rc-form-group rc-form-group-full"><label class="rc-label">備考</label><textarea name="note" class="rc-textarea" rows="3" placeholder="ご要望がございましたらご記入ください"></textarea></div>
          </div>
          <div class="rc-transport-section">
            <h3 class="rc-transport-title">利用交通機関 <span style="color:#e53935;font-size:13px;font-weight:400">※必須</span></h3>
            <div class="rc-transport-type">
              <label class="rc-radio-label"><input type="radio" name="transport_type" value="pickup" checked><span>送迎希望</span></label>
              <label class="rc-radio-label"><input type="radio" name="transport_type" value="direct"><span>直接来店</span></label>
            </div>
            <div class="rc-pickup-location" id="rc-pickup-location">
              <label class="rc-label" style="margin-bottom:8px">送迎場所</label>
              <div class="rc-transport-type">
                <label class="rc-radio-label"><input type="radio" name="pickup_location" value="naha_airport" checked><span>那覇空港</span></label>
                <label class="rc-radio-label"><input type="radio" name="pickup_location" value="akamine_station"><span>赤嶺駅</span></label>
              </div>
            </div>
            <span class="rc-error-msg" id="rc-transport-error"></span>
            <div id="rc-transport-fields">
              <div class="rc-flight-card">
                <div class="rc-flight-card-header">✈ 到着便</div>
                <div class="rc-flight-card-body">
                  <div class="rc-form-row">
                    <div class="rc-form-group"><label class="rc-label">航空会社</label><input type="text" name="arrival_airline" class="rc-input" placeholder="例: ANA"></div>
                    <div class="rc-form-group"><label class="rc-label">便名</label><input type="text" name="arrival_flight" class="rc-input" placeholder="例: NH123"></div>
                  </div>
                  <div class="rc-form-row">
                    <div class="rc-form-group"><label class="rc-label">予定日</label><input type="date" name="arrival_date" class="rc-input"></div>
                    <div class="rc-form-group"><label class="rc-label">予定時刻</label>
                      <div class="rc-time-inline">
                        <select name="arrival_hour" class="rc-select"><option value="">--</option></select>
                        <span class="rc-time-colon">:</span>
                        <select name="arrival_min" class="rc-select"><option value="">--</option></select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="rc-flight-card">
                <div class="rc-flight-card-header">✈ 出発便</div>
                <div class="rc-flight-card-body">
                  <div class="rc-form-row">
                    <div class="rc-form-group"><label class="rc-label">航空会社</label><input type="text" name="departure_airline" class="rc-input" placeholder="例: JAL"></div>
                    <div class="rc-form-group"><label class="rc-label">便名</label><input type="text" name="departure_flight" class="rc-input" placeholder="例: JL456"></div>
                  </div>
                  <div class="rc-form-row">
                    <div class="rc-form-group"><label class="rc-label">予定日</label><input type="date" name="departure_date" class="rc-input"></div>
                    <div class="rc-form-group"><label class="rc-label">予定時刻</label>
                      <div class="rc-time-inline">
                        <select name="departure_hour" class="rc-select"><option value="">--</option></select>
                        <span class="rc-time-colon">:</span>
                        <select name="departure_min" class="rc-select"><option value="">--</option></select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
          <div class="rc-terms-links">
            <a href="#" target="_blank" class="rc-terms-link">利用規約</a>
            <span class="rc-terms-sep">|</span>
            <a href="#" target="_blank" class="rc-terms-link">キャンセルポリシー</a>
          </div>
          <label class="rc-checkbox-label"><input type="checkbox" id="rc-agree-terms"><span>利用規約・キャンセルポリシーに同意する</span></label>
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

/* ═══════════════════════════════════════════════════════
   Admin Mock API Endpoints
   ═══════════════════════════════════════════════════════ */

// Mock reservations data (no payment_status)
const mockReservations = [
  { id: 1, reservation_code: 'RC-ABC12345', customer_name: '山田 太郎', customer_kana: 'ヤマダ タロウ', customer_email: 'yamada@example.com', customer_tel: '090-1234-5678', customer_zip: '900-0001', customer_address: '沖縄県那覇市首里1-1-1', vehicle_id: 2, vehicle_name: 'トヨタ ヴィッツ (コンパクト)', pickup_at: '2026-08-25 09:00', return_at: '2026-08-27 17:00', total_amount: 13200, status: 'confirmed', note: '' },
  { id: 2, reservation_code: 'RC-DEF67890', customer_name: '佐藤 花子', customer_kana: 'サトウ ハナコ', customer_email: 'sato@example.com', customer_tel: '080-9876-5432', customer_zip: '901-0155', customer_address: '沖縄県那覇市金城3-2-1', vehicle_id: 4, vehicle_name: 'トヨタ ノア (ワゴン)', pickup_at: '2026-08-20 10:00', return_at: '2026-08-23 18:00', total_amount: 30800, status: 'confirmed', note: 'チャイルドシート1台' },
  { id: 3, reservation_code: 'RC-GHI11223', customer_name: '田中 一郎', customer_kana: 'タナカ イチロウ', customer_email: 'tanaka@example.com', customer_tel: '070-5555-1234', customer_zip: '904-0004', customer_address: '沖縄県沖縄市中央2-10-5', vehicle_id: 1, vehicle_name: 'ダイハツ ミラ (軽)', pickup_at: '2026-08-22 08:00', return_at: '2026-08-22 20:00', total_amount: 3300, status: 'pending', note: '' },
  { id: 4, reservation_code: 'RC-JKL44556', customer_name: '鈴木 美咲', customer_kana: 'スズキ ミサキ', customer_email: 'suzuki@example.com', customer_tel: '090-3333-4444', customer_zip: '905-0012', customer_address: '沖縄県名護市名護4567', vehicle_id: 3, vehicle_name: 'トヨタ アクア (ハイブリッド)', pickup_at: '2026-09-01 09:00', return_at: '2026-09-05 17:00', total_amount: 26400, status: 'confirmed', note: 'WiFiルーター希望' },
  { id: 5, reservation_code: 'RC-MNO77889', customer_name: '高橋 健太', customer_kana: 'タカハシ ケンタ', customer_email: 'takahashi@example.com', customer_tel: '080-1111-2222', customer_zip: '900-0015', customer_address: '沖縄県那覇市久茂地1-2-3', vehicle_id: 6, vehicle_name: 'スズキ ジムニー (SUV)', pickup_at: '2026-08-18 10:00', return_at: '2026-08-20 17:00', total_amount: 15400, status: 'completed', note: '' },
  { id: 6, reservation_code: 'RC-PQR99001', customer_name: '伊藤 さくら', customer_kana: 'イトウ サクラ', customer_email: 'ito@example.com', customer_tel: '070-7777-8888', customer_zip: '901-2224', customer_address: '沖縄県宜野湾市真志喜2-8-1', vehicle_id: 5, vehicle_name: 'ニッサン セレナ (ミニバン)', pickup_at: '2026-08-15 09:00', return_at: '2026-08-16 18:00', total_amount: 11000, status: 'cancelled', note: '台風のためキャンセル' },
  { id: 7, reservation_code: 'RC-STU22334', customer_name: '渡辺 翔太', customer_kana: 'ワタナベ ショウタ', customer_email: 'watanabe@example.com', customer_tel: '090-6666-7777', customer_zip: '903-0804', customer_address: '沖縄県那覇市首里石嶺町4-1-1', vehicle_id: 2, vehicle_name: 'トヨタ ヴィッツ (コンパクト)', pickup_at: '2026-09-10 10:00', return_at: '2026-09-12 17:00', total_amount: 8800, status: 'confirmed', note: '' },
  { id: 8, reservation_code: 'RC-VWX55667', customer_name: '中村 優子', customer_kana: 'ナカムラ ユウコ', customer_email: 'nakamura@example.com', customer_tel: '080-4444-5555', customer_zip: '900-0033', customer_address: '沖縄県那覇市久米2-3-4', vehicle_id: 3, vehicle_name: 'トヨタ アクア (ハイブリッド)', pickup_at: '2026-08-20 09:00', return_at: '2026-08-21 17:00', total_amount: 6600, status: 'confirmed', note: 'ETC希望' },
]

// Mock vehicle pricing (per vehicle, date-based)
const mockVehiclePrices: Record<number, { id: number; vehicle_id: number; date_from: string; date_to: string; price: number; label: string }[]> = {
  1: [
    { id: 1, vehicle_id: 1, date_from: '2026-01-01', date_to: '2026-06-30', price: 3300, label: '通常シーズン' },
    { id: 2, vehicle_id: 1, date_from: '2026-07-01', date_to: '2026-08-31', price: 4400, label: 'ハイシーズン' },
    { id: 3, vehicle_id: 1, date_from: '2026-09-01', date_to: '2026-12-31', price: 3300, label: '通常シーズン' },
  ],
  2: [
    { id: 4, vehicle_id: 2, date_from: '2026-01-01', date_to: '2026-06-30', price: 4400, label: '通常シーズン' },
    { id: 5, vehicle_id: 2, date_from: '2026-07-01', date_to: '2026-08-31', price: 5500, label: 'ハイシーズン' },
    { id: 6, vehicle_id: 2, date_from: '2026-09-01', date_to: '2026-12-31', price: 4400, label: '通常シーズン' },
  ],
  3: [
    { id: 7, vehicle_id: 3, date_from: '2026-01-01', date_to: '2026-06-30', price: 5500, label: '通常シーズン' },
    { id: 8, vehicle_id: 3, date_from: '2026-07-01', date_to: '2026-08-31', price: 7150, label: 'ハイシーズン' },
    { id: 9, vehicle_id: 3, date_from: '2026-09-01', date_to: '2026-12-31', price: 5500, label: '通常シーズン' },
  ],
  4: [
    { id: 10, vehicle_id: 4, date_from: '2026-01-01', date_to: '2026-12-31', price: 8800, label: '通年' },
  ],
  5: [
    { id: 11, vehicle_id: 5, date_from: '2026-01-01', date_to: '2026-12-31', price: 9900, label: '通年' },
  ],
  6: [
    { id: 12, vehicle_id: 6, date_from: '2026-01-01', date_to: '2026-12-31', price: 6600, label: '通年' },
  ],
}

// Mock vehicle blocks (maintenance periods)
const mockVehicleBlocks = [
  { id: 1, vehicle_id: 1, date_from: '2026-09-10', date_to: '2026-09-12', reason: '定期点検' },
  { id: 2, vehicle_id: 3, date_from: '2026-09-15', date_to: '2026-09-16', reason: 'タイヤ交換' },
  { id: 3, vehicle_id: 5, date_from: '2026-10-01', date_to: '2026-10-03', reason: '車検' },
  { id: 4, vehicle_id: 2, date_from: '2026-09-20', date_to: '2026-09-20', reason: 'エアコン修理' },
]

const mockMailTemplates = [
  { id: 1, template_key: 'applicant_created', subject: '【CLレンタカー】ご予約を受け付けました', to_type: 'applicant', enabled: 1, body: '{customer_name} 様\n\nこの度はCLレンタカーをご予約いただきありがとうございます。\n\n■ 予約番号: {reservation_code}\n■ 車両: {vehicle_name}\n■ 貸出日時: {pickup_at}\n■ 返却日時: {return_at}\n■ 合計金額: {total_amount}\n\nキャンセルはこちら: {cancel_url}\n\n{store_name}\nTEL: {store_tel}' },
  { id: 2, template_key: 'admin_created', subject: '【管理】新規予約: {reservation_code}', to_type: 'admin', enabled: 1, body: '新しい予約が入りました。\n\n予約番号: {reservation_code}\nお客様: {customer_name}\n車両: {vehicle_name}\n期間: {pickup_at} 〜 {return_at}\n金額: {total_amount}' },
  { id: 3, template_key: 'applicant_paid', subject: '【CLレンタカー】お支払いが確認されました', to_type: 'applicant', enabled: 1, body: '{customer_name} 様\n\nお支払いの確認ができました。\n予約番号: {reservation_code}\n金額: {total_amount}\n\n当日お待ちしております。' },
  { id: 4, template_key: 'applicant_refunded', subject: '【CLレンタカー】返金処理のお知らせ', to_type: 'applicant', enabled: 1, body: '{customer_name} 様\n\n返金処理が完了しました。\n予約番号: {reservation_code}\n返金額: {total_amount}' },
  { id: 5, template_key: 'applicant_cancelled', subject: '【CLレンタカー】予約キャンセル完了', to_type: 'applicant', enabled: 1, body: '{customer_name} 様\n\nご予約のキャンセルが完了しました。\n予約番号: {reservation_code}\n\nまたのご利用をお待ちしております。' },
  { id: 6, template_key: 'admin_cancelled', subject: '【管理】予約キャンセル: {reservation_code}', to_type: 'admin', enabled: 1, body: '予約がキャンセルされました。\n\n予約番号: {reservation_code}\nお客様: {customer_name}' },
  { id: 7, template_key: 'reminder_pickup', subject: '【CLレンタカー】明日ご利用予定のご案内', to_type: 'applicant', enabled: 1, body: '{customer_name} 様\n\n明日のレンタカーご利用予定のご案内です。\n\n予約番号: {reservation_code}\n車両: {vehicle_name}\n貸出日時: {pickup_at}\n\n{store_name}\n{store_address}\nTEL: {store_tel}' },
]

const mockMailLogs = [
  { id: 1, template_key: 'applicant_created', to_address: 'yamada@example.com', subject: '【CLレンタカー】ご予約を受け付けました', status: 'sent', retry_count: 0, sent_at: '2026-08-18 14:31' },
  { id: 2, template_key: 'admin_created', to_address: 'admin@cl-rentacar.com', subject: '【管理】新規予約: RC-ABC12345', status: 'sent', retry_count: 0, sent_at: '2026-08-18 14:31' },
  { id: 3, template_key: 'applicant_paid', to_address: 'yamada@example.com', subject: '【CLレンタカー】お支払いが確認されました', status: 'sent', retry_count: 0, sent_at: '2026-08-18 14:35' },
  { id: 4, template_key: 'applicant_created', to_address: 'sato@example.com', subject: '【CLレンタカー】ご予約を受け付けました', status: 'sent', retry_count: 0, sent_at: '2026-08-19 10:16' },
  { id: 5, template_key: 'applicant_cancelled', to_address: 'ito@example.com', subject: '【CLレンタカー】予約キャンセル完了', status: 'sent', retry_count: 0, sent_at: '2026-08-15 11:00' },
  { id: 6, template_key: 'reminder_pickup', to_address: 'tanaka@example.com', subject: '【CLレンタカー】明日ご利用予定のご案内', status: 'failed', retry_count: 3, sent_at: null },
  { id: 7, template_key: 'applicant_created', to_address: 'nakamura@example.com', subject: '【CLレンタカー】ご予約を受け付けました', status: 'sent', retry_count: 0, sent_at: '2026-08-20 08:50' },
]

const mockHolidays = [
  { id: 1, date: '2026-09-07', label: '定休日', vehicle_id: 0 },
  { id: 2, date: '2026-09-14', label: '定休日', vehicle_id: 0 },
  { id: 3, date: '2026-09-21', label: '定休日', vehicle_id: 0 },
  { id: 4, date: '2026-09-28', label: '定休日', vehicle_id: 0 },
  { id: 5, date: '2026-12-31', label: '年末休業', vehicle_id: 0 },
  { id: 6, date: '2027-01-01', label: '年始休業', vehicle_id: 0 },
  { id: 7, date: '2027-01-02', label: '年始休業', vehicle_id: 0 },
]

// Dashboard
app.get('/api/rentacar/v1/admin/reservations/dashboard', (c) => {
  return c.json({
    month_count: 8, month_sales: 115500, pending_count: 1, vehicle_count: 6,
    today_pickups: [
      { reservation_code: 'RC-DEF67890', customer_name: '佐藤 花子', vehicle_name: 'トヨタ ノア (ワゴン)', pickup_at: '2026-08-20 10:00' },
      { reservation_code: 'RC-VWX55667', customer_name: '中村 優子', vehicle_name: 'トヨタ アクア (ハイブリッド)', pickup_at: '2026-08-20 09:00' },
    ],
    today_returns: [
      { reservation_code: 'RC-MNO77889', customer_name: '高橋 健太', vehicle_name: 'スズキ ジムニー (SUV)', return_at: '2026-08-20 17:00' },
    ]
  })
})

// Admin Vehicles
app.get('/api/rentacar/v1/admin/vehicles', (c) => {
  return c.json({ items: vehicles.map(v => ({ ...v, stock: 2, slug: v.name.toLowerCase().replace(/\s/g, '-'), description: '', meta: { seats: v.seats, transmission: v.transmission, vehicle_class: '' }, thumbnail_id: 0 })) })
})
app.get('/api/rentacar/v1/admin/vehicles/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  const v = vehicles.find(x => x.id === id)
  if (!v) return c.json({ error: 'Not found' }, 404)
  return c.json({ ...v, stock: 2, slug: v.name.toLowerCase().replace(/\s/g, '-'), description: '', meta: { seats: v.seats, transmission: v.transmission, vehicle_class: '' }, thumbnail_id: 0 })
})
app.post('/api/rentacar/v1/admin/vehicles', async (c) => { return c.json({ id: 7, success: true }) })
app.put('/api/rentacar/v1/admin/vehicles/:id', async (c) => { return c.json({ success: true }) })
app.delete('/api/rentacar/v1/admin/vehicles/:id', (c) => { return c.json({ success: true }) })

// Admin Reservations
app.get('/api/rentacar/v1/admin/reservations', (c) => {
  const status = c.req.query('status')
  const search = c.req.query('search')
  let items = [...mockReservations]
  if (status) items = items.filter(r => r.status === status)
  if (search) items = items.filter(r => r.customer_name.includes(search) || r.customer_email.includes(search) || r.reservation_code.includes(search))
  return c.json({ items, total: items.length })
})
app.get('/api/rentacar/v1/admin/reservations/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  const r = mockReservations.find(x => x.id === id)
  if (!r) return c.json({ error: 'Not found' }, 404)
  return c.json(r)
})
app.put('/api/rentacar/v1/admin/reservations/:id', async (c) => { return c.json({ success: true }) })

// Admin Vehicle Prices (per vehicle)
app.get('/api/rentacar/v1/admin/vehicles/:id/prices', (c) => {
  const id = parseInt(c.req.param('id'))
  return c.json(mockVehiclePrices[id] || [])
})
app.post('/api/rentacar/v1/admin/vehicles/:id/prices', async (c) => c.json({ id: 99, success: true }))
app.delete('/api/rentacar/v1/admin/vehicles/:vid/prices/:id', (c) => c.json({ success: true }))
app.put('/api/rentacar/v1/admin/vehicles/:vid/prices/:id', async (c) => {
  const vid = parseInt(c.req.param('vid'))
  const pid = parseInt(c.req.param('id'))
  const body = await c.req.json<{ date_from?: string; date_to?: string; price?: number; label?: string }>()
  const list = mockVehiclePrices[vid]
  if (!list) return c.json({ error: 'Vehicle not found' }, 404)
  const idx = list.findIndex(p => p.id === pid)
  if (idx === -1) return c.json({ error: 'Price not found' }, 404)
  if (body.date_from) list[idx].date_from = body.date_from
  if (body.date_to) list[idx].date_to = body.date_to
  if (body.price !== undefined) list[idx].price = body.price
  if (body.label !== undefined) list[idx].label = body.label
  return c.json({ ...list[idx], success: true })
})

// Admin Vehicle Blocks (maintenance)
app.get('/api/rentacar/v1/admin/vehicles/:id/blocks', (c) => {
  const id = parseInt(c.req.param('id'))
  return c.json(mockVehicleBlocks.filter(b => b.vehicle_id === id))
})
app.get('/api/rentacar/v1/admin/blocks', (c) => {
  return c.json(mockVehicleBlocks)
})
app.post('/api/rentacar/v1/admin/vehicles/:id/blocks', async (c) => c.json({ id: 99, success: true }))
app.delete('/api/rentacar/v1/admin/vehicles/:vid/blocks/:id', (c) => c.json({ success: true }))

// Admin Options
app.get('/api/rentacar/v1/admin/options', (c) => {
  return c.json(options.map(o => ({ ...o, status: 'published' })))
})
app.post('/api/rentacar/v1/admin/options', async (c) => c.json({ id: 8, success: true }))
app.put('/api/rentacar/v1/admin/options/:id', async (c) => c.json({ success: true }))
app.delete('/api/rentacar/v1/admin/options/:id', (c) => c.json({ success: true }))

// Admin Holidays
app.get('/api/rentacar/v1/admin/holidays', (c) => c.json(mockHolidays))
app.post('/api/rentacar/v1/admin/holidays', async (c) => c.json({ id: 8, success: true }))
app.put('/api/rentacar/v1/admin/holidays/:id', async (c) => c.json({ success: true }))
app.delete('/api/rentacar/v1/admin/holidays/:id', (c) => c.json({ success: true }))

// Admin Mail Templates
app.get('/api/rentacar/v1/admin/mail-templates', (c) => c.json(mockMailTemplates))
app.get('/api/rentacar/v1/admin/mail-templates/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  const t = mockMailTemplates.find(x => x.id === id)
  if (!t) return c.json({ error: 'Not found' }, 404)
  return c.json(t)
})
app.put('/api/rentacar/v1/admin/mail-templates/:id', async (c) => c.json({ success: true }))

// Admin Mail Logs
app.get('/api/rentacar/v1/admin/mail-logs', (c) => c.json({ items: mockMailLogs, total: mockMailLogs.length }))
app.post('/api/rentacar/v1/admin/mail-logs/:id/resend', (c) => c.json({ success: true }))

// Admin Settings
app.get('/api/rentacar/v1/admin/settings', (c) => c.json({
  store_name: 'CLレンタカー', store_tel: '098-123-4567', store_email: 'info@cl-rentacar.com',
  store_address: '沖縄県那覇市おもろまち1-2-3', business_hours_start: '08:00', business_hours_end: '20:00',
  recaptcha_site_key: '', recaptcha_secret_key: '', recaptcha_score: '0.5',
  rate_limit_per_minute: '10'
}))
app.post('/api/rentacar/v1/admin/settings', async (c) => c.json({ success: true }))
app.post('/api/rentacar/v1/admin/settings/test-mail', async (c) => c.json({ success: true }))

// Admin Analytics
app.get('/api/rentacar/v1/admin/analytics', (c) => {
  const period = c.req.query('period') || 'all' // all, this_month, last_month, last_3months, last_6months, this_year

  // Filter reservations by period
  function filterByPeriod(reservations: typeof mockReservations) {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth() // 0-indexed

    switch (period) {
      case 'this_month': {
        const start = new Date(thisYear, thisMonth, 1)
        const end = new Date(thisYear, thisMonth + 1, 0, 23, 59, 59)
        return reservations.filter(r => {
          const d = new Date(r.pickup_at)
          return d >= start && d <= end
        })
      }
      case 'last_month': {
        const start = new Date(thisYear, thisMonth - 1, 1)
        const end = new Date(thisYear, thisMonth, 0, 23, 59, 59)
        return reservations.filter(r => {
          const d = new Date(r.pickup_at)
          return d >= start && d <= end
        })
      }
      case 'last_3months': {
        const start = new Date(thisYear, thisMonth - 2, 1)
        return reservations.filter(r => new Date(r.pickup_at) >= start)
      }
      case 'last_6months': {
        const start = new Date(thisYear, thisMonth - 5, 1)
        return reservations.filter(r => new Date(r.pickup_at) >= start)
      }
      case 'this_year': {
        const start = new Date(thisYear, 0, 1)
        return reservations.filter(r => new Date(r.pickup_at) >= start)
      }
      default:
        return reservations
    }
  }

  const filtered = filterByPeriod(mockReservations)

  // ── Section 1: KPI Summary ──
  const totalCount = filtered.length
  const confirmedOrCompleted = filtered.filter(r => r.status === 'confirmed' || r.status === 'completed')
  const cancelledCount = filtered.filter(r => r.status === 'cancelled').length
  const totalSales = confirmedOrCompleted.reduce((sum, r) => sum + r.total_amount, 0)
  const avgPrice = confirmedOrCompleted.length > 0 ? Math.round(totalSales / confirmedOrCompleted.length) : 0
  const cancelRate = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0

  // Utilization rate: (booked days across all vehicles) / (total available days * total vehicles)
  // Simplified calculation
  let totalBookedDays = 0
  confirmedOrCompleted.forEach(r => {
    const pickup = new Date(r.pickup_at)
    const ret = new Date(r.return_at)
    const days = Math.max(1, Math.ceil((ret.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)))
    totalBookedDays += days
  })
  const totalVehicles = vehicles.length
  const daysInPeriod = 30 // Simplified: use 30 days
  const utilizationRate = totalVehicles > 0 ? Math.min(100, Math.round((totalBookedDays / (totalVehicles * daysInPeriod)) * 100)) : 0

  // Repeat customers
  const emailCounts: Record<string, number> = {}
  filtered.forEach(r => {
    if (r.status !== 'cancelled') {
      emailCounts[r.customer_email] = (emailCounts[r.customer_email] || 0) + 1
    }
  })
  const repeatCustomers = Object.values(emailCounts).filter(c => c >= 2).length
  const uniqueCustomers = Object.keys(emailCounts).length
  const repeatRate = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0

  const summary = {
    total_reservations: totalCount,
    total_sales: totalSales,
    avg_price: avgPrice,
    cancel_rate: cancelRate,
    utilization_rate: utilizationRate,
    repeat_rate: repeatRate,
    confirmed_count: confirmedOrCompleted.length,
    cancelled_count: cancelledCount,
    pending_count: filtered.filter(r => r.status === 'pending').length
  }

  // ── Section 2: Monthly Trends ──
  const monthlyMap: Record<string, { count: number; sales: number; cancelled: number }> = {}
  // Generate last 12 months for consistent chart
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = { count: 0, sales: 0, cancelled: 0 }
  }
  // Fill with actual data from ALL reservations (not filtered) for trend
  mockReservations.forEach(r => {
    const d = new Date(r.pickup_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key] !== undefined) {
      monthlyMap[key].count++
      if (r.status === 'confirmed' || r.status === 'completed') {
        monthlyMap[key].sales += r.total_amount
      }
      if (r.status === 'cancelled') {
        monthlyMap[key].cancelled++
      }
    }
  })

  const monthly_trends = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: `${parseInt(month.split('-')[1])}月`,
      ...data
    }))

  // ── Section 3: Vehicle Analysis ──
  const vehicleStats: Record<number, { name: string; count: number; sales: number; days: number }> = {}
  vehicles.forEach(v => {
    vehicleStats[v.id] = { name: v.name, count: 0, sales: 0, days: 0 }
  })
  confirmedOrCompleted.forEach(r => {
    const stat = vehicleStats[r.vehicle_id]
    if (stat) {
      stat.count++
      stat.sales += r.total_amount
      const pickup = new Date(r.pickup_at)
      const ret = new Date(r.return_at)
      stat.days += Math.max(1, Math.ceil((ret.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)))
    }
  })

  const vehicle_analysis = Object.entries(vehicleStats).map(([id, stat]) => ({
    vehicle_id: parseInt(id),
    vehicle_name: stat.name,
    reservation_count: stat.count,
    total_sales: stat.sales,
    total_days: stat.days,
    avg_per_day: stat.days > 0 ? Math.round(stat.sales / stat.days) : 0,
    utilization: Math.min(100, Math.round((stat.days / (daysInPeriod * 2)) * 100)) // 2 units per vehicle
  })).sort((a, b) => b.total_sales - a.total_sales)

  return c.json({
    period,
    summary,
    monthly_trends,
    vehicle_analysis
  })
})

// Admin System Info
app.get('/api/rentacar/v1/admin/settings/system', (c) => c.json({
  php_version: '8.2.20', wp_version: '6.6.1', plugin_version: '1.0.0', db_version: '1.0.0',
  timezone: 'Asia/Tokyo', memory_limit: '256M', upload_max: '64M', openssl: true,
  tables: [
    { name: 'rc_vehicles', rows: 6 }, { name: 'rc_vehicle_meta', rows: 12 },
    { name: 'rc_reservations', rows: 8 }, { name: 'rc_reservation_options', rows: 5 },
    { name: 'rc_vehicle_prices', rows: 12 }, { name: 'rc_vehicle_blocks', rows: 4 },
    { name: 'rc_options', rows: 7 }, { name: 'rc_holidays', rows: 7 },
    { name: 'rc_mail_templates', rows: 7 }, { name: 'rc_mail_logs', rows: 7 },
    { name: 'rc_settings', rows: 15 },
  ]
}))

/* ═══════════════════════════════════════════════════════
   Admin HTML Pages
   ═══════════════════════════════════════════════════════ */

const adminMenuItems = [
  { key: 'dashboard', icon: '📊', label: 'ダッシュボード' },
  { key: 'analytics', icon: '📈', label: '分析レポート' },
  { key: 'reservations', icon: '📋', label: '予約管理' },
  { key: 'vehicles', icon: '🚗', label: '車両管理' },

  { key: 'options', icon: '🛡️', label: 'オプション' },

  { key: 'holidays', icon: '🏖️', label: '休業日' },

  { key: 'mail-templates', icon: '✉️', label: 'メールテンプレート' },
  { key: 'mail-logs', icon: '📨', label: 'メール送信ログ' },
  { key: 'settings', icon: '⚙️', label: '設定' },
  { key: 'system', icon: '🖥️', label: 'システム情報' },
]

function adminPage(pageKey: string) {
  const currentItem = adminMenuItems.find(m => m.key === pageKey) || adminMenuItems[0]

  const sidebar = adminMenuItems.map(m => {
    const active = m.key === pageKey
    return `<a href="/admin/${m.key}" class="admin-menu-item${active ? ' active' : ''}">
      <span class="admin-menu-icon">${m.icon}</span><span class="admin-menu-text">${m.label}</span>
    </a>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentItem.label} — CL Rentacar 管理</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/admin.css">
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Noto Sans JP","Hiragino Sans",sans-serif; background: #f0f2f5; color: #333; }
    .admin-layout { display: flex; min-height: 100vh; }
    .admin-sidebar { width: 240px; background: #1e293b; color: #cbd5e1; position: fixed; top: 0; left: 0; bottom: 0; overflow-y: auto; z-index: 100; transition: transform 0.3s; }
    .admin-sidebar-header { padding: 20px 16px; border-bottom: 1px solid #334155; }
    .admin-sidebar-brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; }
    .admin-sidebar-brand-icon { font-size: 24px; }
    .admin-sidebar-brand-text { font-size: 16px; font-weight: 700; }
    .admin-sidebar-brand-sub { font-size: 10px; color: #94a3b8; display: block; }
    .admin-sidebar-nav { padding: 8px 0; }
    .admin-menu-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: #cbd5e1; text-decoration: none; transition: all 0.2s; font-size: 13px; border-left: 3px solid transparent; }
    .admin-menu-item:hover { background: #334155; color: #fff; }
    .admin-menu-item.active { background: #0097a7; color: #fff; border-left-color: #00bcd4; }
    .admin-menu-icon { font-size: 16px; width: 22px; text-align: center; }
    .admin-menu-text { font-weight: 500; }
    .admin-main { margin-left: 240px; flex: 1; min-height: 100vh; }
    .admin-topbar { background: #fff; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
    .admin-topbar-title { font-size: 18px; font-weight: 700; color: #1e293b; }
    .admin-topbar-right { display: flex; align-items: center; gap: 12px; }
    .admin-topbar-badge { background: #00bcd4; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    .admin-topbar-link { color: #64748b; text-decoration: none; font-size: 13px; transition: color 0.2s; }
    .admin-topbar-link:hover { color: #00bcd4; }
    .admin-content { padding: 24px; }
    .admin-content .rc-admin-wrap { max-width: 100%; }
    .admin-mobile-toggle { display: none; background: none; border: none; font-size: 24px; cursor: pointer; padding: 4px; color: #333; }
    @media (max-width: 768px) {
      .admin-sidebar { transform: translateX(-100%); }
      .admin-sidebar.open { transform: translateX(0); }
      .admin-main { margin-left: 0; }
      .admin-mobile-toggle { display: block; }
      .admin-sidebar-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 99; }
      .admin-sidebar-overlay.open { display: block; }
    }
  </style>
</head>
<body>
  <div class="admin-layout">
    <div class="admin-sidebar-overlay" id="sidebar-overlay" onclick="document.getElementById('admin-sidebar').classList.remove('open');this.classList.remove('open');"></div>
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="admin-sidebar-header">
        <a href="/admin/dashboard" class="admin-sidebar-brand">
          <span class="admin-sidebar-brand-icon">🚗</span>
          <div>
            <span class="admin-sidebar-brand-text">CL Rentacar</span>
            <span class="admin-sidebar-brand-sub">管理画面プレビュー</span>
          </div>
        </a>
      </div>
      <nav class="admin-sidebar-nav">
        ${sidebar}
        <div style="border-top:1px solid #334155;margin:8px 0;"></div>
        <a href="/" class="admin-menu-item"><span class="admin-menu-icon">🌐</span><span class="admin-menu-text">フロント表示</span></a>
        <a href="/booking" class="admin-menu-item"><span class="admin-menu-icon">📝</span><span class="admin-menu-text">予約フォーム</span></a>
      </nav>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="admin-mobile-toggle" onclick="document.getElementById('admin-sidebar').classList.toggle('open');document.getElementById('sidebar-overlay').classList.toggle('open');">☰</button>
          <span class="admin-topbar-title">${currentItem.icon} ${currentItem.label}</span>
        </div>
        <div class="admin-topbar-right">
          <span class="admin-topbar-badge">DEMO</span>
          <a href="/" class="admin-topbar-link">🌐 サイト表示</a>
        </div>
      </header>
      <div class="admin-content">
        <div class="rc-admin-wrap" id="rc-admin-app" data-page="${pageKey}">
          <div class="rc-loading">読み込み中...</div>
        </div>
      </div>
    </div>
  </div>
  <script>
    var rcAdminData = {
      restUrl: '/api/rentacar/v1',
      nonce: 'preview-nonce'
    };
  </script>
  <script src="/static/admin.js"></script>
</body>
</html>`
}

// Register all admin routes
adminMenuItems.forEach(item => {
  app.get(`/admin/${item.key}`, (c) => c.html(adminPage(item.key)))
})
// Redirect /admin to /admin/dashboard
app.get('/admin', (c) => c.redirect('/admin/dashboard'))

// Favicon (suppress 404)
app.get('/favicon.ico', (c) => {
  return new Response(null, { status: 204 })
})

export default app
