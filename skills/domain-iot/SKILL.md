---
name: domain-iot
description: "Develops IoT applications and embedded device systems in Rust. Use when connecting sensors, configuring MQTT brokers, processing telemetry data, managing device communication, implementing store-and-forward queues, or building edge computing pipelines. Keywords: IoT, Internet of Things, sensor, MQTT, device, edge computing, telemetry, actuator, smart home, gateway, protocol, 物联网, 传感器, 边缘计算, 智能家居"
user-invocable: false
---

# IoT Domain

> **Layer 3: Domain Constraints**

## Domain Constraints → Design Implications

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| Unreliable network | Offline-first | Local buffering |
| Power constraints | Efficient code | Sleep modes, minimal alloc |
| Resource limits | Small footprint | no_std where needed |
| Security | Encrypted comms | TLS, signed firmware |
| Reliability | Self-recovery | Watchdog, error handling |
| OTA updates | Safe upgrades | Rollback capability |

---

## IoT Project Workflow

1. **Choose runtime** → Check environment table below; pick `tokio` (Linux gateway) or `embassy` (MCU)
2. **Set up messaging** → Configure MQTT client with appropriate QoS level (see code pattern below)
3. **Add offline resilience** → Implement local message queue with persistence; retry with exponential backoff
4. **Add power management** → Use sleep modes between sensor reads; wake on timer or interrupt
5. **Secure communications** → Enable TLS (`rustls` for std, hardware crypto for no_std); sign firmware updates
6. **Validate** → Confirm: messages survive network drop? Device sleeps between reads? All comms encrypted?

---

## Environment Comparison

| Environment | Stack | Crates |
|-------------|-------|--------|
| Linux gateway | tokio + std | rumqttc, reqwest |
| MCU device | embassy + no_std | embedded-hal |
| Hybrid | Split workloads | Both |

## Key Crates

| Purpose | Crate |
|---------|-------|
| MQTT (std) | rumqttc, paho-mqtt |
| Embedded | embedded-hal, embassy |
| Async (std) | tokio |
| Async (no_std) | embassy |
| Logging (no_std) | defmt |
| Logging (std) | tracing |

## Design Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Pub/Sub | Device comms | MQTT topics |
| Edge compute | Local processing | Filter before upload |
| OTA updates | Firmware upgrade | Signed + rollback |
| Power mgmt | Battery life | Sleep + wake events |
| Store & forward | Network reliability | Local queue |

## Code Pattern: MQTT Client with Store-and-Forward

```rust
use rumqttc::{AsyncClient, MqttOptions, QoS, Event, Packet};
use std::time::Duration;
use tokio::sync::mpsc;

/// MQTT client with local buffering for offline resilience.
/// Uses QoS::AtLeastOnce so broker ACKs delivery.
async fn run_mqtt(device_id: &str, broker: &str) -> anyhow::Result<()> {
    let mut options = MqttOptions::new(device_id, broker, 1883);
    options.set_keep_alive(Duration::from_secs(30));

    let (client, mut eventloop) = AsyncClient::new(options, 10);
    let topic_cmd = format!("devices/{device_id}/commands");
    let topic_tel = format!("devices/{device_id}/telemetry");

    client.subscribe(&topic_cmd, QoS::AtLeastOnce).await?;

    // Local buffer: survives transient disconnects
    let (tx, mut rx) = mpsc::channel::<Vec<u8>>(128);

    // Producer: read sensor on interval, buffer locally
    tokio::spawn(async move {
        loop {
            let data = read_sensor().await;
            let _ = tx.send(data).await; // buffer if MQTT is down
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });

    // Publisher: drain buffer → broker
    let pub_client = client.clone();
    let pub_topic = topic_tel.clone();
    tokio::spawn(async move {
        while let Some(data) = rx.recv().await {
            if let Err(e) = pub_client.publish(&pub_topic, QoS::AtLeastOnce, false, data).await {
                tracing::warn!("Publish failed, will retry: {e}");
            }
        }
    });

    // Event loop with reconnect backoff
    let mut backoff = Duration::from_secs(1);
    loop {
        match eventloop.poll().await {
            Ok(Event::Incoming(Packet::Publish(msg))) => {
                handle_command(&msg.payload).await;
                backoff = Duration::from_secs(1); // reset on success
            }
            Ok(_) => {}
            Err(e) => {
                tracing::error!("MQTT error: {e}, retry in {backoff:?}");
                tokio::time::sleep(backoff).await;
                backoff = (backoff * 2).min(Duration::from_secs(60));
            }
        }
    }
}
```

---

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| No retry logic | Lost data | Exponential backoff |
| Always-on radio | Battery drain | Sleep between sends |
| Unencrypted MQTT | Security risk | TLS |
| No local buffer | Network outage = data loss | Persist locally |

---

## Related Skills

| When | See |
|------|-----|
| Embedded patterns | domain-embedded |
| Async patterns | m07-concurrency |
| Error recovery | m13-domain-error |
| Performance | m10-performance |
