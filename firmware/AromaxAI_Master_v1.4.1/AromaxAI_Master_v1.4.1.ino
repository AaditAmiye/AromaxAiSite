#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <FirebaseESP32.h>
#include <esp_now.h>
#include <esp_wifi.h>

// ============================================================
// AROMAXAI MASTER v1.4.4 - Production Hotfix
// - Fixes Device ID NVS stuck on ARX-000000
// - Fixes Fan always-on default
// - Restores full command execution & verbose Serial monitor
// ============================================================

#define FIRMWARE_VERSION   "1.4.4"
#define HARDWARE_MODEL     "ARX-30"

#define FIREBASE_HOST      "aromaxaitest-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH      ""

#define FACTORY_SSID       "AromaxAI-Hub"
#define FACTORY_PASS       "12345678"

// Hardware Output Pins: H01 - H17
const uint8_t outputPins[17] = {
  4,   // H01
  13,  // H02 BLUE (Active HIGH)
  14,  // H03 GREEN (Active HIGH)
  16,  // H04
  17,  // H05
  18,  // H06
  19,  // H07
  21,  // H08
  22,  // H09
  23,  // H10
  25,  // H11
  26,  // H12
  27,  // H13 RED (Active HIGH)
  32,  // H14
  33,  // H15
  5,   // H16
  15   // H17
};

// Fan Hardware Bitmask (H30 on Slave Board)
const uint8_t FAN_SLAVE_INDEX = 12;
const uint32_t FAN_BITMASK    = (1UL << FAN_SLAVE_INDEX);

// Slave ESP-NOW Target MAC
uint8_t slaveMAC[] = { 0xF4, 0x65, 0x0B, 0x4A, 0x70, 0xA0 };
uint8_t currentWiFiChannel = 1;

// Packet Protocols
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

// State Variables: FAN DEFAULTS TO OFF ON BOOT
String deviceId = "aromaxai-master-01";
uint32_t masterMask = 0;
uint32_t slaveMask  = 0; // Default OFF
bool fanEnabled     = false; // Default OFF
int rgbR = 0, rgbG = 0, rgbB = 0;
String lastCommandId = "";

// ESP-NOW ACK Tracker
uint32_t txCounter = 1;
volatile uint32_t lastAckedCounter = 0;
bool pendingSlaveAck = false;
unsigned long lastPacketSentTime = 0;
uint8_t retryCount = 0;

Preferences prefs;
WebServer setupServer(80);
bool isAPMode = false;
unsigned long wifiLostTimestamp = 0;

// Dual Firebase Sockets
FirebaseData fbStream;
FirebaseData fbHeartbeat;
FirebaseConfig config;
FirebaseAuth auth;

unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 2000;
String streamPath = "";

// ============================================================
// HARDWARE OUTPUTS & RGB
// ============================================================

void updateMasterOutputs() {
  for (int i = 0; i < 17; i++) {
    bool state = masterMask & (1UL << i);
    if (i == 1 || i == 2 || i == 12) {
      digitalWrite(outputPins[i], state ? HIGH : LOW); // Active HIGH for LEDs
    } else {
      digitalWrite(outputPins[i], state ? LOW : HIGH);  // Active LOW for Relays
    }
  }
}

