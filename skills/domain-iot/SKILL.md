---
name: domain-iot
description: "Use when building IoT apps. Keywords: IoT, Internet of Things, sensor, MQTT, device, edge computing, telemetry, actuator, smart home, gateway, protocol, 物联网, 传感器, 边缘计算, 智能家居"
user-invocable: false
---

# IoT Domain

> **Layer 3: Domain Constraints**

## Environment Comparison (the key decision)

| Environment | Stack | Crates |
|-------------|-------|--------|
| Linux gateway / edge box | tokio + std | rumqttc, reqwest, tracing |
| MCU device | embassy + no_std | see domain-embedded |
| Hybrid | Split workloads: MCU senses, gateway aggregates | Both |

For everything no_std (heapless buffers, ISR safety, embassy, defmt), route
to **domain-embedded** -- this skill covers the std/gateway side.

## Domain Constraints -> Rust Implications

| Domain Rule | Rust Implication |
|-------------|------------------|
| Network can fail at any time | Store-and-forward: persist locally, flush on reconnect; retry with backoff (m13-domain-error) |
| Battery/power constraints | Sleep between transmissions; batch uploads; minimal allocation |
| Physical access possible | TLS (rustls) on every link, signed firmware/OTA with rollback |
| Devices must self-recover | Watchdog, supervised reconnect loop, no `unwrap` in the event loop |

## Key Crates (gateway side)

| Purpose | Crate |
|---------|-------|
| MQTT | rumqttc, paho-mqtt |
| Async runtime | tokio |
| TLS | rustls |
| Logging | tracing |

## Code Pattern: MQTT Client with Reconnect (rumqttc 0.24)

The event loop is the reconnect point: `poll()` re-establishes the
connection internally, so back off on `Err` and keep polling -- do not
rebuild the client.

```rust
use std::time::Duration;
use rumqttc::{AsyncClient, MqttOptions, QoS};

async fn run_mqtt() -> anyhow::Result<()> {
    let mut options = MqttOptions::new("device-1", "broker.example.com", 1883);
    options.set_keep_alive(Duration::from_secs(30));

    let (client, mut eventloop) = AsyncClient::new(options, 10);

    client.subscribe("devices/device-1/commands", QoS::AtLeastOnce).await?;

    tokio::spawn(async move {
        loop {
            let data = read_sensor().await;
            client.publish("devices/device-1/telemetry", QoS::AtLeastOnce, false, data).await.ok();
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });

    loop {
        match eventloop.poll().await {
            Ok(event) => handle_event(event).await,
            Err(e) => {
                tracing::error!("MQTT error: {}", e);
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    }
}
```

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| No local buffer | Network outage = data loss | Persist, flush on reconnect |
| Fixed retry interval | Thundering herd on broker recovery | Exponential backoff + jitter |
| Unencrypted MQTT (port 1883 in prod) | Credentials/telemetry sniffable | TLS via rustls (port 8883) |
| `unwrap()` in event loop | One transient error kills the device | Log, back off, continue polling |

## Related Skills

| When | See |
|------|-----|
| MCU/no_std/embassy side | domain-embedded |
| Async patterns | m07-concurrency |
| Retry/backoff/circuit breaker | m13-domain-error |
| Performance, allocation | m10-performance |
