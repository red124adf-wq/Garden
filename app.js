// =============================================
// CHILLS — Garden Monitor
// js/app.js
// =============================================

// ===== КОНФІГУРАЦІЯ =====
const CONFIG = {
  mqtt: {
    broker:   'wss://9db95805f2e640a98a99663099434134.s1.eu.hivemq.cloud:8884/mqtt',
    user:     'esp32user',
    pass:     'Esp32pass123',
    topics: {
      state:     'chills/state',
      power:     'chills/power',
      temp:      'chills/temperature',
      hum:       'chills/humidity',
      time:      'chills/time',
      cmdLight:  'chills/cmd/light',
      cmdHum:    'chills/cmd/hum',
      cmdFan:    'chills/cmd/fan',
      cmdRes:    'chills/cmd/res',
      cmdParams: 'chills/cmd/params',
    }
  },
  supabase: {
    url:    'https://wesibzuxkytajteyejmw.supabase.co',
    key:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc2lienV4a3l0YWp0ZXllam13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDUwNzIsImV4cCI6MjA4NTc4MTA3Mn0.eRymrXGUaA0HXAFEuyZwjbSJLEOnNZuG0O2ux_cyP6U',
    table:  'power_events',
  }
};

const RELAYS = [
  { key: 'light', topic: CONFIG.mqtt.topics.cmdLight, name: '💡 Світло'     },
  { key: 'hum',   topic: CONFIG.mqtt.topics.cmdHum,   name: '💧 Зволожувач' },
  { key: 'fan',   topic: CONFIG.mqtt.topics.cmdFan,   name: '🌬 Вентилятор' },
  { key: 'res',   topic: CONFIG.mqtt.topics.cmdRes,   name: '🔌 Резерв'     },
];

// ===== СТАН =====
let state       = {};
let mqttClient  = null;
let userEditing = false;
let editTimer   = null;
let lastDataTime = Date.now();
let offlineDetected = false;

// =============================================
// SUPABASE — читання та відображення
// =============================================

async function fetchOutages() {
  // Отримуємо події за останні 24 години за Києвом
  const now    = new Date();
  const since  = new Date(now.getTime() - 86400000).toISOString();

  try {
    const res = await fetch(
      `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.table}` +
      `?select=*&created_at=gte.${since}&order=created_at.asc`,
      {
        headers: {
          'apikey':        CONFIG.supabase.key,
          'Authorization': `Bearer ${CONFIG.supabase.key}`,
        }
      }
    );

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    renderOutages(rows);
  } catch (e) {
    console.error('Supabase fetch error:', e);
    document.getElementById('outageList').innerHTML =
      '<div class="no-outages">⚠️ Помилка завантаження історії</div>';
  }
}

