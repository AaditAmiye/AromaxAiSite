#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

// ============================================================
// AROMAXAI SLAVE v1.4.1 - Energy-Efficient Dynamic Auto-Lock
// Compatible with ESP32 Arduino Core 2.x and 3.3.5
// ============================================================

// Physical Pins: H18 - H34 (Indices 0 - 16)
const uint8_t outputPins[17] = { 4, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 5, 15 };

#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// Master's MAC (Auto-learned or specified)
uint8_t masterMAC[6] = { 0 };
bool hasMasterMAC = false;

volatile uint32_t requestedMask = 0;
volatile uint32_t rxCounter     = 0;
volatile bool newCommand        = false;
volatile bool shouldSendAck     = false;

uint32_t currentMask = 0;
int currentChannel   = 1;
bool isChannelLocked = false;
unsigned long lastPacketReceivedTime = 0;
const unsigned long CHANNEL_LOSS_TIMEOUT_MS = 8000; // 8 seconds

// Packets
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

void updateOutputs() {
  uint32_t mask = currentMask;
  for (int i = 0; i < 17; i++) {
    bool state = mask & (1UL << i);
    digitalWrite(outputPins[i], state ? RELAY_ON : RELAY_OFF);
  }
}

// Fast ISR Callback
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  const uint8_t *mac = info->src_addr;
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len < sizeof(CommandPacket)) return;

  CommandPacket pkt;
  memcpy(&pkt, data, sizeof(CommandPacket));

  // Lock to Master's MAC on first contact
  if (!hasMasterMAC) {
    memcpy(masterMAC, mac, 6);
    hasMasterMAC = true;

    // Register Master as Peer for ACKs
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, masterMAC, 6);
    peerInfo.channel = currentChannel;
    peerInfo.ifidx   = WIFI_IF_STA;
    esp_now_add_peer(&peerInfo);
  }

  isChannelLocked = true;
  lastPacketReceivedTime = millis();

  if (pkt.type == 1) { // Command
    requestedMask = pkt.mask;
    rxCounter     = pkt.counter;
    newCommand    = true;
    shouldSendAck = true;
  } else if (pkt.type == 3) { // Channel Beacon
    // Channel verified alive
  }
}

void setup() {
  Serial.begin(115200);

  // Initialize relays to OFF
  for (int i = 0; i < 17; i++) {
    pinMode(outputPins[i], OUTPUT);
    digitalWrite(outputPins[i], RELAY_OFF);
  }

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW Init Failed");
    return;
  }

  #if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
    esp_now_register_recv_cb((esp_now_recv_cb_t)OnDataRecv);
  #else
    esp_now_register_recv_cb(OnDataRecv);
  #endif

  Serial.println("Slave Ready. Searching for Master's Wi-Fi channel...");
}

void loop() {
  // 1. Process Hardware Command
  if (newCommand) {
    noInterrupts();
    uint32_t mask = requestedMask;
    uint32_t cnt  = rxCounter;
    newCommand    = false;
    interrupts();

    currentMask = mask;
    updateOutputs();

    // Send Application-Level ACK back to Master
    if (shouldSendAck && hasMasterMAC) {
      AckPacket ack = { 2, cnt, mask };
      esp_now_send(masterMAC, (uint8_t*)&ack, sizeof(AckPacket));
      shouldSendAck = false;
    }
  }

  // 2. Passive Channel Hopping (Low energy: hops only if unlocked or link lost)
  if (!isChannelLocked || (millis() - lastPacketReceivedTime > CHANNEL_LOSS_TIMEOUT_MS)) {
    isChannelLocked = false;
    currentChannel++;
    if (currentChannel > 13) currentChannel = 1;

    esp_wifi_set_channel(currentChannel, WIFI_SECOND_CHAN_NONE);
    delay(35); // 35ms listening window per channel
  } else {
    delay(2);
  }
}
