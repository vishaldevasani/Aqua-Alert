# 💧 AquaAlert AI — Urban Flood & Water Scarcity Predictor

> AI-powered sustainability platform predicting flood risk and water scarcity using live weather data.  
> Built for AI + Sustainability internship · Aligned with UN SDG 6, 11 & 13

---

## 🌐 Live Demo

Deploy to Netlify in 30 seconds — see **Deployment** section below.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌐 Live Weather | Real-time data via OpenWeather API (temp, humidity, wind, pressure) |
| 🌊 Flood Risk | Multi-factor HIGH / MEDIUM / LOW prediction with animated gauges |
| 🏜️ Water Scarcity | CRITICAL / MODERATE / SAFE risk based on temperature + humidity |
| 🤖 AI Recommendations | Claude AI generates flood safety, conservation & preparedness tips |
| 📊 Dashboard | Chart.js trend charts and risk breakdown doughnut |
| 🌍 SDG Alignment | SDG 6 · SDG 11 · SDG 13 |
| 🛡️ Responsible AI | Fairness, transparency, privacy, ethics built-in |

---

## 🚀 Quick Start

### 1. Get Your OpenWeather API Key

1. Go to [openweathermap.org](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to **API Keys** in your dashboard
4. Copy your default API key

### 2. Run the App

No build tools needed — just open `index.html` in your browser:

```bash
# Option A: Direct open
open index.html

# Option B: Local dev server (recommended)
npx serve .
# or
python -m http.server 8080
```

### 3. Configure API Key

1. Click **⚙ Configure API** in the navbar
2. Paste your OpenWeather API key
3. Click **Save & Continue**
4. Search any city on the home page

> Your API key is stored in `localStorage` — it never leaves your browser.

---

## 📁 Project Structure

```
aquaalert/
├── index.html              # Main application (single-page)
├── styles/
│   └── main.css            # Full design system + responsive layout
├── scripts/
│   └── app.js              # Weather fetch, risk logic, AI integration
└── README.md
```

---

## 🔑 API Configuration

### OpenWeather API (Required)

| Field | Value |
|---|---|
| Provider | [openweathermap.org](https://openweathermap.org) |
| Plan | Free (Current Weather Data) |
| Limit | 1,000 calls/day free |
| Endpoint | `api.openweathermap.org/data/2.5/weather` |

### Claude AI (Built-in)

AI recommendations are powered by Claude via the embedded API — **no separate key needed** when running inside Claude.ai Artifacts.

For standalone deployment, you'll need to add your own Anthropic API key or proxy the requests through a backend.

---

## 🎯 Risk Logic

### Flood Risk

```
HIGH   → Humidity > 80% AND (Rain/Thunderstorm) AND Wind > 10 m/s
HIGH   → Humidity > 80% AND (Rain/Thunderstorm)
MEDIUM → Humidity > 60% OR Rain present
LOW    → All other conditions
```

### Water Scarcity Risk

```
CRITICAL → Temperature > 35°C AND Humidity < 35%
MODERATE → Temperature > 28°C
SAFE     → All other conditions
```

---

## 🌍 UN SDG Alignment

| Goal | How AquaAlert Contributes |
|---|---|
| **SDG 6** – Clean Water & Sanitation | Water scarcity prediction enables proactive conservation |
| **SDG 11** – Sustainable Cities | Flood risk alerts support urban resilience planning |
| **SDG 13** – Climate Action | AI guidance drives climate-smart individual and community action |

---

## 🚀 Deployment

### Netlify (Recommended — 30 seconds)

1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag and drop the `aquaalert/` folder
3. Done — your app is live!

### Vercel

```bash
npm i -g vercel
cd aquaalert
vercel --prod
```

### GitHub Pages

1. Push project to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Your app will be live at `https://username.github.io/repo-name`

---

## 🛡️ Responsible AI Principles

- **Fairness** — Risk scores based purely on meteorological data, no demographic bias
- **Transparency** — All thresholds are documented and visible in the Dashboard
- **Privacy** — Zero personal data stored; API keys remain in browser localStorage only
- **Ethics** — AI recommendations are advisory; users are directed to official emergency services for real crises

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Weather Data**: OpenWeather Current Weather API
- **AI**: Claude (Anthropic) via `/v1/messages`
- **Charts**: Chart.js 4.4
- **Design**: Glassmorphism, Space Grotesk + Inter fonts, CSS custom properties
- **Deploy**: Netlify / Vercel / GitHub Pages

---

## 📸 Screenshots

The application features:
- Deep ocean-black color palette with cyan/amber accent duality (water vs heat)
- Animated ring gauges for risk visualization
- Live Chart.js trend charts on the dashboard
- Glassmorphism cards with subtle glow effects
- Fully responsive mobile-to-desktop layout

---

*Built for AI + Sustainability Internship · Powered by OpenWeather & Claude AI*
