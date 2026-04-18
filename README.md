# 🏟️ ArenaFlow AI — Predictive Stadium Experience Orchestrator

> **AI-powered crowd flow optimization for large-scale sporting venues**

![ArenaFlow AI](https://img.shields.io/badge/ArenaFlow-AI-6c63ff?style=for-the-badge&logo=google&logoColor=white)
![Google Services](https://img.shields.io/badge/Google-Services-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WCAG 2.1 AA](https://img.shields.io/badge/WCAG_2.1-AA_Compliant-10b981?style=for-the-badge)

---

## 📋 Chosen Vertical

**Physical Event Experience at Large-Scale Sporting Venues**

ArenaFlow AI addresses the core challenges of attending major sporting events: crowd congestion, long wait times, poor real-time coordination, and accessibility gaps — by transforming the stadium experience into an AI-orchestrated, personalized journey.

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
┌─────────────────────────────────────────────┐
│              ArenaFlow AI                    │
├──────────┬──────────┬──────────┬────────────┤
│ Crowd    │ Flow     │ Gemini   │ Maps       │
│ Engine   │ Optimizer│ Service  │ Service    │
│          │          │          │            │
│ Phase-   │ Greedy   │ Context- │ Canvas     │
│ based    │ schedule │ aware AI │ heatmap    │
│ density  │ optim.   │ concierge│ rendering  │
│ sim.     │          │          │            │
├──────────┴──────────┴──────────┴────────────┤
│ Firebase Service (Real-time Sync)           │
├─────────────────────────────────────────────┤
│ Accessibility Service (WCAG 2.1 AA)        │
├─────────────────────────────────────────────┤
│ Utils (Sanitization, Storage, Helpers)      │
└─────────────────────────────────────────────┘
```

### Core Modules

| Module | Purpose | Key Algorithm |
|--------|---------|---------------|
| `CrowdEngine` | Real-time crowd simulation & prediction | Phase-based density modeling with noise |
| `FlowOptimizer` | Personalized activity scheduling | Greedy assignment with crowd-aware scoring |
| `GeminiService` | AI concierge (natural language) | Gemini API + smart local fallback |
| `MapsService` | Interactive stadium visualization | Canvas-based heatmap with layer system |
| `FirebaseService` | Real-time data sync & groups | Realtime DB + anonymous auth |
| `AccessibilityService` | WCAG 2.1 AA compliance | Theme engine, font scaling, keyboard nav |

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
- Recalculates in real-time as conditions change

### 4. AI Concierge (Google Gemini)
Natural language assistant powered by Gemini 2.0 Flash:
- Receives full crowd context with every query
- Provides contextual, real-time venue guidance
- Smart local fallback with pattern-matching when API is unavailable
- Intent detection for food, restrooms, navigation, crowds, exits, emergencies, merchandise

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

| Service | Usage | Integration Point |
|---------|-------|-------------------|
| **Google Gemini AI** | Conversational AI concierge with venue context | `js/gemini.js` — Full API integration with safety settings |
| **Google Maps Platform** | Stadium visualization with crowd overlays | `js/maps.js` — Canvas-based rendering inspired by Maps styling |
| **Firebase Realtime DB** | Real-time crowd data sync & group management | `js/firebase-config.js` — Live sync with anonymous auth |
| **Firebase Auth** | Secure anonymous user sessions | `js/firebase-config.js` — signInAnonymously() |
| **Google Cloud Translation** | Multi-language support (6 languages) | `js/gemini.js` — translate() function |
| **Google Fonts** | Typography (Inter, JetBrains Mono) | `index.html` — Premium font loading |

---

## 🔒 Security Measures

- **XSS Prevention**: All user input sanitized via `ArenaUtils.sanitize()` before DOM insertion
- **Content Security**: HTML entity encoding for `& < > " '` characters
- **Cryptographic Randomness**: `crypto.getRandomValues()` for group code generation
- **Input Validation**: Form validation with visual feedback before submission
- **Safe API Calls**: Gemini safety settings block harmful content categories
- **localStorage Isolation**: Namespaced keys (`arenaflow_*`) prevent collisions
- **No Inline Scripts**: All JavaScript in external files

---

## ♿ Accessibility Features (WCAG 2.1 AA)

- **Skip Navigation Link**: Keyboard-accessible skip to main content
- **ARIA Landmarks**: Proper `role`, `aria-label`, `aria-live` throughout
- **Keyboard Navigation**: Full tab navigation, Escape to close modals, focus trap in dialogs
- **Screen Reader Support**: `aria-live` regions for dynamic content, `sr-only` announcements
- **High Contrast Mode**: One-click toggle with `data-theme="high-contrast"`
- **Font Scaling**: Adjustable from 80% to 150% via CSS custom properties
- **Reduced Motion**: Respects `prefers-reduced-motion` + manual toggle
- **Semantic HTML5**: Proper heading hierarchy, `<nav>`, `<main>`, `<section>`, `<header>`
- **Color Independence**: Status indicators use icons + text alongside color
- **Focus Indicators**: Visible focus outlines (`:focus-visible`) on all interactive elements

---

## 🧪 Testing

Open `tests/test.html` in a browser to run the full test suite.

**Test Coverage:**
- ✅ **Utilities** — Sanitization, clamp, lerp, randomId, storage, debounce
- ✅ **Crowd Engine** — Snapshot validity, density ranges, predictions, wait times, phase management
- ✅ **Flow Optimizer** — Flow generation, item structure, scoring, accessibility adjustments, meeting points
- ✅ **Gemini Service** — Chat responses, intent detection, translation fallback
- ✅ **Firebase Service** — Group creation, joining, retrieval
- ✅ **Security** — XSS prevention, crypto randomness, input validation

---

## 📁 Project Structure

```
arenaflow-ai/
├── index.html              # Main application entry point
├── css/
│   └── styles.css          # Complete design system (dark/light/high-contrast)
├── js/
│   ├── utils.js            # Core utilities, sanitization, helpers
│   ├── crowd-engine.js     # Crowd simulation & prediction engine
│   ├── flow-optimizer.js   # AI activity schedule optimizer
│   ├── gemini.js           # Google Gemini AI integration
│   ├── maps.js             # Canvas-based stadium map renderer
│   ├── firebase-config.js  # Firebase real-time data service
│   ├── accessibility.js    # WCAG 2.1 AA compliance module
│   └── app.js              # Main application controller
├── tests/
│   └── test.html           # Comprehensive test suite
└── README.md               # This file
```

---

## 🚀 Getting Started

1. Clone the repository
2. Open `index.html` in a modern browser
3. Complete the onboarding (name, venue, section)
4. Explore the dashboard, flow timeline, live map, and AI concierge

### Optional: Enable Google Services

To enable full Gemini AI responses, add your API key in `js/gemini.js`:
```javascript
GeminiService.configure('YOUR_GEMINI_API_KEY');
```

For Firebase real-time sync, add your config in `js/firebase-config.js`:
```javascript
FirebaseService.init({
  apiKey: 'YOUR_KEY',
  authDomain: 'your-project.firebaseapp.com',
  databaseURL: 'https://your-project.firebaseio.com',
  projectId: 'your-project'
});
```

---

## 📝 Assumptions

1. **Stadium Layout**: Uses a generalized oval stadium model with 27 zones covering seating, concourses, food courts, restrooms, gates, merchandise, medical, and VIP areas
2. **Crowd Data**: Simulated using phase-based density modeling (pre-game → first-half → halftime → second-half → post-game) with realistic noise
3. **Prediction Model**: Uses linear interpolation toward phase-target densities with confidence decay over time
4. **Optimization**: Greedy algorithm for activity scheduling provides near-optimal solutions in O(n·m) time
5. **Real-time Updates**: Crowd engine ticks every 2 seconds; phase advances every ~2 minutes for demonstration
6. **Capacity**: Designed for venues with 50,000-130,000 capacity
7. **Connectivity**: Works offline with local simulation; enhanced with Firebase when connected

---

## 🏆 Why ArenaFlow AI Stands Out

| Feature | Traditional Apps | ArenaFlow AI |
|---------|-----------------|--------------|
| Crowd Info | Shows current status | **Predicts** future congestion |
| Recommendations | Static suggestions | **Personalized, time-optimized** flows |
| Coordination | Individual routing | **Cross-attendee orchestration** |
| Accessibility | Basic compliance | **Full WCAG 2.1 AA** with 3 themes |
| AI | Keyword search | **Gemini-powered** natural language |
| Updates | Manual refresh | **Real-time** 2-second intervals |

---

Built with ❤️ for PromptWar Hackathon — Powered by Google AI