// ===== ПОБУДОВА ПАР Відключень =====
function buildPairs(rows) {
  // Перетворюємо плоский список подій в пари OFF→ON
  const pairs = [];
  let openOff = null;

  rows.forEach(row => {
    if (row.event === 'OFF') {
      openOff = new Date(row.created_at);
    } else if (row.event === 'ON' && openOff) {
      pairs.push({ start: openOff, end: new Date(row.created_at) });
      openOff = null;
    }
  });

  // Якщо є відкрите відключення без кінця — воно ще триває
  if (openOff) {
    pairs.push({ start: openOff, end: null });
  }

  return pairs;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}г ${m % 60}хв`;
  if (m > 0) return `${m}хв ${s % 60}с`;
  return `${s}с`;
}

function formatTime(date) {
  return date.toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Europe/Kiev'
  });
}

function renderTimeline(pairs) {
  const now    = Date.now();
  const cutoff = now - 86400000;
  const labels = document.getElementById('timelineLabels');
  const tl     = document.getElementById('timeline');

  // Мітки кожні 6 годин
  let labelHtml = '';
  for (let i = 0; i <= 4; i++) {
    const t = new Date(cutoff + i * 21600000);
    const h = t.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' });
    labelHtml += `<span>${h}</span>`;
  }
  labels.innerHTML = labelHtml;

  // Фон — зелений
  tl.innerHTML = '<div class="timeline-bar power-on" style="left:0;width:100%"></div>';

  // Червоні відрізки
  pairs.forEach(p => {
    const start = Math.max(p.start.getTime(), cutoff);
    const end   = Math.min(p.end ? p.end.getTime() : now, now);
    const left  = ((start - cutoff) / 86400000) * 100;
    const width = ((end - start)   / 86400000) * 100;
    const bar   = document.createElement('div');
    bar.className = 'timeline-bar power-off';
    bar.style.left  = left + '%';
    bar.style.width = Math.max(width, 0.3) + '%';
    tl.appendChild(bar);
  });
}

function renderOutages(rows) {
  const pairs = buildPairs(rows);
  renderTimeline(pairs);

  if (pairs.length === 0) {
    document.getElementById('outageList').innerHTML =
      '<div class="no-outages">✅ Відключень за останні 24 год не зафіксовано</div>';
    return;
  }

  // Сортуємо — найновіші зверху
  const sorted = [...pairs].reverse();

  let html = `<table class="outage-table">
    <tr><th>Початок</th><th>Кінець</th><th>Тривалість</th></tr>`;

  sorted.forEach(p => {
    const start   = formatTime(p.start);
    const end     = p.end ? formatTime(p.end) : '⏳ зараз';
    const durMs   = p.end ? p.end - p.start : Date.now() - p.start;
    const dur     = formatDuration(durMs);
    const cls     = durMs > 3600000 ? 'duration-warn' : 'duration-ok';
    html += `<tr>
      <td>${start}</td>
      <td>${end}</td>
      <td class="${cls}">${dur}</td>
    </tr>`;
  });

  html += '</table>';
  document.getElementById('outageList').innerHTML = html;
}

// Оновлюємо кожні 60 секунд
fetchOutages();
setInterval(fetchOutages, 60000);

// =============================================
// MQTT
// =============================================

function connectMQTT() {
  mqttClient = mqtt.connect(CONFIG.mqtt.broker, {
    username: CONFIG.mqtt.user,
    password: CONFIG.mqtt.pass,
    clientId: 'ChillsWeb_' + Math.random().toString(16).slice(2, 8)
  });

  mqttClient.on('connect', () => {
    document.getElementById('dot').classList.add('ok');
    document.getElementById('connText').textContent = 'Підключено';
    Object.values(CONFIG.mqtt.topics).forEach(t => {
      if (!t.startsWith('chills/cmd')) mqttClient.subscribe(t);
    });
    mqttClient.subscribe('chills/temperature');
    mqttClient.subscribe('chills/humidity');
    mqttClient.subscribe('chills/time');
    showToast('✅ Підключено до MQTT');
  });

  mqttClient.on('message', (topic, payload) => {
    const msg = payload.toString();
    lastDataTime = Date.now();

    if (topic === CONFIG.mqtt.topics.state) {
      try {
        state = JSON.parse(msg);
        updateSensors();
        renderRelays();
        fillParams();
      } catch (e) { console.error(e); }
      return;
    }

    if (topic === CONFIG.mqtt.topics.power) {
      // Оновлюємо таблицю з Supabase при зміні живлення
      setTimeout(fetchOutages, 2000);
      return;
    }

    if (topic === 'chills/temperature') {
      document.getElementById('sTemp').textContent = parseFloat(msg).toFixed(1);
      document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('uk-UA');
    }
    if (topic === 'chills/humidity') {
      document.getElementById('sHum').textContent = parseFloat(msg).toFixed(1);
    }
    if (topic === 'chills/time') {
      document.getElementById('sTime').textContent = msg.substring(0, 5);
    }
  });

  mqttClient.on('error', err => {
    document.getElementById('connText').textContent = 'Помилка';
    showToast('❌ ' + err.message);
  });

  mqttClient.on('offline', () => {
    document.getElementById('dot').classList.remove('ok');
    document.getElementById('connText').textContent = "З'єднання втрачено";
  });
}

// Перевірка мовчання ESP32 (відключення світла)
setInterval(() => {
  const silentMs = Date.now() - lastDataTime;
  if (silentMs > 30000 && !offlineDetected) {
    offlineDetected = true;
    setTimeout(fetchOutages, 2000);
  }
  if (silentMs < 5000 && offlineDetected) {
    offlineDetected = false;
    setTimeout(fetchOutages, 2000);
  }
}, 5000);

// =============================================
// UI
// =============================================

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function onParamFocus() {
  userEditing = true;
  clearTimeout(editTimer);
}

function onParamBlur() {
  editTimer = setTimeout(() => { userEditing = false; }, 10000);
}

function updateSensors() {
  document.getElementById('sTemp').textContent = state.temp?.toFixed(1) ?? '--';
  document.getElementById('sHum').textContent  = state.hum?.toFixed(1)  ?? '--';
  document.getElementById('sTime').textContent = state.time?.substring(0, 5) ?? '--';
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('uk-UA');

  const ind = document.getElementById('powerIndicator');
  if (state.power === true) {
    ind.textContent = '⚡ ON';
    ind.className   = 'power-indicator on';
  } else if (state.power === false) {
    ind.textContent = '❌ OFF';
    ind.className   = 'power-indicator off';
  }
}

function renderRelays() {
  const list = document.getElementById('relayList');
  if (!state.relays) return;
  list.innerHTML = RELAYS.map(r => {
    const on   = state.relays?.[r.key] ?? false;
    const auto = state.modes?.[r.key]  ?? true;
    return `<div class="relay-row">
      <div class="relay-left">
        <span class="relay-name">${r.name}</span>
        <span class="relay-state ${on ? 'on' : 'off'}">${on ? 'ON' : 'OFF'}</span>
      </div>
      <div class="relay-controls">
        <span class="badge ${auto ? 'auto' : 'manual'}"
          onclick="toggleMode('${r.key}','${r.topic}',${auto})">
          ${auto ? 'АВТО' : 'РУЧ'}
        </span>
        ${!auto ? `
          <button class="btn on-btn"  onclick="sendCmd('${r.topic}','ON')">УВІМК</button>
          <button class="btn off-btn" onclick="sendCmd('${r.topic}','OFF')">ВИМК</button>
        ` : ''}
      </div>
    </div>`;
  }).join('');
}

function fillParams() {
  if (userEditing) return;
  const p = state.params || {};
  document.getElementById('pSummer').checked  = state.summer  ?? true;
  document.getElementById('pLightOn').value   = p.lightOn  ?? 6;
  document.getElementById('pLightOff').value  = p.lightOff ?? 22;
  document.getElementById('pHumMin').value    = p.humMin   ?? 60;
  document.getElementById('pFanT').value      = p.fanT     ?? 25;
  document.getElementById('pFanH').value      = p.fanH     ?? 70;
  document.getElementById('pFanByT').checked  = p.fanByT   ?? true;
  document.getElementById('pFanByH').checked  = p.fanByH   ?? true;
}

function sendCmd(topic, cmd) {
  if (!mqttClient?.connected) return;
  mqttClient.publish(topic, cmd);
  showToast('✅ ' + cmd);
}

function toggleMode(key, topic, isAuto) {
  sendCmd(topic, isAuto ? 'OFF' : 'AUTO');
  showToast(isAuto ? '🔧 Ручний: ' + key : '🤖 Авто: ' + key);
}

function saveParams() {
  if (!mqttClient?.connected) { showToast('❌ Немає підключення!'); return; }
  const params = {
    summer:   document.getElementById('pSummer').checked,
    lightOn:  parseInt(document.getElementById('pLightOn').value),
    lightOff: parseInt(document.getElementById('pLightOff').value),
    humMin:   parseFloat(document.getElementById('pHumMin').value),
    fanT:     parseFloat(document.getElementById('pFanT').value),
    fanH:     parseFloat(document.getElementById('pFanH').value),
    fanByT:   document.getElementById('pFanByT').checked,
    fanByH:   document.getElementById('pFanByH').checked,
  };
  mqttClient.publish(CONFIG.mqtt.topics.cmdParams, JSON.stringify(params));
  userEditing = false;
  showToast('💾 Параметри збережено!');
}

// =============================================
// СТАРТ
// =============================================
requireAuth();
connectMQTT();

