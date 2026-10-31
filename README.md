# AROMAXAI — "Give AI a sense of smell."

AROMAXAI is a spatial AI olfactory interface connected to a physical 34-channel dual-ESP32 aroma dispensing hardware unit.

---

## 🔬 Hardware Architecture

- **Master ESP32 Board (`H01–H17`)**: Channels 1–17 (Indices 0–16). Exposes a local HTTP server at `http://192.168.6.155` over WiFi SSID `AromaxAI-Hub`.
- **Slave ESP32 Board (`H18–H34`)**: Channels 18–34 (Indices 0–16). Communicates with the Master via **ESP-NOW**.
- **Chamber Fan (`H30`)**: Airflow circulation fan (Slave index 12, mask `1 << 12`). **Hardware Safety Rule: ALWAYS ACTIVE** during normal operations.
- **Optics RGB Channels**:
  - `H02` = BLUE (Master index 1)
  - `H03` = GREEN (Master index 2)
  - `H13` = RED (Master index 12)
  *(Managed via `LightController` and excluded from scent channels)*
- **Known Hardware Issues**:
  - `H14 Cinnamon`: Marked `NOT WORKING`
  - `H27 Ester Fruit`: Marked `IMPROPER` (erratic dispersion)
  *(Both excluded from AI blends but visible with their diagnostic statuses in the hardware lab)*
- **Unassigned Ports**: `H01`, `H12`, `H17`, `H26` (reserved hardware channels)

---

## 🚀 Key Features

1. **AI Text → Scent Synthesis (`Create`)**: Translates user natural language into structured olfactory blends using `@google/genai` (Gemini 3.8 Flash), strictly validated with **Zod** schemas.
2. **Olfactory Cinema (`Cinema`)**: Timestamp-synchronized video scent player with frame-locked SMPTE cues (e.g. *The Ancient Redwoods*, *Spices of Old Delhi*, *Rain in Tokyo*).
3. **Sensory Therapy (`Therapy`)**: Guided multi-stage wellbeing sessions (e.g. *Deep Relaxation & Rest 10m*, *Cognitive Focus 15m*, *Circadian Sleep 20m*) that automatically advance through stages.
4. **Master Formulation Matrix (`Blends`)**: Predefined master formulations (*Rainy Forest*, *Monsoon*, *Forest*, *Café*, *Temple*, *Dessert*, *Indian Kitchen*, *Fresh*, *Luxury*, *Hearth*).
5. **Technical Hardware Lab (`Device`)**: Channel testing interface (`/device/test`) with 5s, 10s, 20s auto-shutoff pulses, real-time bitmask monitors (`masterMask` and `slaveMask`), and a global **STOP ALL** emergency purge.
6. **Live Diffusion Overlay**: Apple-inspired dual-ring concentric visualizer with high-precision telemetry, pressure, emission rate, and live channel allocation.
7. **Replaceable Transport Abstraction**:
   - `LocalEspTransport`: Direct LAN or backend proxy bridge to `http://192.168.6.155`.
   - `FirebaseTransport`: Cloud gateway streaming to Firebase Realtime Database.
   - `MockTransport`: Offline hardware simulation.

---

## ⚙️ Environment Variables

Create or configure `.env` (refer to `.env.example`):

```bash
# Server-Side Gemini API Key for Olfactory Scent Synthesis
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Application URL
APP_URL="http://localhost:3000"

# Device Configuration
# Options: "local" (physical ESP32 at 192.168.6.155), "cloud" (Firebase), "mock" (offline test)
VITE_DEVICE_MODE="local"
VITE_ESP32_HOST="http://192.168.6.155"

# Optional Firebase Configuration (for cloud sync and remote streaming)
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_DATABASE_URL=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
```

---

## 🛠️ Running the Application

```bash
# Install dependencies
npm install

# Start full-stack dev server (Express backend + Vite client middleware)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
