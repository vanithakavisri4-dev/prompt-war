# 🏟️ ArenaFlow AI — Predictive Stadium Experience Orchestrator

> **AI-powered crowd flow optimization for large-scale sporting venues**

![ArenaFlow AI](https://img.shields.io/badge/ArenaFlow-AI-6c63ff?style=for-the-badge&logo=google&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini-2.0_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-RTDB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WCAG 2.1 AA](https://img.shields.io/badge/WCAG_2.1-AA_Compliant-10b981?style=for-the-badge)

**🔗 Live Demo:** [https://prompt-war-912679656092.us-central1.run.app](https://prompt-war-912679656092.us-central1.run.app)

---

## 📋 Chosen Vertical

**Physical Event Experience at Large-Scale Sporting Venues**

ArenaFlow AI addresses the core challenges of attending major sporting events — **crowd congestion, unpredictable wait times, poor real-time coordination, and accessibility barriers** — by transforming the chaotic stadium experience into an AI-orchestrated, personalized journey. Unlike traditional stadium apps that only show static maps, ArenaFlow **predicts** congestion before it happens and **coordinates** all attendees simultaneously to eliminate bottlenecks.

---

## 💡 The Unique Idea: Air Traffic Control for Stadium Attendees

Most solutions show **current** crowd status. ArenaFlow AI is different — it acts as **air traffic control for stadium attendees**, proactively orchestrating the **entire crowd flow** by:

1. **Predicting** congestion 15-30 minutes ahead using phase-based simulation
2. **Creating personalized "Experience Flows"** — AI-optimized activity timelines (food, restroom, merchandise) scheduled to minimize YOUR wait time
3. **Coordinating across ALL attendees simultaneously** — staggering activities across time and space so no single area becomes a bottleneck
4. **Adapting in real-time** as crowd patterns shift during pre-game, halftime, and post-game phases

> Think of it as Waze for inside the stadium — but instead of just routing, it tells you **WHEN to go WHERE** before the crowd even forms.

---

## 🏗️ Architecture & Approach

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                    ArenaFlow AI                          │
│              Deployed on Google Cloud Run                │
├───────────┬───────────┬───────────┬─────────────────────┤
│ Crowd     │ Flow      │ Gemini    │ Google Cloud        │
│ Engine    │ Optimizer │ Service   │ Service             │
│           │           │           │                     │
│ Phase-    │ Greedy    │ Context-  │ Cloud Run, Logging, │
│ based     │ schedule  │ aware AI  │ Monitoring, GA4     │
│ density   │ optim.    │ concierge │                     │
│ sim.      │           │           │                     │
├───────────┼───────────┴───────────┼─────────────────────┤
│ Maps      │ Firebase Service      │ Accessibility       │
│ Service   │ (Real-time Sync)      │ Service             │
│ Canvas    │ RTDB + Anonymous Auth │ (WCAG 2.1 AA)       │
│ heatmaps  │                       │                     │
├───────────┴───────────────────────┴─────────────────────┤
│ ArenaUtils (Sanitization, Storage, Crypto, Helpers)     │
├─────────────────────────────────────────────────────────┤
│ Docker Container (NGINX Alpine) → Google Cloud Run      │
└─────────────────────────────────────────────────────────┘
```

### Core Modules

| Module                 | Purpose                                 | Key Algorithm                               |
| ---------------------- | --------------------------------------- | ------------------------------------------- |
| `CrowdEngine`          | Real-time crowd simulation & prediction | Phase-based density modeling with noise     |
| `FlowOptimizer`        | Personalized activity scheduling        | Greedy assignment with crowd-aware scoring  |
| `GeminiService`        | AI concierge (natural language)         | Gemini 2.0 Flash API + smart local fallback |
| `MapsService`          | Interactive stadium visualization       | Canvas-based heatmap with layer system      |
| `FirebaseService`      | Real-time data sync & groups            | Realtime DB + anonymous auth                |
| `AccessibilityService` | WCAG 2.1 AA compliance                  | Theme engine, font scaling, keyboard nav    |
| `GoogleCloudService`   | Cloud platform integration              | Cloud Logging, Monitoring, Analytics        |
| `ArenaUtils`           | Core utility library                    | Sanitization, crypto randomness, helpers    |

---

## 🔧 How It Works

### 1. Onboarding

User enters name, selects venue, seat section, accessibility needs, and language. Data is stored securely in localStorage with sanitized inputs.

### 2. Real-Time Dashboard

- **4 live stat cards**: Crowd density, avg wait time, flow score, safety index
- **Stadium heatmap**: Canvas-rendered with real-time zone density overlays
- **AI predictions**: 5/10/15/20/30-minute congestion forecasts
- **Quick actions**: One-tap access to nearest food, restrooms, exits, medical

### 3. Personalized Experience Flow (The Differentiator)

The Flow Optimizer creates a time-optimized activity schedule:

- Selects activities based on user profile (mandatory + optional)
- Scores every activity-slot combination by predicted crowd density
- Uses greedy assignment to minimize total wait across all activities
- Applies stagger offset to prevent user collisions
- Adjusts durations for accessibility needs (wheelchair, elderly)
- Recalculates in real-time as conditions change

### 4. AI Concierge (Google Gemini 2.0 Flash)

Natural language assistant powered by Gemini 2.0 Flash:

- Receives full crowd context with every query
- Provides contextual, real-time venue guidance
- Smart local fallback with pattern-matching when API is unavailable
- Intent detection for food, restrooms, navigation, crowds, exits, emergencies, merchandise
- Safety settings block harmful content categories

### 5. Interactive Live Map

Canvas-based stadium visualization with:

- Crowd density heatmap layer (color-coded radial gradients)
- POI layers (food, facilities, exits) with density indicators
- Animated user position marker with pulse effect
- Responsive rendering with device pixel ratio support

### 6. Social Sync

Group coordination feature:

- Create/join groups with shareable codes (ARENA-XXXX)
- See all group members and their sections
- AI-powered optimal meeting point finder (centroid + density weighted)
- Firebase real-time sync when configured

### 7. Emergency Mode

One-tap emergency evacuation overlay:

- Identifies nearest exit with lowest crowd density
- Provides personalized evacuation route
- Full-screen alert with accessibility announcements
- ARIA live region for screen reader support

---

## 🔗 Google Services Integration

| Service                        | Usage                                                           | Integration Point                                                 |
| ------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Google Gemini 2.0 Flash AI** | Conversational AI concierge with venue context, safety settings | `js/gemini.js` — Full API with system prompt, safety filters      |
| **Google Cloud Run**           | Containerized deployment, auto-scaling, HTTPS                   | `Dockerfile` — NGINX Alpine container                             |
| **Google Cloud Functions**     | Serverless crowd analytics aggregation pipeline                 | `js/google-cloud.js` — submitToCloudFunction() with rate limiting |
| **Google BigQuery**            | Historical crowd data warehousing and trend analysis            | `js/google-cloud.js` — queryBigQueryAnalytics() with SQL queries  |
| **Google Vertex AI**           | ML-powered crowd density prediction model                       | `js/google-cloud.js` — predictWithVertexAI() with local fallback  |
| **Google Cloud Logging**       | Structured JSON logging with severity levels                    | `js/google-cloud.js` — Cloud Logging compatible format            |
| **Google Cloud Monitoring**    | Health checks, Web Vitals, performance metrics                  | `js/google-cloud.js` — healthCheck(), getPerformanceMetrics()     |
| **Google Analytics 4**         | User interaction tracking, event analytics                      | `index.html` + `js/google-cloud.js` — trackEvent()                |
| **Firebase Realtime Database** | Real-time crowd data sync & group management                    | `js/firebase-config.js` — Live sync with anonymous auth           |
| **Firebase Authentication**    | Secure anonymous user sessions                                  | `js/firebase-config.js` — signInAnonymously()                     |
| **Google Cloud Translation**   | Multi-language support (6 languages)                            | `js/gemini.js` — translate() function                             |
| **Google Fonts**               | Typography (Inter, JetBrains Mono)                              | `index.html` — Premium font loading with preconnect               |

---

## 🔒 Security Measures

- **Content Security Policy (HTTP Header)**: CSP response header in nginx restricts script sources, style sources, and connection endpoints — stronger than meta tag alone
- **Content Security Policy (Meta Tag)**: Fallback CSP meta tag for non-nginx environments
- **XSS Prevention**: All user input sanitized via `ArenaUtils.sanitize()` before DOM insertion
- **Content Security**: HTML entity encoding for `& < > " '` characters
- **Rate Limiting**: Chat messages rate-limited (1 req/sec); Cloud Function calls rate-limited (5s interval)
- **Input Length Validation**: Chat messages truncated to 500 characters to prevent payload attacks
- **Cryptographic Randomness**: `crypto.getRandomValues()` for group code generation (not `Math.random()`)
- **Input Validation**: Form validation + join code regex validation (`/^ARENA-[A-Z0-9]{4}$/`) before submission
- **Safe API Calls**: Gemini safety settings block all harmful content categories (harassment, hate speech, explicit, dangerous)
- **Fetch Timeout**: All external API calls use `AbortSignal.timeout()` to prevent hanging requests
- **localStorage Isolation**: Namespaced keys (`arenaflow_*`) prevent collisions
- **No Inline Scripts**: All JavaScript in external files (CSP-friendly)
- **Structured Error Handling**: Try-catch boundaries with graceful fallbacks in all API integrations
- **HSTS**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` via nginx
- **COOP/CORP/COEP**: Cross-Origin isolation headers for maximum security isolation
- **Permissions Policy**: Camera, microphone, geolocation, and interest-cohort disabled
- **Frame Protection**: `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`
- **Form Action Restriction**: CSP `form-action 'self'` prevents form hijacking
- **Base URI Restriction**: CSP `base-uri 'self'` prevents base tag injection

---

## ♿ Accessibility Features (WCAG 2.1 AA)

- **Skip Navigation Link**: Keyboard-accessible skip to main content
- **ARIA Landmarks**: Proper `role`, `aria-label`, `aria-live`, `aria-current` throughout
- **Keyboard Navigation**: Full tab navigation, Escape to close modals, focus trap in dialogs
- **Screen Reader Support**: `aria-live` regions for dynamic content, `sr-only` announcements
- **High Contrast Mode**: One-click toggle with `data-theme="high-contrast"` (WCAG AAA contrast ratios)
- **Font Scaling**: Adjustable from 80% to 150% via CSS custom properties
- **Reduced Motion**: Respects `prefers-reduced-motion` media query + manual toggle
- **Semantic HTML5**: Proper heading hierarchy (`<h1>` to `<h3>`), `<nav>`, `<main>`, `<section>`, `<header>`
- **Color Independence**: Status indicators use icons + text alongside color (never color-only)
- **Focus Indicators**: Visible focus outlines (`:focus-visible`) on all interactive elements
- **Form Accessibility**: `aria-required`, `autocomplete` attributes, linked labels via `for` attribute
- **Progress Bars**: All progress elements use `role="progressbar"` with `aria-valuenow/min/max`

---

## 🧪 Testing

Open `tests/test.html` in a browser to run the full test suite (130+ tests across 22 suites).

**Test Coverage:**

- ✅ **Utilities** — Sanitization (XSS, special chars, empty, null, numeric, all vector types), clamp, lerp, randomId, storage, debounce, formatTime, remove
- ✅ **Crowd Engine** — Snapshot validity, density ranges, predictions, wait times, phase management, safety index, least crowded lookup, all 5 phase transitions, avgDensity and totalAttendees validation
- ✅ **Flow Optimizer** — Flow generation, item structure, scoring, accessibility adjustments, meeting points, null profile handling, zone names, density values, time formats, mandatory activities
- ✅ **Gemini Service** — Chat responses, all intent types (food, restroom, nav, crowd, exit, emergency, merch), translation fallback, concurrent calls, invalid language codes
- ✅ **Firebase Service** — Group creation, joining, retrieval, non-existent code handling, code format validation, multiple unique codes
- ✅ **Google Cloud Service** — Initialization, config validation, health checks, performance metrics, logging severities, event tracking, enum immutability, Core Web Vitals fields, BigQuery/Vertex AI
- ✅ **Security** — XSS prevention (script, img, svg, event handlers, all vector types), crypto randomness, code regex validation, length-limited group names
- ✅ **Maps Service** — Module validation, canvas initialization, all layer types, graceful missing element handling, idempotent stop()
- ✅ **Accessibility Service** — Font scaling, high contrast, reduced motion, theme switching, screen reader announcements, language attribute
- ✅ **Core Web Vitals** — LCP/FID/CLS field presence, null-or-non-negative validation, resource count
- ✅ **Edge Cases** — Null/undefined inputs, boundary values, unknown zone types, empty arrays, concurrent calls
- ✅ **Async Error Handling** — Concurrent chat, invalid language, rate limiting, concurrent Vertex AI
- ✅ **DOM Integration** — Selector helpers, form validation, toast creation, start/stop cycle, ACTIVITY_CATALOG validation
- ✅ **Performance** — Snapshot throughput (100 in <500ms), flow generation (<100ms), sanitization efficiency (1000 payloads <50ms), prediction speed

---

## 📁 Project Structure

```
prompt-war/
├── index.html              # Main application entry point (GA4, PWA, JSON-LD, OG tags)
├── manifest.json           # Web App Manifest (PWA — installable on mobile/desktop)
├── Dockerfile              # Docker container config (NGINX 1.27 Alpine, non-root)
├── .dockerignore           # Docker build exclusions
├── nginx.conf              # NGINX security headers (CSP, HSTS, COOP, CORP, COEP)
├── css/
│   └── styles.css          # Complete design system (dark/light/high-contrast)
├── js/
│   ├── utils.js            # Core utilities, sanitization, crypto helpers
│   ├── google-cloud.js     # Cloud Run, Logging, Monitoring, Core Web Vitals
│   ├── crowd-engine.js     # Crowd simulation & prediction engine (27 zones)
│   ├── flow-optimizer.js   # AI activity schedule optimizer (greedy algorithm)
│   ├── gemini.js           # Google Gemini 2.0 Flash AI integration
│   ├── maps.js             # Canvas-based stadium map renderer
│   ├── firebase-config.js  # Firebase RTDB + Auth real-time data service
│   ├── accessibility.js    # WCAG 2.1 AA compliance module
│   └── app.js              # Main application controller
├── tests/
│   └── test.html           # Comprehensive test suite (130+ tests, 22 suites)
├── .editorconfig           # Editor configuration for consistent formatting
├── .eslintrc.json          # ESLint legacy config
├── eslint.config.mjs       # ESLint flat config (primary — 0 errors)
├── jsconfig.json           # JavaScript project config (type checking)
├── package.json            # Project manifest and scripts
├── CONTRIBUTING.md         # Contributor guidelines
├── LICENSE                 # MIT License
└── README.md               # This file
```

---

## 🚀 Deployment

### Live URL

**[https://prompt-war-912679656092.us-central1.run.app](https://prompt-war-912679656092.us-central1.run.app)**

### Google Cloud Run Deployment

The application is containerized using Docker and deployed on Google Cloud Run:

```bash
# Build and deploy to Cloud Run
gcloud run deploy prompt-war \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/krishnan9841226883-design/prompt-war.git
cd prompt-war

# Open directly in browser
open index.html

# Or run with Docker
docker build -t arenaflow-ai .
docker run -p 8080:80 arenaflow-ai
```

### Optional: Enable Google Services

To enable full Gemini AI responses, add your API key:

```javascript
GeminiService.configure("YOUR_GEMINI_API_KEY");
```

For Firebase real-time sync:

```javascript
FirebaseService.init({
  apiKey: "YOUR_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project",
});
```

---

## 📝 Assumptions

1. **Stadium Layout**: Uses a generalized oval stadium model with 27 zones covering seating, concourses, food courts, restrooms, gates, merchandise, medical, and VIP areas
2. **Crowd Data**: Simulated using phase-based density modeling (pre-game → first-half → halftime → second-half → post-game) with realistic Gaussian noise
3. **Prediction Model**: Uses linear interpolation toward phase-target densities with confidence decay over time (O(1) per zone)
4. **Optimization**: Greedy algorithm for activity scheduling provides near-optimal solutions in O(n·m) time complexity
5. **Real-time Updates**: Crowd engine ticks every 2 seconds; phase advances every ~2 minutes for demonstration purposes
6. **Capacity**: Designed for venues with 50,000-130,000 capacity across 27 zones
7. **Connectivity**: Works fully offline with local simulation; enhanced with Firebase when connected
8. **Deployment**: Containerized with NGINX Alpine on Google Cloud Run for auto-scaling and global availability

---

## 🏆 Why ArenaFlow AI Stands Out

| Feature         | Traditional Apps     | ArenaFlow AI                               |
| --------------- | -------------------- | ------------------------------------------ |
| Crowd Info      | Shows current status | **Predicts** future congestion (5-30 min)  |
| Recommendations | Static suggestions   | **Personalized, time-optimized** flows     |
| Coordination    | Individual routing   | **Cross-attendee orchestration**           |
| Accessibility   | Basic compliance     | **Full WCAG 2.1 AA** with 3 themes         |
| AI              | Keyword search       | **Gemini 2.0 Flash** natural language      |
| Updates         | Manual refresh       | **Real-time** 2-second intervals           |
| Deployment      | Static hosting       | **Google Cloud Run** with auto-scaling     |
| Monitoring      | None                 | **Cloud Logging + Monitoring + GA4**       |
| Security        | Basic                | **Crypto, XSS prevention, safety filters** |

---

Built with ❤️ for PromptWar Hackathon — Powered by Google AI & Google Cloud
