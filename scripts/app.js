/* ============================================
   AquaAlert AI — v3.0
   ============================================ */

const CONFIG = {
  openweather: {
    key: localStorage.getItem('aq_ow_key') || '',
    url: 'https://api.openweathermap.org/data/2.5/weather',
    forecastUrl: 'https://api.openweathermap.org/data/2.5/forecast'
  },
  anthropic: { model: 'claude-sonnet-4-6' }
};

const state = {
  weather: null, forecast: null, floodRisk: null, waterRisk: null, city: '',
  historyTemp: [], historyHumidity: [], historyLabels: [],
  forecastTemps: [], forecastLabels: [],
  charts: {}, chatHistory: [],
  currentWeather: null, currentFlood: null, currentWater: null
};

/* ── CITY PROFILE DATABASE ────────────────── */
const CITY_PROFILES = {
  mumbai:    { tag: '🌊', traits: ['monsoon flooding', 'coastal proximity', 'dense urban drainage', 'transport vulnerability'], state: 'Maharashtra', type: 'coastal megacity' },
  chennai:   { tag: '🌧️', traits: ['urban waterlogging', 'heavy seasonal rainfall', 'drainage infrastructure stress', 'coastal flood risk'], state: 'Tamil Nadu', type: 'coastal metro' },
  hyderabad: { tag: '🌡️', traits: ['heat wave exposure', 'water demand pressure', 'rapid urban expansion', 'lake encroachment'], state: 'Telangana', type: 'inland tech hub' },
  kolkata:   { tag: '🌊', traits: ['river flooding', 'waterlogging risk', 'low-lying topography', 'monsoon vulnerability'], state: 'West Bengal', type: 'riverside megacity' },
  delhi:     { tag: '🏙️', traits: ['heat island effect', 'groundwater depletion', 'air quality concerns', 'flash flood risk'], state: 'NCT', type: 'inland capital' },
  bangalore: { tag: '💧', traits: ['lake depletion', 'IT district flood risk', 'rapid urbanisation', 'water supply pressure'], state: 'Karnataka', type: 'tech corridor city' },
  pune:      { tag: '🌧️', traits: ['dam overflow risk', 'monsoon flash floods', 'urban sprawl', 'river bank vulnerability'], state: 'Maharashtra', type: 'river basin city' },
  jakarta:   { tag: '🌊', traits: ['chronic flooding', 'land subsidence', 'coastal inundation', 'extreme monsoon risk'], state: null, type: 'delta megacity' },
  miami:     { tag: '🌀', traits: ['hurricane flood risk', 'sea level rise', 'storm surge vulnerability', 'coastal infrastructure stress'], state: 'Florida', type: 'coastal resort city' },
  lagos:     { tag: '🌧️', traits: ['severe urban flooding', 'coastal erosion', 'drainage overload', 'informal settlement risk'], state: null, type: 'coastal megacity' },
  dhaka:     { tag: '🌊', traits: ['riverine flooding', 'monsoon inundation', 'delta vulnerability', 'urban drainage failure'], state: null, type: 'delta capital' },
  bangkok:   { tag: '🌧️', traits: ['annual flooding', 'river overflow', 'subsidence risk', 'storm drain overload'], state: null, type: 'river delta city' },
};

/* ── DOM READY ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroSearch();
  initConfigModal();
  initDashboardCharts();
  initChatbot();
  checkApiKeys();
});

/* ── NAVBAR ──────────────────────────────── */
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
  });
  document.getElementById('open-config')?.addEventListener('click', showConfigModal);
}

function scrollToHero(e) {
  e?.preventDefault();
  document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
}

/* ── HERO SEARCH ─────────────────────────── */
function initHeroSearch() {
  document.getElementById('analyze-btn')?.addEventListener('click', triggerAnalysis);
  document.getElementById('city-input')?.addEventListener('keypress', e => { if (e.key === 'Enter') triggerAnalysis(); });
  document.querySelectorAll('.hero-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.getElementById('city-input').value = tag.textContent.trim();
      triggerAnalysis();
    });
  });
}

async function triggerAnalysis() {
  const input = document.getElementById('city-input');
  const city = input?.value.trim();
  if (!city) { showError('Please enter a city name.'); return; }
  if (!CONFIG.openweather.key) { showConfigModal(); return; }
  state.city = city;
  await fetchWeatherAndAnalyze(city);
}

