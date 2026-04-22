# 🛡️ GuardianLink — Implementation Todo List

> **Project:** GuardianLink Crisis Coordination System  
> **Stack:** Next.js 16 (App Router) + Tailwind CSS v4 + Firebase + Gemini 3 Flash + Google Maps  
> **Last Updated:** 2026-04-21

---

## Phase 1: Project Foundation & Configuration

- [x] Initialize Next.js 16 project
- [x] Set up environment variables (`.env.example`)
- [x] Configure `next.config.ts` (security headers, PWA support, image domains)
- [x] Set up project folder structure (route groups, shared components, lib)
- [x] Install core dependencies (Firebase SDK, Google Maps, Gemini AI SDK)
- [x] Set up global design system (Tailwind theme, fonts, colors)
- [x] Set up root layout with metadata and fonts

## Phase 2: Design System & Shared Components

- [x] Create global CSS with custom design tokens (dark mode, emergency colors)
- [ ] Build shared UI components:
  - [x] `Button` (primary, danger, ghost variants)
  - [x] `Card` (glassmorphic panels)
  - [x] `Badge` (status indicators: safe, danger, warning)
  - [x] `AlertBanner` (emergency ticker)
  - [x] `StatusPulse` (animated pulsing status dots)
  - [x] `Sidebar` / `Navbar` (navigation)
  - [x] `Modal` (overlays for alerts)
  - [x] `LoadingSkeleton` (loading states)

## Phase 3: Landing Page (Marketing / Entry Point)

- [x] Build the hero section with animated shield/crisis theme
- [x] Feature showcase sections (Safe-Path, Gemini AI, Multilingual SOS, Heatmap)
- [x] QR code demo section (simulated room entry)
- [x] Call-to-action buttons (Guest Demo, Staff Login, Responder Login)
- [x] Responsive layout & micro-animations
- [ ] **GIT COMMIT: `feat: landing page with hero and feature showcase`**

## Phase 4: Guest Survival Hub (PWA) — `/guest/[roomId]`

- [ ] **4.1 Guest Entry & Room Identification**
  - [x] Dynamic route `app/(guest)/room/[roomId]/page.tsx`
  - [x] Room context provider (room number, floor, hotel info)
  - [x] Welcome screen with emergency instructions
- [ ] **4.2 One-Tap SOS System**
  - [x] SOS button component (large, pulsing, red)
  - [x] MediaRecorder integration (audio/video capture)
  - [x] SOS report form (text + media)
  - [x] API route `app/api/sos/route.ts` to receive reports
  - [ ] Integration with Firebase Storage for media uploads
- [ ] **4.3 Dynamic Safe-Path Navigation**
  - [ ] Google Maps embed with floor plan overlay
  - [ ] Custom GroundOverlay for hotel floor plans
  - [ ] Danger zone visualization (red zones)
  - [ ] Pathfinding logic (A\* or waypoint-based routing)
  - [ ] Real-time path updates when danger zones change
- [ ] **4.4 Multilingual Emergency Ticker**
  - [ ] Emergency instruction ticker component
  - [ ] Browser language detection (`navigator.language`)
  - [ ] Translation API route `app/api/translate/route.ts`
  - [ ] Real-time translated alerts display
- [ ] **4.5 Guest Status Tracking**
  - [ ] "I am Safe" button (updates status to evacuated)
  - [ ] Guest status state management
  - [ ] Firestore status sync
- [ ] **GIT COMMIT: `feat: guest PWA with SOS, navigation, and multilingual alerts`**

## Phase 5: Staff Command Center — `/staff`

- [ ] **5.1 Staff Authentication & Layout**
  - [ ] Staff dashboard layout with sidebar navigation
  - [ ] Authentication gate (demo mode with bypass)
  - [ ] Dashboard header with crisis status indicator
- [ ] **5.2 Gemini Pulse — Incident Feed**
  - [ ] Incident feed component (scrolling, real-time)
  - [ ] API route `app/api/incidents/synthesize/route.ts`
  - [ ] Gemini 3 Flash integration for report synthesis
  - [ ] Incident cards with severity levels and summaries
- [ ] **5.3 Occupancy & Safety Heatmap**
  - [ ] Google Maps with Advanced Markers
  - [ ] Real-time guest status markers (green/red/grey pulsing)
  - [ ] Floor selector for multi-level view
  - [ ] Heatmap overlay for density visualization
- [ ] **5.4 Critical Alert Broadcast**
  - [ ] Broadcast message composer
  - [ ] API route `app/api/broadcast/route.ts`
  - [ ] FCM integration for push notifications
  - [ ] Alert history log
- [ ] **5.5 Danger Zone Management**
  - [ ] Interactive map tool for marking danger zones
  - [ ] Danger zone CRUD operations
  - [ ] Firestore `danger_zones` collection management
- [ ] **5.6 Incident Management**
  - [ ] Incident detail view
  - [ ] Status update controls (investigating, contained, resolved)
  - [ ] Timeline of events per incident
