// ===== CONFIG =====
// Live Server only serves static files. When the page is opened there, send
// API requests to the local Node server instead of asking Live Server for
// routes that it does not provide.
const API_ORIGIN =
  ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  window.location.port === '5500'
    ? 'http://127.0.0.1:5501'
    : '';
const W_URL = `${API_ORIGIN}/api/weather`;
const F_URL = `${API_ORIGIN}/api/forecast`;
const AQ_URL = `${API_ORIGIN}/api/aqi`;

// ===== DOM =====
const form = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const geoBtn = document.getElementById('geoBtn');
const cBtn = document.getElementById('cBtn');
const fBtn = document.getElementById('fBtn');
const themeToggle = document.getElementById('themeToggle');

const placeEl = document.getElementById('place');
const descEl = document.getElementById('desc');
const tempEl = document.getElementById('temp');
const feelsEl = document.getElementById('feels');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const visibilityEl = document.getElementById('visibility');
const pressureEl = document.getElementById('pressure');
const rainEl = document.getElementById('rain');
const iconEl = document.getElementById('icon');
const aqiBox = document.getElementById('aqiBox');
const aqiText = document.getElementById('aqiText');
const tipsEl = document.getElementById('tips');
const statusEl = document.getElementById('status');

const forecastEl = document.getElementById('forecast');

// ===== STATE =====
let units = localStorage.getItem('ns_units') || 'metric'; // metric/imperial
let theme = localStorage.getItem('ns_theme') || 'dark';

// ===== HELPERS =====
const kph = ms => (ms*3.6).toFixed(0);
const mph = ms => (ms*2.23694).toFixed(0);
const km  = m  => (m/1000).toFixed(1);

function setUnitButtons(){
  const m = units==='metric';
  cBtn.classList.toggle('active', m);
  fBtn.classList.toggle('active', !m);
  cBtn.setAttribute('aria-pressed', m);
  fBtn.setAttribute('aria-pressed', !m);
}

function applyTheme(t){
  document.documentElement.classList.toggle('light', t === 'light');
  document.body.classList.toggle('light', t === 'light');
  themeToggle.textContent = t === 'light' ? '🌞' : '🌙';
  localStorage.setItem('ns_theme', t);
  theme = t;
}

// AQI helpers
function aqiLabel(aqi){
  const map = {1:['Good','good'],2:['Fair','warn'],3:['Moderate','warn'],4:['Poor','bad'],5:['Very Poor','bad']};
  return map[aqi] || ['—','good'];
}

// tips
function tipGen({tempC, main, pop, aqi}){
  const tips = [];
  if(pop>=50) tips.push('High rain chance — carry an umbrella.');
  if(main==='Clear' && tempC>30) tips.push('Strong sun — wear sunscreen & stay hydrated.');
  if(main==='Snow' || tempC<8) tips.push('Cold conditions — layer up and keep warm.');
  if(['Mist','Haze','Fog','Smoke'].includes(main)) tips.push('Low visibility — drive carefully.');
  if(aqi>=4) tips.push('Air quality is poor — consider a mask and limit outdoor activity.');
  if(tips.length===0) tips.push('Weather looks pleasant — enjoy your day!');
  return tips;
}

// simple fetch wrapper
async function getJSON(url){
  const res = await fetch(url);
  if(!res.ok){
    const t = await res.text().catch(()=>res.statusText);
    throw new Error(t || 'Request failed');
  }
  return res.json();
}

// ===== RENDERING =====
function renderCurrent(w, pop, aqi) {
  const { name, sys, weather, main, wind, visibility } = w;
  const cond = weather?.[0] || { main:'Clear', description:'clear sky', icon:'01d' };

  placeEl.textContent = `${name}, ${sys?.country||''}`.replace(/,\s$/, '');
  descEl.textContent = cond.description;
  const isMetric = units==='metric';
  tempEl.textContent = `${Math.round(main.temp)}°${isMetric?'C':'F'}`;
  feelsEl.textContent = `${Math.round(main.feels_like)}°${isMetric?'C':'F'}`;
  humidityEl.textContent = `${main.humidity}%`;
  windEl.textContent = isMetric ? `${kph(wind.speed)} km/h` : `${mph(wind.speed)} mph`;
  visibilityEl.textContent = visibility ? `${km(visibility)} km` : '—';
  pressureEl.textContent = `${main.pressure} hPa`;
  rainEl.textContent = `${pop}%`;

  const icon = cond.icon || '01d';
  iconEl.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
  iconEl.alt = cond.description || 'Weather icon';

  // AQI
  const [label, cls] = aqiLabel(aqi);
  aqiBox.classList.remove('good','warn','bad'); aqiBox.classList.add(cls);
  aqiText.textContent = `AQI ${aqi||'—'} • ${label}`;

  // tips
  const tempC = isMetric ? main.temp : (main.temp-32)*5/9;
  const tips = tipGen({ tempC, main: cond.main, pop, aqi });
  tipsEl.innerHTML = tips.map(t=>`<div class="tip">${t}</div>`).join('');

  // set particles by main cond (particles.js exposes setFxMode)
  if(window.setFxMode) window.setFxMode(cond.main);

  statusEl.textContent = '';
}

