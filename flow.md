Here is the complete end-to-end flow of **GuardianLink**, divided into the **User Narrative** (what happens) and the **Technical Data Flow** (how it works).

---

## 1. The Crisis Narrative: From Spark to Safety

### **Step 1: The Activation (Zero-Hour)**

- **Trigger:** A hotel smoke detector goes off, or a staff member triggers a "Code Red" on their dashboard.
- **Broadcast:** GuardianLink instantly sends a "Critical Alert" push notification to all staff (via Capacitor) and triggers a Wi-Fi redirect for guests.

### **Step 2: Guest Entry (The Zero-Install)**

- **Access:** A guest hears the alarm and checks their phone. They see a notification or scan the QR code on the back of their door.
- **The Hub:** The **Next.js PWA** opens instantly. The guest doesn't log in; the system recognizes their room number via a unique URL parameter (e.g., `guardian.link/room/402`).

### **Step 3: Intelligence Gathering (Multimodal Triage)**

- **The Report:** The guest taps "I need help" and holds a button to record a 5-second video of the hallway.
- **AI Analysis:** **Gemini 3 Flash** analyzes the video in the background. It detects thick black smoke (indicating a chemical/plastic fire) and hears a structural creak.
- **Status Update:** The Guest's status changes to **"Critical - Trapped"** on the staff heatmap.

### **Step 4: The Escape (Dynamic Navigation)**

- **The Route:** The guest sees a 3D floor plan. A glowing green path shows them the way out.
- **The Reroute:** Suddenly, a staff member marks "Stairwell A" as blocked. The guest’s path **instantly shifts** on their screen, directing them to "Stairwell B" instead.

### **Step 5: Professional Intervention (The Tactical Bridge)**

- **First Responders Arrive:** Firefighters open the **Responder Bridge** on their tablets.
- **X-Ray Vision:** They see exactly which rooms still have active devices and which guests have tapped "I am Safe."
- **Voice Bridge:** A firefighter connects to the trapped guest in Room 402. The guest speaks Spanish; the firefighter hears English. **Gemini Live** handles the translation in real-time.

---

## 2. The Technical Data Flow: Behind the Scenes

| Sequence          | Action                                           | Technology Involved                              |
| :---------------- | :----------------------------------------------- | :----------------------------------------------- |
| **1. Trigger**    | Sensor data or Staff Input sent to Backend.      | **Node.js (Next.js Server Action)**              |
| **2. Broadcast**  | Global alert pushed to all connected clients.    | **Firebase Cloud Messaging (FCM)**               |
| **3. Ingestion**  | Guest uploads video/audio distress signal.       | **Cloudinary unsigned upload + Next.js API**     |
| **4. Triage**     | Multimodal analysis of the distress signal.      | **Gemini 3 Flash (Vertex AI)**                   |
| **5. Sync**       | AI summary & location pushed to Dashboards.      | **Firestore Real-time Streams**                  |
| **6. Navigation** | Dynamic pathing calculated based on hazard pins. | **OpenStreetMap + Leaflet + Custom Pathfinding** |
| **7. Bridge**     | Voice-to-voice translation established.          | **Gemini Live API (WebSockets)**                 |

---

## 3. The Lifecycle of a Data Point (Example: A Fire Report)

1.  **Frontend (Guest PWA):** User captures video of fire $\rightarrow$ Sent to `api/triage`.
2.  **Backend (Next.js):** Receives video $\rightarrow$ Forwards to **Gemini 3 Flash** with the prompt: _"Identify hazard level and location context."_
3.  **AI Layer:** Gemini returns JSON: `{ "hazard": "fire", "severity": 9, "detail": "electrical" }`.
4.  **Database (Firestore):** The record for Room 402 is updated.
5.  **Reactive UI:** The **Staff Dashboard** (listening to Firestore) flashes red and plays an alert sound. The **Responder Tablet** updates the map icon for Room 402 to a "Fire" glyph.

---