- [ ] **GIT COMMIT: `feat: staff command center with AI feed, heatmap, and broadcasts`**

## Phase 6: First Responder Bridge — `/responder`

- [ ] **6.1 Responder Layout & Auth**
  - [ ] Tactical tablet-optimized layout
  - [ ] Responder authentication gate
- [ ] **6.2 Technical Floor Plan Overlays**
  - [ ] GeoJSON data layers for technical blueprints
  - [ ] Toggle controls for: fire hydrants, gas lines, electrical shut-offs
  - [ ] Layer visibility checklist UI
- [ ] **6.3 Gemini Live Translator Bridge**
  - [ ] WebSocket connection setup
  - [ ] Two-way audio stream between responder and guest
  - [ ] Gemini Live API integration for real-time translation
  - [ ] Audio visualizer for active calls
- [ ] **6.4 Triage Scorecard**
  - [ ] Real-time evacuated vs. missing counts
  - [ ] Firestore aggregation queries
  - [ ] Visual scorecard with progress bars
  - [ ] Per-floor breakdown
- [ ] **6.5 Room-by-Room Status Grid**
  - [ ] Grid view of all rooms with status icons
  - [ ] Click-to-connect to trapped guests
  - [ ] SOS signal details per room
- [ ] **GIT COMMIT: `feat: first responder bridge with floor plans, translator, and triage`**

## Phase 7: AI Intelligence Layer

- [ ] **7.1 Multimodal Triage**
  - [ ] API route `app/api/triage/route.ts`
  - [ ] Gemini 3 Flash video/audio/image analysis
  - [ ] Hazard classification (fire, flood, structural, medical)
  - [ ] Severity scoring (1-10)
- [ ] **7.2 Incident Synthesis**
  - [ ] Batch report clustering logic
  - [ ] Gemini prompt engineering for incident summaries
  - [ ] Deduplication of related reports
- [ ] **7.3 Privacy-First AI**
  - [ ] PII filtering in all Gemini prompts
  - [ ] Audit logging for AI decisions
- [ ] **GIT COMMIT: `feat: AI intelligence layer with triage, synthesis, and privacy`**

## Phase 8: Real-time Engine (Firebase)

- [ ] **8.1 Firestore Schema & Collections**
  - [ ] `hotels` collection
  - [ ] `rooms` collection
  - [ ] `guests` collection (active sessions)
  - [ ] `sos_reports` collection
  - [ ] `incidents` collection
  - [ ] `danger_zones` collection
  - [ ] `broadcasts` collection
- [ ] **8.2 Real-time Listeners**
  - [ ] Guest status stream (onSnapshot)
  - [ ] Incident feed stream
  - [ ] Danger zone updates stream
  - [ ] Broadcast alerts stream
- [ ] **8.3 Firebase Cloud Messaging**
  - [ ] FCM setup for staff notifications
  - [ ] High-priority alert configuration
  - [ ] Custom notification sounds
- [ ] **GIT COMMIT: `feat: Firebase real-time engine with Firestore and FCM`**

## Phase 9: PWA & Offline Support

- [x] Web App Manifest (`app/manifest.ts`)
- [ ] Service Worker (`public/sw.js`)
- [ ] Offline caching for maps and essential UI
- [ ] PWA icons (192x192 and 512x512)
- [ ] Install prompt for mobile devices
- [ ] **GIT COMMIT: `feat: PWA support with service worker and offline caching`**

## Phase 10: Polish, Security & Accessibility

- [ ] Security headers in `next.config.ts`
- [ ] ARIA labels for all interactive elements
- [ ] High-contrast emergency mode
- [ ] Battery-optimized location tracking
- [ ] Error boundaries and fallback UI
- [ ] Loading skeletons for all dashboard sections
- [ ] Final responsive design pass
- [ ] **GIT COMMIT: `feat: security, accessibility, and performance polish`**

---

## Environment Variables Required

| Variable                                   | Purpose                                  | Where Used |
| ------------------------------------------ | ---------------------------------------- | ---------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase client config                   | Client     |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain                     | Client     |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID                      | Client     |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase storage                         | Client     |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID                            | Client     |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase app ID                          | Client     |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`          | Google Maps JavaScript API               | Client     |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`             | VAPID public key for push notifications  | Client     |
| `GOOGLE_GEMINI_API_KEY`                    | Gemini 3 Flash API key                   | Server     |
| `GOOGLE_CLOUD_TRANSLATION_API_KEY`         | Cloud Translation API                    | Server     |
| `VAPID_PRIVATE_KEY`                        | VAPID private key for push notifications | Server     |
| `FIREBASE_ADMIN_CLIENT_EMAIL`              | Firebase Admin SDK                       | Server     |
| `FIREBASE_ADMIN_PRIVATE_KEY`               | Firebase Admin SDK                       | Server     |

---

## Progress Summary

- **Completed:** 27 / ~80 tasks
- **Current Phase:** Phase 4 — Guest Survival Hub
