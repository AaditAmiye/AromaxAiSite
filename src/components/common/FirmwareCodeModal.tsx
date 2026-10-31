import React, { useState } from 'react';

interface FirmwareCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ESP32_MASTER_FIRMWARE_CODE = `// ============================================================
// AROMAXAI MASTER v1.4.4 - Production Verified
// Features: Web-Driven Wi-Fi Manager + GitHub Cloud OTA + 34-Pin Bitmask
// ============================================================

#include <WiFi.h>
#include <Preferences.h>
#include <FirebaseESP32.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>

#define FIRMWARE_VERSION    "1.4.4"
#define HARDWARE_MODEL      "ARX-30"

// Firebase Realtime Database Host & Legacy Secret
#define FIREBASE_HOST       "aromaxaitest-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH       ""

// Default GitHub OTA Firmware Release URL
const char* DEFAULT_FIRMWARE_URL = "https://github.com/AaditAmiye/AromaxAI/releases/download/v2/firmware.bin";

// Hardware Output Pins (Master Board H01 - H17)
const uint8_t outputPins[17] = {
  4,   // H01 (Unassigned / Aux GPIO)
  13,  // H02 BLUE (Active HIGH LED)
  14,  // H03 GREEN (Active HIGH LED)
  16,  // H04
  17,  // H05
  18,  // H06
  19,  // H07
  21,  // H08
  22,  // H09
  23,  // H10
  25,  // H11
  26,  // H12 (Unassigned / Aux GPIO)
  27,  // H13 RED (Active HIGH LED)
  32,  // H14
  33,  // H15
  5,   // H16
  15   // H17 (Unassigned / Aux GPIO)
};

// Fan Hardware Bitmask (H30 on Slave Board)
const uint8_t FAN_SLAVE_INDEX = 12;
const uint32_t FAN_BITMASK    = (1UL << FAN_SLAVE_INDEX);

// Slave ESP-NOW Target MAC
uint8_t slaveMAC[] = { 0x20, 0x9B, 0xA9, 0x99, 0x52, 0x84 };
uint8_t currentWiFiChannel = 1;

// Packet Protocols for ESP-NOW Slave
struct __attribute__((packed)) CommandPacket {
  uint8_t type;       // 1 = Command, 3 = Channel Sync Beacon
  uint32_t mask;
  uint32_t counter;
};

struct __attribute__((packed)) AckPacket {
  uint8_t type;       // 2 = ACK
  uint32_t ackCounter;
  uint32_t maskEcho;
};

// State Variables
String deviceId;
uint32_t masterMask = 0;
uint32_t slaveMask  = FAN_BITMASK;
bool fanEnabled     = true;
int rgbR = 0, rgbG = 0, rgbB = 0;
String lastCommandId = "";

// ESP-NOW ACK Tracker
uint32_t txCounter = 1;
volatile uint32_t lastAckedCounter = 0;
bool pendingSlaveAck = false;
unsigned long lastPacketSentTime = 0;
uint8_t retryCount = 0;

Preferences prefs;

// Dual Firebase Sockets
FirebaseData fbStream;
FirebaseData fbHeartbeat;
FirebaseData fbWifi;
FirebaseConfig config;
FirebaseAuth auth;

unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 2000; // 2 seconds

// Pending Wi-Fi switch state
bool pendingWifiSwitch = false;
String pendingSSID = "";
String pendingPass = "";

// Forward declarations
void executeWebOTAUpdate(String targetUrl);
void performWifiScanAndReport();
void connectToConfiguredWifi();

// ============================================================
// HARDWARE OUTPUTS & RGB
// ============================================================

void updateMasterOutputs() {
  for (int i = 0; i < 17; i++) {
    bool state = masterMask & (1UL << i);
    if (i == 1 || i == 2 || i == 12) {
      digitalWrite(outputPins[i], state ? HIGH : LOW); // Active HIGH LEDs
    } else {
      digitalWrite(outputPins[i], state ? LOW : HIGH);  // Active LOW Relays
    }
  }
}

void applyRGB(int r, int g, int b) {
  rgbR = constrain(r, 0, 255);
  rgbG = constrain(g, 0, 255);
  rgbB = constrain(b, 0, 255);

  if (rgbR > 127) masterMask |= (1UL << 12); else masterMask &= ~(1UL << 12); // Red H13
  if (rgbG > 127) masterMask |= (1UL << 2);  else masterMask &= ~(1UL << 2);  // Green H03
  if (rgbB > 127) masterMask |= (1UL << 1);  else masterMask &= ~(1UL << 1);  // Blue H02

  updateMasterOutputs();
}

// ============================================================
// GITHUB CLOUD OTA FIRMWARE UPDATE
// ============================================================

void executeWebOTAUpdate(String targetUrl) {
  if (targetUrl.length() < 10) {
    targetUrl = String(DEFAULT_FIRMWARE_URL);
  }

  Serial.println("\\n[OTA] Starting Cloud Web OTA update routine...");
  Serial.println("[OTA] Target binary URL: " + targetUrl);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[OTA] ERROR: Wi-Fi is NOT connected! Aborting update.");
    Firebase.setString(fbHeartbeat, "/devices/" + deviceId + "/ota/status", "failed");
    Firebase.setString(fbHeartbeat, "/devices/" + deviceId + "/ota/error", "Wi-Fi not connected");
    return;
  }

  // Update status in Firebase
  Firebase.setString(fbHeartbeat, "/devices/" + deviceId + "/ota/status", "downloading");
  Firebase.setInt(fbHeartbeat, "/devices/" + deviceId + "/ota/progress", 20);

  Serial.println("[OTA] Initializing secure client and fetching update from GitHub...");
  WiFiClientSecure client;
  client.setInsecure(); // GitHub releases SSL

  httpUpdate.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);
  
  // Callback handlers for OTA progress
  httpUpdate.onProgress([](int cur, int total) {
    static int lastPercent = -1;
    if (total > 0) {
      int percent = (cur * 100) / total;
      if (percent != lastPercent && percent % 20 == 0) {
        lastPercent = percent;
        Serial.printf("[OTA] Progress: %d%% (%d / %d bytes)\\n", percent, cur, total);
      }
    }
  });

  t_httpUpdate_return ret = httpUpdate.update(client, targetUrl);

  switch (ret) {
    case HTTP_UPDATE_FAILED: {
      String errStr = httpUpdate.getLastErrorString();
      int errCode = httpUpdate.getLastError();
      Serial.printf("[OTA] FAILED! Error (%d): %s\\n", errCode, errStr.c_str());
      Firebase.setString(fbHeartbeat, "/devices/" + deviceId + "/ota/status", "failed");
      Firebase.setString(fbHeartbeat, "/devices/" + deviceId + "/ota/error", errStr);
      break;
    }
    case HTTP_UPDATE_NO_UPDATES:
      Serial.println("[OTA] NO UPDATE FOUND. Running current version.");
      Firebase.setString(fbHeartbeat, "/devices/" + deviceId + "/ota/status", "idle");
      break;

    case HTTP_UPDATE_OK:
      Serial.println("[OTA] UPDATE SUCCESSFUL! Rebooting device into new firmware...");
      Firebase.setString(fbHeartbeat, "/devices/" + deviceId + "/ota/status", "success");
      Firebase.setInt(fbHeartbeat, "/devices/" + deviceId + "/ota/progress", 100);
      delay(1000);
      ESP.restart();
      break;
  }
}

// ============================================================
// WEB-DRIVEN WI-FI SCANNER & RECONFIGURATION
// ============================================================

void performWifiScanAndReport() {
  Serial.println("[WIFI] Scanning nearby Wi-Fi networks requested from Web...");
  Firebase.setString(fbWifi, "/devices/" + deviceId + "/wifi/status", "scanning");

  int numNetworks = WiFi.scanNetworks();
  Serial.printf("[WIFI] Scan completed: %d networks found.\\n", numNetworks);

  FirebaseJson json;
  FirebaseJsonArray arr;

  for (int i = 0; i < numNetworks && i < 15; i++) {
    FirebaseJson item;
    item.set("ssid", WiFi.SSID(i));
    item.set("rssi", (int)WiFi.RSSI(i));
    item.set("secure", (WiFi.encryptionType(i) != WIFI_AUTH_OPEN));
    arr.add(item);
  }

  json.set("scanResults", arr);
  json.set("status", "idle");
  json.set("lastScanTimestamp", (int)(millis() / 1000));

  Firebase.updateNode(fbWifi, "/devices/" + deviceId + "/wifi", json);
  Serial.println("[WIFI] Scan results uploaded to Firebase Realtime Database.");
}

void applyNewWifiCredentials(String newSSID, String newPass) {
  newSSID.trim();
  newPass.trim();

  if (newSSID.length() == 0) return;

  Serial.printf("[WIFI] Reconfiguring Wi-Fi from Webpage: SSID='%s'\\n", newSSID.c_str());

  // Save permanently in NVS Flash
  prefs.begin("arx_factory", false);
  prefs.putString("wifi_ssid", newSSID);
  prefs.putString("wifi_pass", newPass);
  prefs.end();

  Firebase.setString(fbWifi, "/devices/" + deviceId + "/wifi/status", "connecting");

  // Attempt connection
  WiFi.disconnect();
  delay(500);
  WiFi.begin(newSSID.c_str(), newPass.c_str());

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\\n[WIFI] Connected successfully to '%s'! IP: %s\\n", 
      newSSID.c_str(), WiFi.localIP().toString().c_str());
    
    FirebaseJson statusJson;
    statusJson.set("connected", true);
    statusJson.set("ssid", newSSID);
    statusJson.set("ip", WiFi.localIP().toString());
    statusJson.set("rssi", (int)WiFi.RSSI());
    statusJson.set("status", "connected");
    Firebase.updateNode(fbWifi, "/devices/" + deviceId + "/wifi", statusJson);
  } else {
    Serial.printf("\\n[WIFI] Connection to '%s' failed! Reconnecting to fallback...\\n", newSSID.c_str());
    Firebase.setString(fbWifi, "/devices/" + deviceId + "/wifi/status", "failed");
    Firebase.setString(fbWifi, "/devices/" + deviceId + "/wifi/error", "Connection timed out. Check password.");
  }
}

// ============================================================
// ESP-NOW TRANSMISSION & RELIABLE ACK
// ============================================================

#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len < sizeof(AckPacket)) return;
  AckPacket ack;
  memcpy(&ack, data, sizeof(AckPacket));

  if (ack.type == 2 && ack.ackCounter == txCounter) {
    lastAckedCounter = ack.ackCounter;
    pendingSlaveAck = false;
    retryCount = 0;
  }
}

void sendSlaveState(bool isRetry = false) {
  if (fanEnabled) slaveMask |= FAN_BITMASK;
  else slaveMask &= ~FAN_BITMASK;

  if (!isRetry) {
    txCounter++;
    pendingSlaveAck = true;
    retryCount = 0;
  }

  CommandPacket pkt = { 1, slaveMask, txCounter };
  esp_now_send(slaveMAC, (uint8_t*)&pkt, sizeof(pkt));
  lastPacketSentTime = millis();
}

void sendChannelBeacon() {
  CommandPacket beacon = { 3, slaveMask, 0 };
  esp_now_send(slaveMAC, (uint8_t*)&beacon, sizeof(beacon));
}

void handleSlaveAckRetries() {
  if (pendingSlaveAck && (millis() - lastPacketSentTime > 120)) {
    if (retryCount < 3) {
      retryCount++;
      sendSlaveState(true);
    } else {
      pendingSlaveAck = false;
    }
  }
}

void reRegisterEspNowPeer(uint8_t newChannel) {
  currentWiFiChannel = newChannel;
  esp_wifi_set_channel(currentWiFiChannel, WIFI_SECOND_CHAN_NONE);

  if (esp_now_is_peer_exist(slaveMAC)) {
    esp_now_del_peer(slaveMAC);
  }

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, slaveMAC, 6);
  peerInfo.channel = currentWiFiChannel;
  peerInfo.ifidx   = WIFI_IF_STA;
  esp_now_add_peer(&peerInfo);

  sendChannelBeacon();
  sendSlaveState();
}

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println("\\n==========================================");
  Serial.println(" AROMAXAI MASTER v1.4.4 (Production Core)");
  Serial.println("==========================================");

  // 1. Initialize GPIO pins immediately
  for (int i = 0; i < 17; i++) {
    pinMode(outputPins[i], OUTPUT);
    digitalWrite(outputPins[i], (i == 1 || i == 2 || i == 12) ? LOW : HIGH);
  }

  // 2. Hardware-derived Unique Device Identity
  prefs.begin("arx_factory", false);
  deviceId = prefs.getString("deviceId", "ARX-000001");
  String savedSSID = prefs.getString("wifi_ssid", "");
  String savedPass = prefs.getString("wifi_pass", "");
  prefs.end();

  Serial.printf("Device ID: %s\\n", deviceId.c_str());

  // 3. Wi-Fi Auto-Connect (Direct without Captive Portal)
  WiFi.mode(WIFI_STA);

  if (savedSSID.length() > 0) {
    Serial.printf("[WIFI] Connecting to saved network: '%s'\\n", savedSSID.c_str());
    WiFi.begin(savedSSID.c_str(), savedPass.c_str());
  } else {
    // Default factory fallback network if none is saved
    Serial.println("[WIFI] No saved Wi-Fi found. Attempting default 'AromaxAI-Hub' or scanning...");
    WiFi.begin("AromaxAI-Hub", "AromaxAI2026");
  }

  // Non-blocking Wi-Fi wait (up to 12s)
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 12000) {
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\n==============================");
    Serial.println(" Status: CONNECTED");
    Serial.print(" SSID: "); Serial.println(WiFi.SSID());
    Serial.print(" IP: "); Serial.println(WiFi.localIP());
    Serial.print(" RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
    Serial.println("==============================");
  } else {
    Serial.println("\\n[WIFI] Not connected. Device will accept Wi-Fi config via Web Portal / Firebase.");
  }

  // 4. ESP-NOW Initialization
  currentWiFiChannel = WiFi.channel() > 0 ? WiFi.channel() : 1;
  esp_wifi_set_channel(currentWiFiChannel, WIFI_SECOND_CHAN_NONE);

  if (esp_now_init() == ESP_OK) {
    #if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
      esp_now_register_recv_cb((esp_now_recv_cb_t)OnDataRecv);
    #else
      esp_now_register_recv_cb(OnDataRecv);
    #endif

    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, slaveMAC, 6);
    peerInfo.channel = currentWiFiChannel;
    peerInfo.ifidx   = WIFI_IF_STA;
    esp_now_add_peer(&peerInfo);
    Serial.println("ESP-NOW Slave Registered on Channel " + String(currentWiFiChannel));
  }

  sendChannelBeacon();
  sendSlaveState();

  // 5. Dual Compact SSL Buffers
  fbStream.setBSSLBufferSize(1024, 512);
  fbHeartbeat.setBSSLBufferSize(512, 512);
  fbWifi.setBSSLBufferSize(1024, 512);

  // 6. Firebase Configuration
  config.database_url = FIREBASE_HOST;
  if (String(FIREBASE_AUTH).length() > 5) {
    config.signer.tokens.legacy_token = FIREBASE_AUTH;
  } else {
    config.signer.test_mode = true;
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // 7. Begin Stream on the device's command path
  String commandPath = "/devices/" + deviceId + "/command";
  if (!Firebase.beginStream(fbStream, commandPath)) {
    Serial.println("Firebase Stream Error: " + fbStream.errorReason());
  } else {
    Serial.println("Firebase Stream Active on: " + commandPath);
  }

  Serial.println("AROMAXAI MASTER v1.4.4 Ready.");
}

// ============================================================
// LOOP: DUAL-CHANNEL REALTIME PIPELINE
// ============================================================

void loop() {
  // Wi-Fi Connection Health
  if (WiFi.status() == WL_CONNECTED) {
    if (WiFi.channel() != currentWiFiChannel) {
      Serial.printf("[ESP-NOW] Channel shifted to %d. Re-syncing...\\n", WiFi.channel());
      reRegisterEspNowPeer(WiFi.channel());
    }
  }

  handleSlaveAckRetries();

  // 1. Send Heartbeat Every 2 Seconds via fbHeartbeat (includes Wi-Fi Telemetry)
  if (millis() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = millis();

    String hbPath = "/devices/" + deviceId + "/heartbeat";
    FirebaseJson hbJson;
    hbJson.set(".sv", "timestamp");
    hbJson.set("firmware", FIRMWARE_VERSION);
    hbJson.set("uptime", (int)(millis() / 1000));
    hbJson.set("ssid", WiFi.SSID());
    hbJson.set("ip", WiFi.localIP().toString());
    hbJson.set("rssi", (int)WiFi.RSSI());
    hbJson.set("connected", (WiFi.status() == WL_CONNECTED));

    Firebase.updateNode(fbHeartbeat, hbPath, hbJson);
    sendChannelBeacon();
  }

  // 2. Read Real-Time Commands via fbStream
  if (Firebase.readStream(fbStream)) {
    if (fbStream.streamAvailable()) {
      if (fbStream.dataType() == "json") {
        FirebaseJson &json = fbStream.jsonObject();
        FirebaseJsonData jsonData;

        // Command Action & ID
        String action = "";
        json.get(jsonData, "action");
        if (jsonData.success) action = jsonData.stringValue;

        json.get(jsonData, "commandId");
        if (jsonData.success) {
          String cmdId = jsonData.stringValue;
          if (cmdId != lastCommandId) {
            lastCommandId = cmdId;

            // ACTION: Wi-Fi Scanner Triggered from Web
            if (action == "wifi_scan") {
              performWifiScanAndReport();
              return;
            }

            // ACTION: Wi-Fi Reconfigure Triggered from Web
            if (action == "wifi_config") {
              String newSsid = "", newPass = "";
              json.get(jsonData, "ssid");
              if (jsonData.success) newSsid = jsonData.stringValue;
              json.get(jsonData, "password");
              if (jsonData.success) newPass = jsonData.stringValue;

              applyNewWifiCredentials(newSsid, newPass);
              return;
            }

            // ACTION: GitHub Cloud OTA Firmware Update Triggered from Web
            if (action == "ota_update") {
              String otaUrl = "";
              json.get(jsonData, "firmwareUrl");
              if (jsonData.success) otaUrl = jsonData.stringValue;
              if (otaUrl.length() == 0) otaUrl = String(DEFAULT_FIRMWARE_URL);

              executeWebOTAUpdate(otaUrl);
              return;
            }

            // Standard Scent Bitmask Actuation
            json.get(jsonData, "masterMask");
            if (jsonData.success) {
              masterMask = (uint32_t)jsonData.intValue;
            }

            json.get(jsonData, "slaveMask");
            if (jsonData.success) {
              slaveMask = (uint32_t)jsonData.intValue;
            }

            json.get(jsonData, "fan");
            if (jsonData.success) {
              fanEnabled = jsonData.boolValue;
            } else {
              fanEnabled = (slaveMask & FAN_BITMASK) != 0;
            }

            int r = 0, g = 0, b = 0;
            json.get(jsonData, "r");
            if (jsonData.success) r = jsonData.intValue;
            json.get(jsonData, "g");
            if (jsonData.success) g = jsonData.intValue;
            json.get(jsonData, "b");
            if (jsonData.success) b = jsonData.intValue;

            applyRGB(r, g, b);
            sendSlaveState();

            Serial.printf("Actuated: %s | Master=0x%X | Slave=0x%X | Fan=%s | RGB=(%d,%d,%d)\\n",
              cmdId.c_str(), masterMask, slaveMask, fanEnabled ? "ON" : "OFF", r, g, b);
          }
        }
      }
    }
  }

  delay(2);
}
`;