void applyRGB(int r, int g, int b) {
  rgbR = constrain(r, 0, 255);
  rgbG = constrain(g, 0, 255);
  rgbB = constrain(b, 0, 255);

  if (rgbR > 127) masterMask |= (1UL << 12); else masterMask &= ~(1UL << 12); // H13 RED
  if (rgbG > 127) masterMask |= (1UL << 2);  else masterMask &= ~(1UL << 2);  // H03 GREEN
  if (rgbB > 127) masterMask |= (1UL << 1);  else masterMask &= ~(1UL << 1);  // H02 BLUE

  updateMasterOutputs();
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
  // Sync fanEnabled explicitly with the fan bit in slaveMask
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
// WI-FI SETUP PORTAL
// ============================================================

void handlePortalRoot() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>AromaxAI Setup</title><style>";
  html += "body{font-family:sans-serif;background:#f5f5f7;padding:20px;text-align:center;}";
  html += ".card{background:white;max-width:360px;margin:auto;padding:24px;border-radius:20px;}";
  html += "input,select{width:100%;padding:10px;margin:6px 0 12px;border-radius:10px;border:1px solid #ccc;box-sizing:border-box;}";
  html += "button{width:100%;padding:12px;background:#0071e3;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;}";
  html += "</style></head><body><div class='card'>";
  html += "<h3>AromaxAI Setup</h3>";
  html += "<form method='POST' action='/save'>";
  html += "<label style='font-size:12px;font-weight:bold;display:block;text-align:left;'>Select 2.4 GHz Network:</label>";
  html += "<select name='ssid'>";

  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++) {
    html += "<option value='" + WiFi.SSID(i) + "'>" + WiFi.SSID(i) + "</option>";
  }
  html += "</select>";
  html += "<label style='font-size:12px;font-weight:bold;display:block;text-align:left;'>Password:</label>";
  html += "<input type='password' name='pass' required>";
  html += "<button type='submit'>Save and Connect</button>";
  html += "</form></div></body></html>";
  setupServer.send(200, "text/html", html);
}

void handlePortalSave() {
  prefs.putString("wifi_ssid", setupServer.arg("ssid"));
  prefs.putString("wifi_pass", setupServer.arg("pass"));
  setupServer.send(200, "text/html", "<html><body><h3>Credentials Saved! Rebooting...</h3></body></html>");
  delay(1000);
  ESP.restart();
}

void startSetupAP() {
  isAPMode = true;
  WiFi.mode(WIFI_AP_STA);
  String apName = "AromaxAI-Setup-" + deviceId;
  WiFi.softAP(apName.c_str());

  setupServer.on("/", handlePortalRoot);
  setupServer.on("/save", handlePortalSave);
  setupServer.begin();

  Serial.println("[SETUP AP READY] Connect to: " + apName + " -> http://192.168.4.1");
}

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println("\n==========================================");
  Serial.println(" AROMAXAI MASTER v1.4.4 (Production Core)");
  Serial.println("==========================================");

  // 1. Initialize master GPIO pins
  for (int i = 0; i < 17; i++) {
    pinMode(outputPins[i], OUTPUT);
    digitalWrite(outputPins[i], (i == 1 || i == 2 || i == 12) ? LOW : HIGH);
  }

  // 2. Clear corrupted NVS deviceId if it was saved as ARX-000000
  prefs.begin("arx_factory", false);
  String savedId = prefs.getString("deviceId", "");
  if (savedId == "ARX-000000" || savedId == "" || savedId.length() < 3) {
    deviceId = "aromaxai-master-01";
    prefs.putString("deviceId", deviceId);
    Serial.println("[NVS] Cleared bad ID -> Reassigned: " + deviceId);
  } else {
    deviceId = savedId;
  }

  String savedSSID = prefs.getString("wifi_ssid", FACTORY_SSID);
  String savedPass = prefs.getString("wifi_pass", FACTORY_PASS);

  Serial.printf("Active Hardware ID: %s\n", deviceId.c_str());

  // 3. Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  Serial.print("Connecting to Wi-Fi: " + savedSSID);
  WiFi.begin(savedSSID.c_str(), savedPass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWi-Fi timeout. Starting Setup AP...");
    startSetupAP();
    return;
  }

  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

  // 4. ESP-NOW Initialization
  currentWiFiChannel = WiFi.channel();
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

  // Ensure fan is initially OFF on Slave board
  fanEnabled = false;
  slaveMask  = 0;
  sendChannelBeacon();
  sendSlaveState();
  Serial.println("Initial Hardware State Sent: ALL OFF (Fan OFF)");

  // 5. Firebase SSL Buffers
  fbStream.setBSSLBufferSize(1024, 512);
  fbHeartbeat.setBSSLBufferSize(512, 512);

  config.database_url = FIREBASE_HOST;
  if (String(FIREBASE_AUTH).length() > 5) {
    config.signer.tokens.legacy_token = FIREBASE_AUTH;
  } else {
    config.signer.test_mode = true;
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // 6. Begin Stream on the device's command path
  streamPath = "/devices/" + deviceId + "/command";
  if (!Firebase.beginStream(fbStream, streamPath)) {
    Serial.println("[Firebase] Stream Error: " + fbStream.errorReason());
  } else {
    Serial.println("[Firebase] Listening to commands on: " + streamPath);
  }

  Serial.println("AROMAXAI MASTER Ready and Waiting for Web App Commands.\n");
}

