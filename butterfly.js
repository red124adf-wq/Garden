// js/butterfly.js

const MQTT_BROKER = 'wss://9db95805f2e640a98a99663099434134.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USER   = 'esp32user';
const MQTT_PASS   = 'Esp32pass123';

let mqttClient = null;
let currentPower = null;

// ===== АВТОРИЗАЦІЯ =====
requireAuth();

// ===== АНІМОВАНІ МЕТЕЛИКИ =====
function createButterflies() {
  const container = document.getElementById('butterflies');
  const icons = ['🦋', '🦋', '🌸', '🦋', '🌺', '🦋'];
  for (let i = 0; i < 8; i++) {
    const b = document.createElement('div');
    b.className = 'butterfly';
    b.textContent = icons[Math.floor(Math.random() * icons.length)];
    b.style.top      = Math.random() * 90 + '%';
    b.style.fontSize = (14 + Math.random() * 16) + 'px';
    b.style.animationDuration  = (15 + Math.random() * 20) + 's';
    b.style.animationDelay     = (-Math.random() * 20) + 's';
    b.style.opacity = (0.2 + Math.random() * 0.3).toString();
    container.appendChild(b);
  }
}

// ===== ОНОВЛЕННЯ UI =====
function setPower(isOn) {
  if (currentPower === isOn) return;
  currentPower = isOn;

  const card   = document.getElementById('mainCard');
  const ring   = document.getElementById('glowRing');
  const icon   = document.getElementById('mainIcon');
  const status = document.getElementById('mainStatus');
  const sub    = document.getElementById('mainSub');

  if (isOn) {
    card.className   = 'main-card';
    ring.className   = 'glow-ring on';
    icon.className   = 'main-icon on';
    icon.textContent = '💡';
    status.className = 'main-status on';
    status.textContent = 'Світло є! ✨';
    sub.textContent  = 'Все добре 🌸';
  } else {
    card.className   = 'main-card power-off';
    ring.className   = 'glow-ring off';
    icon.className   = 'main-icon off';
    icon.textContent = '🕯️';
    status.className = 'main-status off';
    status.textContent = 'Світла немає';
    sub.textContent  = 'Зачекай трохи 🦋';
  }
}

// ===== SUPABASE — ІСТОРІЯ =====
async function fetchHistory() {
  const since = new Date(Date.now() - 86400000).toISOString();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/power_events?select=*&created_at=gte.${since}&order=created_at.desc`,
      {
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );
    const rows = await res.json();
    renderHistory(rows);
  } catch (e) {
    document.getElementById('historyList').innerHTML =
      '<div class="no-history">⚠️ Не вдалося завантажити</div>';
  }
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev'
  });
}

function formatDur(ms) {
  if (ms < 60000) return Math.floor(ms / 1000) + ' сек';
  if (ms < 3600000) return Math.floor(ms / 60000) + ' хв';
  return Math.floor(ms / 3600000) + ' год ' + Math.floor((ms % 3600000) / 60000) + ' хв';
}

function renderHistory(rows) {
  // Оновлюємо останню подію
  if (rows.length > 0) {
    const last = rows[0];
    const time = formatTime(last.created_at);
    const label = last.event === 'OFF' ? '❌ Світло вимкнулось' : '✅ Світло увімкнулось';
    document.getElementById('lastEvent').textContent = `${label} о ${time}`;
  }

  // Будуємо пари OFF→ON
  const sorted = [...rows].reverse();
  const pairs  = [];
  let openOff  = null;

  sorted.forEach(r => {
    if (r.event === 'OFF') {
      openOff = r;
    } else if (r.event === 'ON' && openOff) {
      pairs.push({ off: openOff, on: r });
      openOff = null;
    }
  });
  if (openOff) pairs.push({ off: openOff, on: null });

  if (pairs.length === 0) {
    document.getElementById('historyList').innerHTML =
      '<div class="no-history">🌸 Сьогодні відключень не було!</div>';
    return;
  }

  const html = pairs.reverse().map(p => {
    const offTime = formatTime(p.off.created_at);
    const onTime  = p.on ? formatTime(p.on.created_at) : 'зараз';
    const durMs   = p.on
      ? new Date(p.on.created_at) - new Date(p.off.created_at)
      : Date.now() - new Date(p.off.created_at);
    const dur = formatDur(durMs);

    return `<div class="history-row">
      <span class="history-icon">🕯️</span>
      <span class="history-time">${offTime}</span>
      <span class="history-label">— ${onTime}</span>
      <span class="history-dur off">${dur}</span>
    </div>`;
  }).join('');

  document.getElementById('historyList').innerHTML = html;
}

// ===== MQTT =====
function connectMQTT() {
  mqttClient = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USER,
    password: MQTT_PASS,
    clientId: 'Butterfly_' + Math.random().toString(16).slice(2, 8)
  });

  mqttClient.on('connect', () => {
    mqttClient.subscribe('chills/state');
    mqttClient.subscribe('chills/power');
  });

  mqttClient.on('message', (topic, payload) => {
    const msg = payload.toString();

    if (topic === 'chills/state') {
      try {
        const state = JSON.parse(msg);
        // power: true = є 220В
        setPower(state.power === true);
      } catch(e) {}
    }

    if (topic === 'chills/power') {
      // ON від ESP32 = є живлення
      setPower(msg === 'ON');
      setTimeout(fetchHistory, 2000);
    }
  });

  mqttClient.on('offline', () => {
    document.getElementById('mainSub').textContent = "З'єднання втрачено...";
  });
}

// ===== СТАРТ =====
createButterflies();
connectMQTT();
fetchHistory();
setInterval(fetchHistory, 60000);