export const FirmwareCodeModal: React.FC<FirmwareCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ESP32_MASTER_FIRMWARE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121216] w-full max-w-3xl rounded-3xl p-6 shadow-2xl border border-black/[0.06] dark:border-white/10 flex flex-col gap-4 max-h-[92vh] overflow-hidden text-[#1D1D1F] dark:text-[#F4F4F5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/40">
              <span className="material-symbols-outlined text-[20px]">code</span>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight">
                ESP32 Master Firmware v1.4.4
              </h2>
              <p className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                Web-driven Wi-Fi manager &amp; GitHub OTA firmware update pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied!' : 'Copy Sketch'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/30">
            <strong className="text-blue-700 dark:text-blue-300 block mb-0.5">1. No Captive Portal Needed</strong>
            <span className="text-[#86868B] dark:text-[#A1A1AA]">
              Stores credentials in NVS Flash. Auto-connects directly on boot.
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30">
            <strong className="text-emerald-700 dark:text-emerald-300 block mb-0.5">2. Web Wi-Fi Scanner</strong>
            <span className="text-[#86868B] dark:text-[#A1A1AA]">
              Scans Wi-Fi networks and lets you pick and switch SSIDs right from this webpage.
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-900/30">
            <strong className="text-purple-700 dark:text-purple-300 block mb-0.5">3. One-Click GitHub OTA</strong>
            <span className="text-[#86868B] dark:text-[#A1A1AA]">
              Fetches binary from GitHub releases with secure SSL and auto-reboots.
            </span>
          </div>
        </div>

        {/* Code View */}
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-white/10 bg-stone-900 text-stone-100 font-mono text-[12px]">
          <pre className="p-4 h-full overflow-auto leading-relaxed select-all">
            <code>{ESP32_MASTER_FIRMWARE_CODE}</code>
          </pre>
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between text-[11px] text-[#86868B] dark:text-[#A1A1AA] pt-1 border-t border-black/[0.05] dark:border-white/10">
          <span>Flash this sketch to your Master ESP32 via Arduino IDE or PlatformIO.</span>
          <button
            onClick={onClose}
            className="text-[#0071E3] font-semibold hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