// ============================================================
// LOOP
// ============================================================

void loop() {
  if (isAPMode) {
    setupServer.handleClient();
    delay(5);
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    if (wifiLostTimestamp == 0) wifiLostTimestamp = millis();
    if (millis() - wifiLostTimestamp > 60000) {
      startSetupAP();
      return;
    }
    delay(10);
    return;
  } else {
    wifiLostTimestamp = 0;
    if (WiFi.channel() != currentWiFiChannel) {
      Serial.printf("[ESP-NOW] Channel shifted to %d. Re-syncing...\n", WiFi.channel());
      reRegisterEspNowPeer(WiFi.channel());
    }
  }

  handleSlaveAckRetries();

  // 1. Send Heartbeat Every 2 Seconds via fbHeartbeat
  if (millis() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = millis();

    String hbPath = "/devices/" + deviceId + "/heartbeat";
    if (Firebase.setTimestamp(fbHeartbeat, hbPath)) {
      Serial.println("[HEARTBEAT] 2s pulse sent -> " + hbPath);
    } else {
      Serial.println("[HEARTBEAT] Error: " + fbHeartbeat.errorReason());
    }

    // Keep legacy alias alive so web app never loses connection
    if (deviceId != "aromaxai-master-01") {
      Firebase.setTimestamp(fbHeartbeat, "/devices/aromaxai-master-01/heartbeat");
    }

    sendChannelBeacon();
  }

  // 2. Read Real-Time Commands via fbStream
  if (!Firebase.readStream(fbStream)) {
    // If stream disconnected, automatically reconnect
    if (fbStream.httpCode() == 0 || fbStream.httpCode() == -1) {
      Serial.println("[Firebase] Reconnecting stream...");
      Firebase.beginStream(fbStream, streamPath);
    }
  } else {
    if (fbStream.streamAvailable()) {
      if (fbStream.dataType() == "json") {
        FirebaseJson &json = fbStream.jsonObject();
        FirebaseJsonData jsonData;

        json.get(jsonData, "commandId");
        if (jsonData.success) {
          String cmdId = jsonData.stringValue;
          if (cmdId != lastCommandId) {
            lastCommandId = cmdId;

            // Master Mask (H01 - H17)
            json.get(jsonData, "masterMask");
            if (jsonData.success) masterMask = (uint32_t)jsonData.intValue;

            // Slave Mask (H18 - H34)
            json.get(jsonData, "slaveMask");
            if (jsonData.success) slaveMask = (uint32_t)jsonData.intValue;

            // Explicit Fan Control (H30)
            json.get(jsonData, "fan");
            if (jsonData.success) {
              fanEnabled = jsonData.boolValue;
            } else {
              fanEnabled = (slaveMask & FAN_BITMASK) != 0;
            }

            // Enforce fan bit into slaveMask
            if (fanEnabled) slaveMask |= FAN_BITMASK;
            else slaveMask &= ~FAN_BITMASK;

            // RGB
            int r = 0, g = 0, b = 0;
            json.get(jsonData, "r");
            if (jsonData.success) r = jsonData.intValue;
            json.get(jsonData, "g");
            if (jsonData.success) g = jsonData.intValue;
            json.get(jsonData, "b");
            if (jsonData.success) b = jsonData.intValue;

            // Apply to hardware
            applyRGB(r, g, b);
            sendSlaveState();

            Serial.println("\n-------------------------------------------");
            Serial.printf(">>> [COMMAND EXECUTED] ID: %s\n", cmdId.c_str());
            Serial.printf("    MasterMask: 0x%05X\n", masterMask);
            Serial.printf("    SlaveMask:  0x%05X\n", slaveMask);
            Serial.printf("    Fan H30:    %s\n", fanEnabled ? "ON (ACTIVE)" : "OFF (STOPPED)");
            Serial.printf("    RGB Light:  R=%d G=%d B=%d\n", r, g, b);
            Serial.println("-------------------------------------------");
          }
        }
      }
    }
  }

  delay(2);
}
