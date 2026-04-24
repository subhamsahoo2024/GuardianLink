# Implementation Guide: GuardianLink Ecosystem

This document outlines the technical execution of the AegisNode crisis coordination system.

---

## 1. Dashboard: Guest Survival Hub (PWA)

**Objective:** Provide immediate, zero-barrier life-saving instructions to guests.

### Key Features & Implementation

- **Dynamic "Safe-Path" Navigation:**
  - **Feature:** A real-time path drawn over a hotel floor plan that avoids danger zones.
  - **Implementation:** Use **Leaflet** with **OpenStreetMap** tiles and custom image overlays for floor plans.
  - **Logic:** When an incident is verified at specific coordinates, the backend (Next.js) updates a "danger_zones" collection in **Firestore**. The frontend uses a pathfinding algorithm (like A\*) to redraw the Polyline while avoiding danger zones.
- **One-Tap Multimodal SOS:**
  - **Feature:** Send text, audio, or video distress signals.
  - **Implementation:** Use the **MediaRecorder API** to capture audio/video directly in the browser.
  - **Media Hosting:** Upload files with **Cloudinary unsigned uploads** and forward the returned `secure_url` for downstream analysis or persistence.
- **Multilingual Emergency Ticker:**
  - **Feature:** Real-time instructions translated into the user's browser language.
  - **API:** **Google Cloud Translation API** (or Gemini 3 for context-aware translation).
  - **Logic:** Staff sends a message in English; the PWA detects the user's `navigator.language` and requests a translated string from the backend.

---

## 2. Dashboard: Staff Command Center (Desktop/Capacitor)

**Objective:** Transform hundreds of data points into a single, actionable tactical view.

### Key Features & Implementation

- **The "Gemini Pulse" Incident Feed:**
  - **Feature:** An AI-summarized list of what is happening.
  - **Model:** **Gemini 3 Flash (via Vertex AI SDK)**.
  - **Implementation:** As `sos_reports` populate in Firestore, a background task sends batches of reports to Gemini with the prompt: _"Summarize these 50 reports into 3 key bullet points: Type of incident, confirmed location, and number of people trapped."_
  - **Display:** A scrolling feed of "Synthesized Incidents" instead of raw data.
- **Occupancy & Safety Heatmap:**
  - **Feature:** Visualize where guests are and their safety status.
  - **Implementation:** Use **Firestore Real-time Listeners** (`onSnapshot`). Map guest coordinates to **Leaflet** circle markers and styled tooltips.
  - **Styling:** Use CSS animations to create "pulsing" effects: Green for "Safe," Red for "Needs Help," Grey for "No Response."
- **Critical Alert Broadcast:**
  - **Feature:** Send loud, bypass-silence notifications to all devices.
  - **API:** **Firebase Cloud Messaging (FCM)**.
  - **Implementation:** For the native Staff app (built with **Capacitor**), use the `CapacitorPushNotifications` plugin to trigger high-priority alerts with custom sounds.

---

## 3. Dashboard: First Responder Bridge (Tactical Tablet)

**Objective:** Provide high-speed, technical intelligence to fire and police units.

### Key Features & Implementation

- **Technical Floor Plan Overlays:**
  - **Feature:** Toggling views for fire hydrants, gas lines, and electrical shut-offs.
  - **Implementation:** Use **Leaflet GeoJSON layers**. Store the technical blueprints as GeoJSON files. Responders can toggle layers using a `Checklist` UI.
- **Gemini Live Translator Bridge:**
  - **Feature:** Two-way voice communication between responders and trapped guests.
  - **API:** **Gemini Live API** (Multimodal WebSockets).
  - **Implementation:** Establish a WebSocket connection between the Responder Bridge and the Guest PWA. Gemini acts as the "Middleman," listening to audio from one side and speaking the translation to the other.
- **Triage Scorecard:**
  - **Feature:** Real-time count of evacuated vs. missing persons.
  - **Logic:** A simple Firestore aggregation query (`count()`) that updates every time a guest's `status` changes from `in_building` to `evacuated`.

---

## 4. The Intelligence Layer (AI Orchestration)

| Task                   | Model / API               | Why?                                                                     |
| :--------------------- | :------------------------ | :----------------------------------------------------------------------- |
| **Multimodal Triage**  | Gemini 3 Flash            | Analyzes user videos/audio for fire, smoke, or structural damage.        |
| **Incident Synthesis** | Gemini 3 Flash            | Clusters 100+ reports into 1 manageable event for staff.                 |
| **Pathfinding Logic**  | A\* + custom route engine | Calculates evacuation routes while avoiding custom "Waypoints" (Danger). |
| **Translation**        | Cloud Translation API     | High-speed, low-latency translation of emergency alerts.                 |

---

## 5. Deployment & Scaling Strategy

1.  **Backend Logic:** Deploy all heavy processing to **Google Cloud Run**. This ensures that if 2,000 guests hit the app simultaneously, the system scales instantly.
2.  **Database:** Use **Firestore** in "Datastore Mode" or standard with high-concurrency settings to ensure real-time updates don't lag during a surge.
3.  **Global Delivery:** Use **Firebase Hosting** to serve the PWA. It uses a Global CDN, meaning the app loads in milliseconds regardless of where the hotel is located.

---

## 6. Top 1% Implementation Checklist

- [ ] **Offline Resilience:** Use **Service Workers** (via `next-pwa`) to cache the map and essential CSS/JS so the app works if Wi-Fi flickers.
- [ ] **Privacy-First AI:** Ensure all Gemini prompts include instructions to ignore personally identifiable information (PII) to remain GDPR/CCPA compliant.
- [ ] **Accessibility:** Implement **ARIA labels** and high-contrast modes. In a smoke-filled room, a user needs high-visibility UI.
- [ ] **Battery Optimization:** Use "Pull" rather than "Push" for high-frequency location data to save guest battery life during long emergencies.

---