// Forecast rendering - group 3h data to daily and draw small sparkline canvas
function renderForecast(forecastData){
  // forecastData.list contains 3h entries
  // group by calendar day
  const days = {};
  forecastData.list.forEach(item=>{
    const d = new Date(item.dt * 1000);
    const dayKey = d.toISOString().slice(0,10);
    if(!days[dayKey]) days[dayKey] = [];
    days[dayKey].push(item);
  });

  // convert to array and take next 5 days
  const dayKeys = Object.keys(days).slice(0,5);
  forecastEl.innerHTML = '';

  dayKeys.forEach(key=>{
    const items = days[key];
    // compute day summary: avg temp, min, max, icon (most frequent)
    let sum = 0, cnt = 0, min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
    const iconCount = {};
    const temps = [];
    items.forEach(it=>{
      const t = it.main.temp;
      sum += t; cnt++;
      temps.push(t);
      if(t < min) min = t;
      if(t > max) max = t;
      const ic = it.weather[0].icon;
      iconCount[ic] = (iconCount[ic] || 0) + 1;
    });
    const avg = sum/cnt;
    const icon = Object.keys(iconCount).reduce((a,b)=> iconCount[a] > iconCount[b] ? a : b);

    // create card
    const dObj = new Date(key);
    const dayName = dObj.toLocaleDateString(undefined, { weekday:'short' });
    const card = document.createElement('div');
    card.className = 'forecast-card fade';
    card.innerHTML = `
      <div class="fc-day">${dayName}</div>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="" width="48" height="48">
      <div class="fc-temp">${Math.round(avg)}°${units==='metric'?'C':'F'}</div>
      <canvas class="spark" data-temps='${JSON.stringify(temps)}'></canvas>
      <div class="muted" style="font-size:12px">Min ${Math.round(min)} / Max ${Math.round(max)}</div>
    `;
    forecastEl.appendChild(card);

    // draw sparkline
    const canvas = card.querySelector('canvas.spark');
    drawSpark(canvas, temps);
  });
}

// draws a tiny sparkline into provided canvas with temp array
function drawSpark(canvas, values){
  if(!values || values.length===0) return;
  const w = canvas.clientWidth || 120;
  const h = canvas.clientHeight || 28;
  canvas.width = Math.floor(w*devicePixelRatio);
  canvas.height = Math.floor(h*devicePixelRatio);
  canvas.style.width = w+'px';
  canvas.style.height = h+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // normalize
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 4;
  const step = (w - pad*2) / (values.length - 1 || 1);

  // line
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7aa2ff';
  values.forEach((v,i)=>{
    const x = pad + i*step;
    const y = h - pad - ((v - min) / Math.max((max-min),0.0001)) * (h - pad*2);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // small dots
  ctx.fillStyle = ctx.strokeStyle;
  values.forEach((v,i)=>{
    const x = pad + i*step;
    const y = h - pad - ((v - min) / Math.max((max-min),0.0001)) * (h - pad*2);
    ctx.beginPath();
    ctx.arc(x,y,2,0,Math.PI*2);
    ctx.fill();
  });
}

// ===== FETCHING =====
async function fetchAllByCity(city){
  statusEl.textContent = 'Loading…';
  const url = `${W_URL}?q=${encodeURIComponent(city)}&units=${units}`;
  const w = await getJSON(url);
  const { lon, lat } = w.coord;

  // forecast for 5-day
  const f = await getJSON(`${F_URL}?lat=${lat}&lon=${lon}&units=${units}`);
  // forecast pop (next 3h)
  const next = f.list && f.list[0];
  const pop = next ? Math.round((next.pop||0)*100) : 0;

  // AQI
  const a = await getJSON(`${AQ_URL}?lat=${lat}&lon=${lon}`);
  const aqi = a.list && a.list[0] ? a.list[0].main.aqi : 0;

  return { w, pop, aqi, f };
}

// search handler
async function search(city){
  try{
    const { w, pop, aqi, f } = await fetchAllByCity(city);
    renderCurrent(w, pop, aqi);
    renderForecast(f);
    localStorage.setItem('ns_last_city', city);
  }catch(err){
    statusEl.textContent = '';
    alert('Error: '+(err.message||err));
  }
}

// geolocation
geoBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation) return alert('Geolocation not supported');
  statusEl.textContent = 'Detecting location…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const { latitude:lat, longitude:lon } = pos.coords;
      const w = await getJSON(`${W_URL}?lat=${lat}&lon=${lon}&units=${units}`);
      // small fetch for forecast & aqi
      const f = await getJSON(`${F_URL}?lat=${lat}&lon=${lon}&units=${units}`);
      const a = await getJSON(`${AQ_URL}?lat=${lat}&lon=${lon}`);
      const aqi = a.list && a.list[0] ? a.list[0].main.aqi : 0;
      const next = f.list && f.list[0];
      const pop = next ? Math.round((next.pop||0)*100) : 0;
      renderCurrent(w, pop, aqi);
      renderForecast(f);
      localStorage.setItem('ns_last_city', w.name);
    }catch(e){ alert('Location fetch failed'); statusEl.textContent=''; }
  }, ()=>{ alert('Permission denied'); statusEl.textContent=''; });
});

// form submit
form.addEventListener('submit', e=>{
  e.preventDefault();
  const c = cityInput.value.trim();
  if(c) search(c);
});

// unit toggles
cBtn.addEventListener('click', ()=>{
  if(units!=='metric'){ units='metric'; localStorage.setItem('ns_units',units); setUnitButtons(); const last = localStorage.getItem('ns_last_city'); if(last) search(last); }
});
fBtn.addEventListener('click', ()=>{
  if(units!=='imperial'){ units='imperial'; localStorage.setItem('ns_units',units); setUnitButtons(); const last = localStorage.getItem('ns_last_city'); if(last) search(last); }
});

// theme toggle
themeToggle.addEventListener('click', ()=>{
  const next = (theme === 'dark') ? 'light' : 'dark';
  applyTheme(next);
});

// init
(function init(){
  setUnitButtons();
  applyTheme(localStorage.getItem('ns_theme') || 'dark');
  const last = localStorage.getItem('ns_last_city') || 'London';
  cityInput.value = last;
  search(last);
})();