/* ── MAIN FETCH ──────────────────────────── */
async function fetchWeatherAndAnalyze(city) {
  setLoadingState(true);
  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${CONFIG.openweather.url}?q=${encodeURIComponent(city)}&appid=${CONFIG.openweather.key}&units=metric`),
      fetch(`${CONFIG.openweather.forecastUrl}?q=${encodeURIComponent(city)}&appid=${CONFIG.openweather.key}&units=metric&cnt=16`)
    ]);

    if (!currentRes.ok) {
      if (currentRes.status === 404) throw new Error(`City "${city}" not found. Check spelling and try again.`);
      if (currentRes.status === 401) throw new Error('Invalid OpenWeather API key. Please reconfigure in navbar.');
      throw new Error(`Weather service error (${currentRes.status}).`);
    }

    const data = await currentRes.json();
    const forecastData = forecastRes.ok ? await forecastRes.json() : null;
    state.weather = data;
    state.forecast = forecastData;

    const w = {
      city: data.name, country: data.sys.country,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: (data.wind.speed * 3.6).toFixed(1),
      windSpeedMs: data.wind.speed,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      visibility: data.visibility ? (data.visibility / 1000).toFixed(1) : 'N/A',
      clouds: data.clouds.all
    };

    // History
    const now = new Date();
    const timeLabel = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    state.historyTemp.push(w.temp); state.historyHumidity.push(w.humidity); state.historyLabels.push(timeLabel);
    if (state.historyTemp.length > 8) { state.historyTemp.shift(); state.historyHumidity.shift(); state.historyLabels.shift(); }

    if (forecastData?.list) {
      state.forecastTemps = forecastData.list.slice(0, 8).map(f => Math.round(f.main.temp));
      state.forecastLabels = forecastData.list.slice(0, 8).map(f => new Date(f.dt * 1000).getHours() + ':00');
    }

    const floodRisk = computeFloodRisk(w);
    const waterRisk = computeWaterRisk(w);
    const confidence = computeConfidence(w);
    state.floodRisk = floodRisk; state.waterRisk = waterRisk;
    state.currentWeather = w; state.currentFlood = floodRisk; state.currentWater = waterRisk;

    // Render everything
    renderWeather(w);
    renderFloodRisk(floodRisk, w);
    renderWaterRisk(waterRisk, w);
    renderRiskExplanations(floodRisk, waterRisk, w);
    renderConfidenceScores(confidence);
    renderEmergencySeverity(floodRisk, waterRisk);
    renderCommunityImpact(floodRisk, waterRisk, w);
    renderFutureRiskForecast(forecastData, w);
    renderRiskSummary(floodRisk, waterRisk, w);
    renderCityMatters(floodRisk, waterRisk, w);
    renderRiskTimeline(forecastData, floodRisk, waterRisk, w);
    renderSustainabilityMetrics(floodRisk, waterRisk, w);
    refreshDashboard(w, floodRisk, waterRisk);

    // Show results + scroll
    const results = document.getElementById('results-container');
    results.classList.add('visible');
    setTimeout(() => {
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    // Update city matters title
    const titleEl = document.getElementById('city-matters-title');
    if (titleEl) titleEl.textContent = `Why This Matters For ${w.city}`;

    fetchAIRecommendations(w, floodRisk, waterRisk);

  } catch (err) {
    showError(err.message);
  } finally {
    setLoadingState(false);
  }
}

/* ── RISK LOGIC ──────────────────────────── */
function computeFloodRisk(w) {
  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(w.condition);
  const isHighWind = parseFloat(w.windSpeedMs) > 10;
  if (w.humidity > 80 && isRainy && isHighWind) return { level: 'HIGH',   score: 0.90, color: '#ff4757', class: 'risk-high',   badge: 'badge-high'   };
  if (w.humidity > 80 && isRainy)               return { level: 'HIGH',   score: 0.78, color: '#ff4757', class: 'risk-high',   badge: 'badge-high'   };
  if (w.humidity > 60 || isRainy)               return { level: 'MEDIUM', score: 0.50, color: '#ffc107', class: 'risk-medium', badge: 'badge-medium' };
  return                                               { level: 'LOW',    score: 0.20, color: '#00e89a', class: 'risk-low',    badge: 'badge-low'    };
}

function computeWaterRisk(w) {
  if (w.temp > 35 && w.humidity < 35) return { level: 'CRITICAL', score: 0.88, color: '#ff4757', class: 'risk-critical', badge: 'badge-critical' };
  if (w.temp > 28)                    return { level: 'MODERATE', score: 0.55, color: '#ff6b35', class: 'risk-moderate', badge: 'badge-moderate' };
  return                                     { level: 'SAFE',     score: 0.15, color: '#00e89a', class: 'risk-safe',     badge: 'badge-safe'     };
}

function computeConfidence(w) {
  let f = 60;
  if (w.humidity > 50) f += 10;
  if (['Rain','Drizzle','Thunderstorm'].includes(w.condition)) f += 15;
  if (w.pressure < 1005) f += 8;
  if (w.clouds > 70) f += 7;
  let wat = 58;
  if (w.temp > 30) wat += 12;
  if (w.humidity < 40) wat += 10;
  if (w.condition === 'Clear') wat += 8;
  if (w.feelsLike > w.temp + 2) wat += 7;
  return { flood: Math.min(97, f), water: Math.min(97, wat) };
}

/* ── RENDER WEATHER ──────────────────────── */
function renderWeather(w) {
  const emojis = { Clear:'☀️', Clouds:'☁️', Rain:'🌧️', Drizzle:'🌦️', Thunderstorm:'⛈️', Snow:'❄️', Mist:'🌫️', Fog:'🌁', Haze:'🌫️', Smoke:'💨' };
  const emoji = emojis[w.condition] || '🌐';
  const header = document.getElementById('weather-city-header');
  if (header) header.innerHTML = `
    <span class="weather-city-name">${w.city}, ${w.country}</span>
    <span class="weather-condition-badge">${emoji} ${w.description}</span>
    <span class="weather-timestamp">Updated ${new Date().toLocaleTimeString()}</span>
  `;
  const grid = document.getElementById('weather-cards-grid');
  if (grid) {
    grid.innerHTML = [
      { icon:'🌡️', value:`${w.temp}°C`,   label:'Temperature',   sub:`Feels ${w.feelsLike}°C` },
      { icon:'💧', value:`${w.humidity}%`, label:'Humidity',      sub:'' },
      { icon:'💨', value:`${w.windSpeed}`, label:'Wind km/h',     sub:'' },
      { icon:'🔵', value:`${w.pressure}`,  label:'Pressure hPa',  sub:'' },
      { icon:'☁️', value:`${w.clouds}%`,   label:'Cloud Cover',   sub:'' },
      { icon:'👁️', value:`${w.visibility}`,label:'Visibility km', sub:'' },
    ].map((c, i) => `
      <div class="glass-card weather-card fade-in-card" style="animation-delay:${i * 0.07}s">
        <span class="weather-card-icon">${c.icon}</span>
        <div class="weather-card-value">${c.value}</div>
        <div class="weather-card-label">${c.label}</div>
        ${c.sub ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px">${c.sub}</div>` : ''}
      </div>
    `).join('');
  }
}

/* ── RENDER RISK CARDS ───────────────────── */
function renderFloodRisk(risk, w) {
  const el = document.getElementById('flood-risk-card');
  if (!el) return;
  const offset = 283 - (283 * risk.score);
  el.innerHTML = `
    <div class="risk-card-title">🌊 Flood Risk Assessment</div>
    <div class="risk-gauge-container">
      <div class="risk-ring">
        <svg viewBox="0 0 100 100"><circle class="risk-ring-bg" cx="50" cy="50" r="45"/>
          <circle class="risk-ring-fill" cx="50" cy="50" r="45" style="stroke:${risk.color};stroke-dashoffset:${offset};filter:drop-shadow(0 0 6px ${risk.color})"/></svg>
        <div class="risk-ring-text">
          <span class="risk-level-label ${risk.class}" style="font-size:0.75rem">${risk.level}</span>
          <span class="risk-level-sub">Flood</span>
        </div>
      </div>
      <div class="risk-details">
        <div class="risk-detail-row"><span class="risk-detail-label">Humidity</span><span class="risk-detail-value">${w.humidity}%</span></div>
        <div class="risk-detail-row"><span class="risk-detail-label">Condition</span><span class="risk-detail-value">${w.condition}</span></div>
        <div class="risk-detail-row"><span class="risk-detail-label">Wind Speed</span><span class="risk-detail-value">${w.windSpeed} km/h</span></div>
        <div class="risk-detail-row"><span class="risk-detail-label">Risk Score</span><span class="risk-detail-value ${risk.class}">${Math.round(risk.score * 100)}%</span></div>
      </div>
    </div>`;
}

function renderWaterRisk(risk, w) {
  const el = document.getElementById('water-risk-card');
  if (!el) return;
  const offset = 283 - (283 * risk.score);
  el.innerHTML = `
    <div class="risk-card-title">🏜️ Water Scarcity Assessment</div>
    <div class="risk-gauge-container">
      <div class="risk-ring">
        <svg viewBox="0 0 100 100"><circle class="risk-ring-bg" cx="50" cy="50" r="45"/>
          <circle class="risk-ring-fill" cx="50" cy="50" r="45" style="stroke:${risk.color};stroke-dashoffset:${offset};filter:drop-shadow(0 0 6px ${risk.color})"/></svg>
        <div class="risk-ring-text">
          <span class="risk-level-label ${risk.class}" style="font-size:0.7rem">${risk.level}</span>
          <span class="risk-level-sub">Water</span>
        </div>
      </div>
      <div class="risk-details">
        <div class="risk-detail-row"><span class="risk-detail-label">Temperature</span><span class="risk-detail-value">${w.temp}°C</span></div>
        <div class="risk-detail-row"><span class="risk-detail-label">Humidity</span><span class="risk-detail-value">${w.humidity}%</span></div>
        <div class="risk-detail-row"><span class="risk-detail-label">Condition</span><span class="risk-detail-value">${w.condition}</span></div>
        <div class="risk-detail-row"><span class="risk-detail-label">Risk Score</span><span class="risk-detail-value ${risk.class}">${Math.round(risk.score * 100)}%</span></div>
      </div>
    </div>`;
}

/* ── EXPLAINABLE AI ──────────────────────── */
function renderRiskExplanations(flood, water, w) {
  const isRainy = ['Rain','Drizzle','Thunderstorm'].includes(w.condition);
  const fFactors = [
    w.humidity > 80 ? { yes:true,  text:`Humidity critically high at ${w.humidity}% (threshold: 80%)` }
                    : w.humidity > 60 ? { yes:true, text:`Humidity elevated at ${w.humidity}% (threshold: 60%)` }
                    : { yes:false, text:`Humidity normal at ${w.humidity}% — not a flood trigger` },
    isRainy ? { yes:true, text:`Active precipitation: ${w.condition}` }
            : { yes:false, text:`No active rainfall — condition is ${w.condition}` },
    w.windSpeedMs > 10 ? { yes:true, text:`High wind ${w.windSpeed} km/h indicates atmospheric instability` }
                       : { yes:false, text:`Wind ${w.windSpeed} km/h within safe range` },
    w.clouds > 70 ? { yes:true, text:`Heavy cloud cover ${w.clouds}% — incoming rainfall likely` }
                  : { yes:false, text:`Cloud cover ${w.clouds}% — sky mostly clear` },
    ...(w.pressure < 1005 ? [{ yes:true, text:`Low pressure ${w.pressure} hPa — storm conditions possible` }] : [])
  ];
  const wFactors = [
    w.temp > 35 ? { yes:true, text:`Temperature critically high at ${w.temp}°C (threshold: 35°C)` }
               : w.temp > 28 ? { yes:true, text:`Temperature elevated at ${w.temp}°C — increased evaporation` }
               : { yes:false, text:`Temperature ${w.temp}°C within safe range` },
    w.humidity < 35 ? { yes:true, text:`Very low humidity ${w.humidity}% — high water evaporation stress` }
                    : w.humidity < 50 ? { yes:true, text:`Moderate humidity ${w.humidity}% — some evaporation pressure` }
                    : { yes:false, text:`Humidity ${w.humidity}% — moisture levels adequate` },
    ...(w.condition === 'Clear' ? [{ yes:true, text:`Clear sky — maximum solar intensity, driving water loss` }] : []),
    ...(w.feelsLike > w.temp + 2 ? [{ yes:true, text:`Feels like ${w.feelsLike}°C — heat index elevated` }] : [])
  ];

  const factorHTML = fs => fs.map((f, i) => `
    <div class="explanation-factor ${f.yes ? 'factor-yes' : 'factor-no'}" style="animation-delay:${i*0.07}s">
      <span class="factor-icon">${f.yes ? '✓' : '○'}</span><span>${f.text}</span>
    </div>`).join('');

  const el = document.getElementById('risk-explanations');
  if (!el) return;
  el.innerHTML = `
    <div class="explanation-grid">
      <div class="explanation-card glass-card">
        <div class="explanation-title">🌊 Why Flood Risk = <span class="${flood.class}">${flood.level}</span>?</div>
        <div class="explanation-factors">${factorHTML(fFactors)}</div>
        <div class="explanation-verdict"><span class="verdict-label">Model Verdict:</span>${getFloodVerdict(flood.level,w)}</div>
      </div>
      <div class="explanation-card glass-card">
        <div class="explanation-title">🏜️ Why Water Scarcity = <span class="${water.class}">${water.level}</span>?</div>
        <div class="explanation-factors">${factorHTML(wFactors)}</div>
        <div class="explanation-verdict"><span class="verdict-label">Model Verdict:</span>${getWaterVerdict(water.level,w)}</div>
      </div>
    </div>`;
}

function getFloodVerdict(l, w) {
  if (l==='HIGH')   return `Combined moisture saturation (${w.humidity}% humidity), active precipitation, and wind instability create high flood probability.`;
  if (l==='MEDIUM') return `Elevated humidity or precipitation present — conducive but not yet at critical threshold.`;
  return `Current atmospheric conditions do not indicate significant flood risk.`;
}
function getWaterVerdict(l, w) {
  if (l==='CRITICAL') return `Extreme heat (${w.temp}°C) with very low humidity (${w.humidity}%) signals severe water evaporation stress.`;
  if (l==='MODERATE') return `Above-average temperatures increasing evaporation demand and reservoir pressure.`;
  return `Temperature and humidity within safe bounds — water availability not threatened.`;
}

/* ── CONFIDENCE SCORES ───────────────────── */
function renderConfidenceScores(conf) {
  const el = document.getElementById('confidence-section');
  if (!el) return;
  el.innerHTML = `
    <div class="confidence-grid">
      <div class="confidence-item">
        <div class="confidence-header">
          <span class="confidence-label">🌊 Flood Prediction Confidence</span>
          <span class="confidence-value">${conf.flood}%</span>
        </div>
        <div class="confidence-bar-wrap"><div class="confidence-bar" style="--target-width:${conf.flood}%;background:${conf.flood>75?'#00e89a':conf.flood>55?'#ffc107':'#ff6b35'}"></div></div>
        <div class="confidence-desc">${getConfidenceDesc(conf.flood)}</div>
      </div>
      <div class="confidence-item">
        <div class="confidence-header">
          <span class="confidence-label">🏜️ Water Scarcity Confidence</span>
          <span class="confidence-value">${conf.water}%</span>
        </div>
        <div class="confidence-bar-wrap"><div class="confidence-bar" style="--target-width:${conf.water}%;background:${conf.water>75?'#00e89a':conf.water>55?'#ffc107':'#ff6b35'}"></div></div>
        <div class="confidence-desc">${getConfidenceDesc(conf.water)}</div>
      </div>
    </div>`;
  requestAnimationFrame(() => el.querySelectorAll('.confidence-bar').forEach(b => b.classList.add('animate')));
}
function getConfidenceDesc(s) {
  if (s>=85) return 'High confidence — multiple strong indicators aligned';
  if (s>=70) return 'Good confidence — key thresholds met';
  if (s>=55) return 'Moderate confidence — some indicators present';
  return 'Lower confidence — conditions are borderline';
}

/* ── EMERGENCY SEVERITY ──────────────────── */
function renderEmergencySeverity(flood, water) {
  const el = document.getElementById('emergency-severity');
  if (!el) return;
  const combined = Math.max(flood.score, water.score);
  let level, color, icon, title, message, pulseClass;
  if (combined>=0.75) { level='HIGH ALERT'; color='#ff4757'; icon='🔴'; title='Take Immediate Precautions'; message='Significant environmental risk detected. Follow official emergency guidance.'; pulseClass='pulse-red'; }
  else if (combined>=0.50) { level='ALERT'; color='#ff6b35'; icon='🟠'; title='Potential Disruption Possible'; message='Elevated risk conditions. Monitor local authorities and keep emergency supplies accessible.'; pulseClass='pulse-amber'; }
  else if (combined>=0.30) { level='BE PREPARED'; color='#ffc107'; icon='🟡'; title='Monitor Local Conditions'; message='Low-level risk detected. Stay informed and review your emergency kit.'; pulseClass='pulse-yellow'; }
  else { level='SAFE'; color='#00e89a'; icon='🟢'; title='No Immediate Action Required'; message='Environmental conditions are within normal range.'; pulseClass='pulse-green'; }
  el.innerHTML = `
    <div class="severity-card glass-card">
      <div class="severity-header">
        <div class="severity-badge ${pulseClass}" style="border-color:${color};color:${color}"><span class="severity-dot" style="background:${color}"></span>${icon} ${level}</div>
        <div class="severity-title">${title}</div>
      </div>
      <div class="severity-message">${message}</div>
      <div class="severity-actions">${getSeverityActions(level)}</div>
    </div>`;
}
function getSeverityActions(level) {
  const a = {
    'HIGH ALERT':   ['Evacuate flood-prone areas if ordered','Contact emergency services if in danger','Do not enter floodwaters','Disconnect electrical appliances'],
    'ALERT':        ['Prepare emergency supply bag','Monitor official weather channels','Move valuables to higher ground','Keep vehicle fuel topped up'],
    'BE PREPARED':  ['Review emergency contact list','Check drainage around property','Keep phone charged','Monitor weather apps'],
    'SAFE':         ['Maintain water conservation habits','Keep emergency kit updated','Stay weather-aware','Practice sustainability']
  };
  return (a[level]||a['SAFE']).map(x=>`<div class="severity-action"><span style="color:var(--cyan)">→</span> ${x}</div>`).join('');
}

/* ── COMMUNITY IMPACT ────────────────────── */
function renderCommunityImpact(flood, water, w) {
  const el = document.getElementById('community-impact');
  if (!el) return;
  const fI = getFloodImpacts(flood.level, w);
  const wI = getWaterImpacts(water.level, w);
  el.innerHTML = `
    <div class="impact-grid">
      <div class="impact-card glass-card">
        <div class="impact-card-header"><span class="impact-icon">🌊</span><div><div class="impact-card-title">Flood Risk Impact</div><div class="impact-card-sub">Based on ${flood.level} flood risk</div></div></div>
        <div class="impact-list">${fI.map(i=>`<div class="impact-item"><span class="impact-dot" style="background:${i.color}"></span><div><div class="impact-item-title">${i.title}</div><div class="impact-item-desc">${i.desc}</div></div></div>`).join('')}</div>
      </div>
      <div class="impact-card glass-card">
        <div class="impact-card-header"><span class="impact-icon">🏜️</span><div><div class="impact-card-title">Water Scarcity Impact</div><div class="impact-card-sub">Based on ${water.level} water scarcity</div></div></div>
        <div class="impact-list">${wI.map(i=>`<div class="impact-item"><span class="impact-dot" style="background:${i.color}"></span><div><div class="impact-item-title">${i.title}</div><div class="impact-item-desc">${i.desc}</div></div></div>`).join('')}</div>
      </div>
    </div>`;
}
function getFloodImpacts(l, w) {
  if (l==='HIGH') return [
    {title:'Traffic & Transport',desc:'Roads may be waterlogged. Significant disruption to commutes and public transport.',color:'#ff4757'},
    {title:'Infrastructure Risk',desc:'Underground systems, electrical installations, and drainage under pressure.',color:'#ff4757'},
    {title:'Emergency Services',desc:'Emergency response teams likely on standby.',color:'#ffc107'},
    {title:'Economic Impact',desc:'Business operations may be disrupted. Secure property and documents.',color:'#ffc107'}
  ];
  if (l==='MEDIUM') return [
    {title:'Minor Waterlogging',desc:'Low-lying streets may experience temporary waterlogging.',color:'#ffc107'},
    {title:'Travel Advisory',desc:'Allow extra travel time. Avoid underpasses and riverside roads.',color:'#ffc107'},
    {title:'Drainage Systems',desc:'Municipal drainage under moderate stress.',color:'#00d4ff'},
    {title:'Community Awareness',desc:'Neighbourhoods near water bodies should stay alert.',color:'#00d4ff'}
  ];
  return [
    {title:'Normal Conditions',desc:'No significant flood-related disruption expected.',color:'#00e89a'},
    {title:'Routine Precautions',desc:'Maintain clear gutters and drainage channels.',color:'#00e89a'},
    {title:'Green Opportunity',desc:'Good conditions for community greening initiatives.',color:'#00e89a'}
  ];
}
function getWaterImpacts(l, w) {
  if (l==='CRITICAL') return [
    {title:'Reservoir Pressure',desc:'Water storage under stress. Rationing possible in vulnerable areas.',color:'#ff4757'},
    {title:'Agriculture Impact',desc:`At ${w.temp}°C, crop irrigation demand is critically elevated.`,color:'#ff4757'},
    {title:'Public Health Risk',desc:'Heat stress risk for elderly, children, outdoor workers.',color:'#ff4757'},
    {title:'Industrial Usage',desc:'Manufacturing and cooling systems using higher water volumes.',color:'#ffc107'}
  ];
  if (l==='MODERATE') return [
    {title:'Increased Demand',desc:`Temperature at ${w.temp}°C driving higher consumption.`,color:'#ffc107'},
    {title:'Conservation Needed',desc:'Community-wide conservation can prevent escalation.',color:'#ffc107'},
    {title:'Garden & Agriculture',desc:'Schedule irrigation for cooler morning hours only.',color:'#00d4ff'}
  ];
  return [
    {title:'Stable Water Supply',desc:'Current conditions support adequate water availability.',color:'#00e89a'},
    {title:'Proactive Conservation',desc:'Ideal time to adopt water-saving habits.',color:'#00e89a'},
    {title:'Green Infrastructure',desc:'Conditions support rainwater harvesting projects.',color:'#00e89a'}
  ];
}

/* ── FUTURE RISK FORECAST ────────────────── */
function renderFutureRiskForecast(forecastData, w) {
  const el = document.getElementById('future-forecast');
  if (!el) return;
  if (!forecastData?.list) { el.innerHTML = `<div style="color:var(--text-muted);font-size:0.875rem">Forecast unavailable — ensure OpenWeather API key is configured.</div>`; return; }
  const days = {};
  forecastData.list.forEach(item => {
    const d = new Date(item.dt*1000);
    const key = d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    if (!days[key]) days[key]={temps:[],humidities:[],conditions:[],winds:[]};
    days[key].temps.push(item.main.temp); days[key].humidities.push(item.main.humidity);
    days[key].conditions.push(item.weather[0].main); days[key].winds.push(item.wind.speed);
  });
  const entries = Object.entries(days).slice(0,5);
  const condEmoji = {Clear:'☀️',Clouds:'⛅',Rain:'🌧️',Drizzle:'🌦️',Thunderstorm:'⛈️',Snow:'❄️'};
  const timelineHTML = entries.map(([day,d],i) => {
    const avgT = Math.round(d.temps.reduce((a,b)=>a+b,0)/d.temps.length);
    const avgH = Math.round(d.humidities.reduce((a,b)=>a+b,0)/d.humidities.length);
    const avgW = d.winds.reduce((a,b)=>a+b,0)/d.winds.length;
    const isRainy = d.conditions.some(c=>['Rain','Drizzle','Thunderstorm'].includes(c));
    const fr = computeFloodRisk({temp:avgT,humidity:avgH,windSpeedMs:avgW,condition:isRainy?'Rain':d.conditions[0],clouds:50});
    const wr = computeWaterRisk({temp:avgT,humidity:avgH});
    const emoji = condEmoji[d.conditions[Math.floor(d.conditions.length/2)]]||'🌤️';
    return `<div class="forecast-day ${i===0?'forecast-day-today':''}">
      <div class="forecast-day-label">${i===0?'Today':day.split(',')[0]}</div>
      <div class="forecast-day-date">${day.split(',').slice(1).join(',').trim()}</div>
      <div class="forecast-day-emoji">${emoji}</div>
      <div class="forecast-day-temp">${avgT}°C</div>
      <div class="forecast-day-hum">💧 ${avgH}%</div>
      <div class="forecast-risk-row">
        <span class="mini-badge" style="background:${fr.color}22;color:${fr.color};border:1px solid ${fr.color}44">F:${fr.level}</span>
        <span class="mini-badge" style="background:${wr.color}22;color:${wr.color};border:1px solid ${wr.color}44">W:${wr.level}</span>
      </div>
    </div>`;
  }).join('');
  const scores = entries.map(([,d]) => computeFloodRisk({temp:Math.round(d.temps.reduce((a,b)=>a+b,0)/d.temps.length),humidity:Math.round(d.humidities.reduce((a,b)=>a+b,0)/d.humidities.length),windSpeedMs:d.winds.reduce((a,b)=>a+b,0)/d.winds.length,condition:d.conditions.some(c=>['Rain','Drizzle','Thunderstorm'].includes(c))?'Rain':'Clear'}).score);
  const trendDir = scores[scores.length-1] > scores[0]+0.1 ? '↑ Increasing' : scores[scores.length-1] < scores[0]-0.1 ? '↓ Decreasing' : '→ Stable';
  const trendColor = trendDir.startsWith('↑')?'#ff4757':trendDir.startsWith('↓')?'#00e89a':'#ffc107';
  el.innerHTML = `
    <div class="forecast-header">
      <div><div class="section-label">5-Day Risk Forecast</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:.25rem">Flood trend: <span style="color:${trendColor};font-weight:600">${trendDir}</span></div>
      </div>
    </div>
    <div class="forecast-timeline">${timelineHTML}</div>`;
}

/* ── NEW: RISK SUMMARY CARD ──────────────── */
function renderRiskSummary(flood, water, w) {
  const el = document.getElementById('risk-summary');
  if (!el) return;
  const combined = Math.max(flood.score, water.score);
  const overallLabel = combined >= 0.75 ? 'High Environmental Risk'
    : combined >= 0.5 ? 'Moderate Environmental Risk'
    : combined >= 0.3 ? 'Low-Moderate Risk'
    : 'Low Environmental Risk';
  const overallIcon = combined >= 0.75 ? '🔴' : combined >= 0.5 ? '🟠' : combined >= 0.3 ? '🟡' : '🟢';
  const overallColor = combined >= 0.75 ? '#ff4757' : combined >= 0.5 ? '#ff6b35' : combined >= 0.3 ? '#ffc107' : '#00e89a';
  const prepLevel = combined >= 0.75 ? 'High' : combined >= 0.5 ? 'Medium' : 'Standard';
  const rec = combined >= 0.75
    ? 'Take immediate precautions — evacuate if advised, avoid floodwaters, and follow emergency services.'
    : combined >= 0.5
    ? 'Stay alert, reduce unnecessary water consumption, and monitor local weather updates closely.'
    : 'Maintain standard precautions, conserve water, and stay informed through official channels.';

  el.innerHTML = `
    <div class="summary-card glass-card">
      <div class="summary-status" style="border-color:${overallColor}44">
        <div class="summary-status-icon" style="color:${overallColor}">${overallIcon}</div>
        <div>
          <div class="summary-status-label" style="color:${overallColor}">${overallLabel}</div>
          <div class="summary-city">${w.city}, ${w.country} · ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
        </div>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-item-label">🌊 Flood Risk</div>
          <div class="summary-item-value ${flood.class}">${flood.level}</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">🏜️ Water Scarcity</div>
          <div class="summary-item-value ${water.class}">${water.level}</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">🌡️ Temperature</div>
          <div class="summary-item-value">${w.temp}°C</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">💧 Humidity</div>
          <div class="summary-item-value">${w.humidity}%</div>
        </div>
      </div>
      <div class="summary-rec">
        <div class="summary-rec-label">📋 Recommendation</div>
        <div class="summary-rec-text">${rec}</div>
      </div>
      <div class="summary-footer">
        <span class="summary-prep">Preparedness Level: <strong style="color:${overallColor}">${prepLevel}</strong></span>
        <span class="summary-powered">Powered by AquaAlert AI</span>
      </div>
    </div>`;
}

/* ── NEW: WHY THIS MATTERS FOR YOUR CITY ── */
function renderCityMatters(flood, water, w) {
  const el = document.getElementById('city-matters');
  if (!el) return;
  const cityKey = w.city.toLowerCase().replace(/\s+/g,'');
  const profile = Object.keys(CITY_PROFILES).find(k => cityKey.includes(k)) 
    ? CITY_PROFILES[Object.keys(CITY_PROFILES).find(k => cityKey.includes(k))] 
    : null;

  const insights = getCityInsights(flood, water, w, profile);
  const tag = profile?.tag || '🏙️';
  const cityType = profile?.type || 'urban area';
  const traits = profile?.traits || getGenericTraits(flood, water, w);

  el.innerHTML = `
    <div class="city-matters-card glass-card">
      <div class="city-matters-header">
        <div class="city-tag-icon">${tag}</div>
        <div>
          <div class="city-matters-name">${w.city}</div>
          <div class="city-matters-type">${cityType}${profile?.state ? ` · ${profile.state}` : ''} · ${w.country}</div>
        </div>
        <div class="city-risk-pills">
          <span class="city-risk-pill" style="background:${flood.color}22;color:${flood.color};border:1px solid ${flood.color}44">Flood: ${flood.level}</span>
          <span class="city-risk-pill" style="background:${water.color}22;color:${water.color};border:1px solid ${water.color}44">Water: ${water.level}</span>
        </div>
      </div>
      <div class="city-matters-body">
        <p class="city-matters-intro">${insights.intro}</p>
        <div class="city-traits-grid">
          ${traits.map(t => `<div class="city-trait"><span class="city-trait-dot"></span>${t}</div>`).join('')}
        </div>
        <div class="city-matters-insights">
          ${insights.points.map(p => `
            <div class="city-insight-item">
              <span class="city-insight-icon">${p.icon}</span>
              <div>
                <div class="city-insight-title">${p.title}</div>
                <div class="city-insight-desc">${p.desc}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

function getCityInsights(flood, water, w, profile) {
  const city = state.currentWeather?.city || 'this city';
  const isHighFlood = flood.level === 'HIGH';
  const isHighWater = water.level === 'CRITICAL' || water.level === 'MODERATE';

  let intro = `Current environmental conditions indicate `;
  if (isHighFlood && isHighWater) intro += `compound flood and water stress in ${city}. Both flood vulnerability and water demand pressure require immediate community attention.`;
  else if (isHighFlood) intro += `elevated flood vulnerability in ${city}. With humidity at ${w.humidity}% and ${w.condition.toLowerCase()} conditions, proactive preparedness can reduce local disruption and improve community resilience.`;
  else if (isHighWater) intro += `water supply pressure in ${city}. Rising temperatures and evaporation rates are placing demand on local water resources.`;
  else intro += `stable environmental conditions in ${city}. This is an ideal time to invest in long-term climate resilience measures.`;

  const points = [];
  if (isHighFlood) {
    points.push({ icon:'🌊', title:'Urban Drainage Stress', desc:`With humidity at ${w.humidity}% and ${w.condition} conditions, urban drainage infrastructure is under elevated stress in ${city}.` });
    points.push({ icon:'🚗', title:'Transport Vulnerability', desc:`${flood.level === 'HIGH' ? 'Significant' : 'Moderate'} disruption to road networks and public transit is possible during heavy rainfall.` });
  }
  if (isHighWater) {
    points.push({ icon:'💧', title:'Water Demand Pressure', desc:`At ${w.temp}°C, household and industrial water demand in ${city} is elevated. Conservation measures can prevent shortfalls.` });
    points.push({ icon:'🌡️', title:'Heat Stress Exposure', desc:`A feels-like temperature of ${w.feelsLike}°C increases health risks for vulnerable residents — especially the elderly and children.` });
  }
  if (!isHighFlood && !isHighWater) {
    points.push({ icon:'✅', title:'Resilience Window', desc:`Stable conditions in ${city} present an opportunity to build flood and water resilience infrastructure before high-risk seasons.` });
    points.push({ icon:'🌱', title:'Sustainability Potential', desc:`Low-risk periods are ideal for community water harvesting, tree planting, and urban greening initiatives aligned with SDG 11.` });
  }
  points.push({ icon:'🏛️', title:'Policy Relevance', desc:`Environmental risk data from ${city} can inform local government disaster preparedness plans and urban planning decisions.` });

  return { intro, points };
}

function getGenericTraits(flood, water, w) {
  const traits = [];
  if (w.humidity > 70) traits.push('high atmospheric moisture levels');
  if (w.temp > 30) traits.push('elevated heat conditions');
  if (['Rain','Thunderstorm','Drizzle'].includes(w.condition)) traits.push('active precipitation');
  if (flood.level !== 'LOW') traits.push(`${flood.level.toLowerCase()} flood risk exposure`);
  if (water.level !== 'SAFE') traits.push(`${water.level.toLowerCase()} water scarcity conditions`);
  traits.push('urban environmental vulnerability');
  return traits.slice(0, 4);
}

/* ── NEW: RISK COMPARISON TIMELINE ──────── */
function renderRiskTimeline(forecastData, currentFlood, currentWater, w) {
  const el = document.getElementById('risk-timeline');
  if (!el) return;

  // Yesterday (simulated as slightly different based on current data)
  const yesterdayW = {
    temp: w.temp - Math.round(Math.random() * 4 + 1),
    humidity: Math.max(20, w.humidity - Math.round(Math.random() * 15)),
    windSpeedMs: Math.max(0, w.windSpeedMs - 1.5),
    condition: w.humidity > 70 ? w.condition : 'Clouds',
    clouds: Math.max(10, w.clouds - 20)
  };
  const yesterdayFlood = computeFloodRisk(yesterdayW);
  const yesterdayWater = computeWaterRisk(yesterdayW);

  // Tomorrow from forecast
  let tomorrowFlood = currentFlood, tomorrowWater = currentWater;
  if (forecastData?.list?.length >= 8) {
    const tmr = forecastData.list[7];
    const tmrW = { temp: Math.round(tmr.main.temp), humidity: tmr.main.humidity, windSpeedMs: tmr.wind.speed, condition: tmr.weather[0].main, clouds: tmr.clouds.all };
    tomorrowFlood = computeFloodRisk(tmrW);
    tomorrowWater = computeWaterRisk(tmrW);
  }

  const floodScores = [yesterdayFlood.score, currentFlood.score, tomorrowFlood.score];
  const waterScores = [yesterdayWater.score, currentWater.score, tomorrowWater.score];

  const floodTrend = floodScores[2] > floodScores[0] + 0.1 ? { label:'📈 Increasing Risk', color:'#ff4757' }
    : floodScores[2] < floodScores[0] - 0.1 ? { label:'📉 Decreasing Risk', color:'#00e89a' }
    : { label:'➡ Stable Risk', color:'#ffc107' };
  const waterTrend = waterScores[2] > waterScores[0] + 0.1 ? { label:'📈 Increasing Risk', color:'#ff4757' }
    : waterScores[2] < waterScores[0] - 0.1 ? { label:'📉 Improving', color:'#00e89a' }
    : { label:'➡ Stable', color:'#ffc107' };

  const timelineRow = (label, risks, trend) => `
    <div class="timeline-row">
      <div class="timeline-row-label">${label}</div>
      <div class="timeline-steps">
        ${['Yesterday','Today','Tomorrow'].map((day, i) => `
          <div class="timeline-step">
            <div class="timeline-step-day">${day}</div>
            <div class="timeline-node ${risks[i].class}" style="border-color:${risks[i].color};box-shadow:0 0 12px ${risks[i].color}44">
              <span style="color:${risks[i].color}">${risks[i].level}</span>
            </div>
            <div class="timeline-score" style="color:${risks[i].color}">${Math.round(risks[i].score*100)}%</div>
          </div>
          ${i < 2 ? `<div class="timeline-connector"><div class="timeline-arrow" style="background:${risks[i+1].score > risks[i].score ? '#ff4757' : risks[i+1].score < risks[i].score ? '#00e89a' : '#666'}">${risks[i+1].score > risks[i].score + 0.05 ? '↑' : risks[i+1].score < risks[i].score - 0.05 ? '↓' : '→'}</div></div>` : ''}
        `).join('')}
      </div>
      <div class="timeline-trend" style="color:${trend.color}">${trend.label}</div>
    </div>`;

  el.innerHTML = `
    <div class="timeline-card glass-card">
      <div class="timeline-disclaimer">
        <span>⚠ Yesterday's values are estimated from current conditions. Tomorrow uses OpenWeather forecast data.</span>
      </div>
      ${timelineRow('🌊 Flood Risk', [yesterdayFlood, currentFlood, tomorrowFlood], floodTrend)}
      <div style="height:1px;background:var(--border);margin:1.5rem 0"></div>
      ${timelineRow('🏜️ Water Risk', [yesterdayWater, currentWater, tomorrowWater], waterTrend)}
    </div>`;
}

/* ── SUSTAINABILITY METRICS ──────────────── */
function renderSustainabilityMetrics(flood, water, w) {
  const el = document.getElementById('sustainability-metrics');
  if (!el) return;
  const waterStress = water.level==='CRITICAL'?'High':water.level==='MODERATE'?'Medium':'Low';
  const floodVuln = flood.level==='HIGH'?'High':flood.level==='MEDIUM'?'Moderate':'Low';
  const resilienceScore = Math.round(100-(flood.score*40)-(water.score*40));
  const readiness = resilienceScore>=70?'Good':resilienceScore>=50?'Fair':'Needs Attention';
  const readinessColor = resilienceScore>=70?'#00e89a':resilienceScore>=50?'#ffc107':'#ff4757';
  const metrics = [
    {label:'Estimated Water Stress',value:waterStress,color:water.color},
    {label:'Urban Flood Vulnerability',value:floodVuln,color:flood.color},
    {label:'Climate Resilience Score',value:`${resilienceScore}%`,color:resilienceScore>=70?'#00e89a':'#ffc107',isScore:true,score:resilienceScore},
    {label:'Sustainability Readiness',value:readiness,color:readinessColor},
    {label:'Heat Index',value:`${w.feelsLike}°C`,color:w.feelsLike>38?'#ff4757':w.feelsLike>32?'#ffc107':'#00e89a'},
    {label:'Atmospheric Stability',value:w.pressure>1010?'Stable':w.pressure>1000?'Moderate':'Unstable',color:w.pressure>1010?'#00e89a':w.pressure>1000?'#ffc107':'#ff4757'}
  ];
  el.innerHTML = `<div class="metrics-grid">${metrics.map(m=>`
    <div class="metric-pill glass-card">
      <div class="metric-pill-label">${m.label}</div>
      <div class="metric-pill-value" style="color:${m.color}">${m.value}</div>
      ${m.isScore?`<div class="metric-mini-bar"><div class="metric-mini-fill" style="width:${m.score}%;background:${m.color}"></div></div>`:''}
    </div>`).join('')}</div>`;
}

/* ── AI RECOMMENDATIONS ──────────────────── */
async function fetchAIRecommendations(w, flood, water) {
  const container = document.getElementById('ai-content');
  if (!container) return;
  container.innerHTML = `<div class="ai-loading"><div class="ai-loading-dots"><span></span><span></span><span></span></div>Generating personalised sustainability recommendations…</div>`;
  const prompt = `You are an expert environmental sustainability advisor.

City: ${w.city}, ${w.country}
Temperature: ${w.temp}°C (feels ${w.feelsLike}°C), Humidity: ${w.humidity}%, Condition: ${w.condition}, Wind: ${w.windSpeed} km/h
Flood Risk: ${flood.level} (${Math.round(flood.score*100)}%), Water Scarcity: ${water.level} (${Math.round(water.score*100)}%)

Provide specific, location-aware advice in 5 sections:

### Flood Safety
3 actionable steps for ${flood.level} flood risk.

### Water Conservation
3 personalised suggestions for ${water.level} scarcity at ${w.temp}°C.

### Sustainability Actions
3 SDG-aligned recommendations (SDG 6, 11, or 13).

### Emergency Readiness
3 preparedness steps for current risk levels.

### Community Preparedness
2 longer-term resilience strategies.

Use numbered items (1. 2. 3.). Be specific — not generic.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({model:CONFIG.anthropic.model,max_tokens:1000,messages:[{role:'user',content:prompt}]})
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    renderAIContent(data.content?.find(b=>b.type==='text')?.text||'');
  } catch {
    renderAIContent(getBuiltinRecommendations(flood, water, w));
  }
}

function renderAIContent(text) {
  const container = document.getElementById('ai-content');
  if (!container) return;
  container.innerHTML = `<p>${text.replace(/### (.+)/g,'<h3>$1</h3>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>').replace(/<p><\/p>/g,'')}</p>`;
}

function getBuiltinRecommendations(flood, water, w) {
  const fTips = {
    HIGH: '1. Move valuables above floor level and seal entry points with sandbags if available.\n2. Identify the nearest evacuation route — ensure all household members know the plan.\n3. Disconnect non-essential electrical appliances and avoid all contact with floodwater.',
    MEDIUM: '1. Clear gutters and drains around your property to maximise drainage.\n2. Avoid travelling through underpasses or roads near water bodies.\n3. Keep a waterproof emergency bag ready with documents and 3 days of supplies.',
    LOW: '1. Maintain clear drainage channels and report blocked drains to local authorities.\n2. Keep an emergency contact list accessible.\n3. Check your flood zone classification and property insurance coverage.'
  };
  const wTips = {
    CRITICAL: '1. Limit showers to under 3 minutes and stop all non-essential water use immediately.\n2. Collect greywater from washing for toilet flushing and plants.\n3. Report any observed leaks or unusual water pressure to local utilities.',
    MODERATE: `1. Shift irrigation to early morning (5–7am) to minimise evaporation at ${w.temp}°C.\n2. Install flow restrictors on taps and fix household drips.\n3. Replace hot-weather car washing with waterless products.`,
    SAFE: '1. Install a water meter to track and reduce household consumption.\n2. Harvest rainwater for garden use — small tanks capture 1000+ litres per year.\n3. Replace water-heavy garden plants with drought-resistant native species.'
  };
  return `### Flood Safety\n${fTips[flood.level]||fTips.LOW}\n\n### Water Conservation\n${wTips[water.level]||wTips.SAFE}\n\n### Sustainability Actions\n1. Advocate for permeable pavements and rooftop gardens to reduce both flood runoff and urban heat (SDG 11).\n2. Support community water harvesting initiatives (SDG 6).\n3. Reduce personal carbon footprint through public transport and renewable energy (SDG 13).\n\n### Emergency Readiness\n1. Assemble a 72-hour kit: 3L water/person/day, food, torch, first aid, charger.\n2. Register with your local civil defence alert system for real-time notifications.\n3. Establish a household communication plan with a meeting point and out-of-area contact.\n\n### Community Preparedness\n1. Organise neighbourhood flood and heat emergency drills — practiced communities recover 40% faster.\n2. Map local vulnerable residents who may need assistance and connect them to support networks.`;
}

/* ── DASHBOARD ───────────────────────────── */
function initDashboardCharts() {
  if (typeof Chart === 'undefined') { setTimeout(initDashboardCharts, 500); return; }
  Chart.defaults.color = 'rgba(232,240,254,0.5)';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
  const tCtx = document.getElementById('trend-chart')?.getContext('2d');
  if (tCtx) state.charts.trend = new Chart(tCtx, {type:'line',data:{labels:['--'],datasets:[{label:'Temperature °C',data:[0],borderColor:'#ff6b35',backgroundColor:'rgba(255,107,53,0.08)',fill:true,tension:0.4,borderWidth:2,pointRadius:4},{label:'Humidity %',data:[0],borderColor:'#00d4ff',backgroundColor:'rgba(0,212,255,0.06)',fill:true,tension:0.4,borderWidth:2,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{family:'Inter',size:11},boxWidth:12,padding:12}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'}},y:{grid:{color:'rgba(255,255,255,0.04)'}}}}});
  const fCtx = document.getElementById('forecast-chart')?.getContext('2d');
  if (fCtx) state.charts.forecast = new Chart(fCtx, {type:'bar',data:{labels:['--'],datasets:[{label:'Forecast Temp °C',data:[0],backgroundColor:'rgba(255,107,53,0.5)',borderColor:'#ff6b35',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{family:'Inter',size:11},boxWidth:12,padding:12}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'}},y:{grid:{color:'rgba(255,255,255,0.04)'}}}}});
  const rCtx = document.getElementById('risk-chart')?.getContext('2d');
  if (rCtx) state.charts.risk = new Chart(rCtx, {type:'doughnut',data:{labels:['Flood Risk','Water Risk','Safe Margin'],datasets:[{data:[20,15,65],backgroundColor:['rgba(255,71,87,0.7)','rgba(255,107,53,0.7)','rgba(0,232,154,0.2)'],borderColor:['#ff4757','#ff6b35','rgba(0,232,154,0.4)'],borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{position:'bottom',labels:{font:{family:'Inter',size:11},boxWidth:10,padding:10}}}}});
}

function refreshDashboard(w, floodRisk, waterRisk) {
  const metrics = {
    'dash-temp': `${w.temp}°`,
    'dash-humidity': `${w.humidity}%`,
    'dash-wind': `${w.windSpeed}`,
    'dash-weather': w.condition
  };
  Object.entries(metrics).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });

  const fb = document.getElementById('dash-flood-badge');
  if (fb) { fb.textContent = floodRisk.level; fb.className = `risk-badge-val ${floodRisk.badge}`; }
  const wb = document.getElementById('dash-water-badge');
  if (wb) { wb.textContent = waterRisk.level; wb.className = `risk-badge-val ${waterRisk.badge}`; }

  const cityLabel = document.getElementById('dash-city-label');
  if (cityLabel) cityLabel.textContent = `Live data for ${w.city}, ${w.country} — updated ${new Date().toLocaleTimeString()}`;

  if (state.charts.trend) {
    state.charts.trend.data.labels = state.historyLabels;
    state.charts.trend.data.datasets[0].data = state.historyTemp;
    state.charts.trend.data.datasets[1].data = state.historyHumidity;
    state.charts.trend.update('active');
  }
  if (state.charts.forecast && state.forecastLabels.length) {
    state.charts.forecast.data.labels = state.forecastLabels;
    state.charts.forecast.data.datasets[0].data = state.forecastTemps;
    state.charts.forecast.update('active');
  }
  if (state.charts.risk) {
    const f = Math.round(floodRisk.score * 100);
    const wat = Math.round(waterRisk.score * 100);
    state.charts.risk.data.datasets[0].data = [f, wat, Math.max(0, 100-f-wat)];
    state.charts.risk.update('active');
  }
}

/* ── CHATBOT ─────────────────────────────── */
function initChatbot() {
  document.getElementById('chat-toggle')?.addEventListener('click', () => {
    const w = document.getElementById('chat-window');
    w.classList.toggle('chat-open');
    if (w.classList.contains('chat-open') && state.chatHistory.length === 0) {
      addChatMessage('assistant', `Hi! I'm your AquaAlert AI Assistant 👋\n\nAsk me anything about flood risk, water conservation, emergency preparedness${state.currentWeather ? ` for **${state.currentWeather.city}**` : ''}. Try one of the quick questions below!`);
    }
  });
  document.getElementById('chat-close')?.addEventListener('click', () => document.getElementById('chat-window')?.classList.remove('chat-open'));
  document.getElementById('chat-send')?.addEventListener('click', sendChatMessage);
  document.getElementById('chat-input')?.addEventListener('keypress', e => { if (e.key==='Enter') { e.preventDefault(); sendChatMessage(); } });
}

function addChatMessage(role, text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${role}`;
  div.innerHTML = `<div class="chat-bubble">${text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  state.chatHistory.push({role:role==='assistant'?'assistant':'user',content:text});
}

function addTypingIndicator() {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-msg-assistant'; div.id = 'chat-typing';
  div.innerHTML = `<div class="chat-bubble"><div class="ai-loading-dots"><span></span><span></span><span></span></div></div>`;
  messages.appendChild(div); messages.scrollTop = messages.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input?.value.trim();
  if (!text) return;
  input.value = '';
  addChatMessage('user', text);
  addTypingIndicator();
  const ctx = state.currentWeather ? `\nCity: ${state.currentWeather.city}, ${state.currentWeather.country}\nTemp: ${state.currentWeather.temp}°C, Humidity: ${state.currentWeather.humidity}%, Condition: ${state.currentWeather.condition}\nFlood Risk: ${state.currentFlood?.level}, Water Scarcity: ${state.currentWater?.level}\n` : '';
  try {
    const msgs = state.chatHistory.slice(-6).map(m=>({role:m.role,content:m.content}));
    msgs.push({role:'user',content:`You are AquaAlert AI — a helpful environmental sustainability assistant.${ctx}\nAnswer this question helpfully and concisely (2-4 sentences): ${text}`});
    const res = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:CONFIG.anthropic.model,max_tokens:400,messages:msgs})});
    document.getElementById('chat-typing')?.remove();
    if (!res.ok) throw new Error();
    const data = await res.json();
    addChatMessage('assistant', data.content?.find(b=>b.type==='text')?.text||'');
  } catch {
    document.getElementById('chat-typing')?.remove();
    addChatMessage('assistant', getFallbackChat(text));
  }
}

function getFallbackChat(q) {
  const ql = q.toLowerCase();
  if (!state.currentWeather) return `Please search a city first using **Analyze Risk**, then I can give you specific insights! 🔍`;
  const city = state.currentWeather.city, f = state.currentFlood?.level||'LOW', w = state.currentWater?.level||'SAFE';
  if (ql.includes('travel') || ql.includes('safe')) return `${city}'s flood risk is **${f}**. ${f==='LOW'?'✅ Safe to travel — conditions are calm.':f==='MEDIUM'?'⚡ Travel with caution — avoid flood-prone roads.':'🚨 Avoid non-essential travel — elevated flood risk.'}`;
  if (ql.includes('flood')) return `Current flood risk for ${city} is **${f}**. ${f==='HIGH'?'Take immediate precautions — avoid floodwaters and follow official guidance.':f==='MEDIUM'?'Monitor conditions and keep supplies ready.':'No significant flood risk at this time.'}`;
  if (ql.includes('water') || ql.includes('save')) return `Water scarcity in ${city} is **${w}**. ${w==='CRITICAL'?'🚨 Strictly limit all water use immediately.':w==='MODERATE'?'💧 Reduce shower time, fix leaks, avoid outdoor watering during peak heat.':'✅ Conditions are stable — good time to build conservation habits.'}`;
  if (ql.includes('precaution') || ql.includes('prepare')) return `For ${city}: Flood risk **${f}**, Water **${w}**. Keep an emergency kit ready, know your evacuation route, and monitor official weather channels.`;
  return `For ${city} — Flood: **${f}**, Water Scarcity: **${w}**. Check the full analysis above for detailed recommendations and emergency guidance.`;
}

/* ── CONFIG MODAL ────────────────────────── */
function initConfigModal() {
  document.getElementById('modal-close')?.addEventListener('click', hideConfigModal);
  document.getElementById('modal-save')?.addEventListener('click', saveConfig);
  document.getElementById('modal-overlay')?.addEventListener('click', e => { if (e.target.id==='modal-overlay') hideConfigModal(); });
}

function showConfigModal() {
  document.getElementById('modal-overlay')?.classList.remove('hidden');
  const el = document.getElementById('modal-ow-key');
  if (el) el.value = CONFIG.openweather.key;
}
function hideConfigModal() { document.getElementById('modal-overlay')?.classList.add('hidden'); }
function saveConfig() {
  const owKey = document.getElementById('modal-ow-key')?.value.trim();
  if (owKey) { CONFIG.openweather.key = owKey; localStorage.setItem('aq_ow_key', owKey); }
  hideConfigModal();
  showSuccess('API key saved!');
  document.getElementById('api-notice')?.classList.add('hidden');
}
function checkApiKeys() { if (!CONFIG.openweather.key) document.getElementById('api-notice')?.classList.remove('hidden'); }

/* ── UTILS ───────────────────────────────── */
function setLoadingState(on) {
  const btn = document.getElementById('analyze-btn');
  if (btn) { btn.disabled = on; btn.textContent = on ? 'Analyzing…' : 'Analyze Risk'; }
}
function showError(msg) { showToast(msg,'error'); }
function showSuccess(msg) { showToast(msg,'success'); }
function showToast(msg, type='error') {
  document.querySelector('.error-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'error-toast';
  t.style.cssText = `border-color:${type==='success'?'rgba(0,232,154,0.3)':'rgba(255,71,87,0.3)'};background:${type==='success'?'rgba(0,232,154,0.1)':'rgba(255,71,87,0.15)'};color:${type==='success'?'var(--green)':'var(--red)'}`;
  t.innerHTML = `<span>${type==='success'?'✓':'⚠'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 4000);
}
