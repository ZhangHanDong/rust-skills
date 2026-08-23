# Domain Extension Index

Special domain codes for industry-specific applications.

---

## Financial Technology (F001-F099)

| Code Range | Technical Domain | Key Applications |
|------------|------------------|------------------|
| F001-F019 | High-Precision Computing | Decimal, currency calculations |
| F020-F039 | Trading Systems | Order matching, risk control |
| F040-F059 | Blockchain | Smart contracts, DeFi |
| F060-F079 | Risk Management | Risk engines, anti-fraud |
| F080-F099 | Regulatory Compliance | KYC, AML |

### Key Crates
- rust_decimal, chrono, uuid
- serde, tokio

### Related Meta-Questions
- m01, m06, m07, m10

---

## Machine Learning (ML001-ML099)

| Code Range | Technical Domain | Key Applications |
|------------|------------------|------------------|
| ML001-ML019 | Tensor Operations | ndarray, GPU acceleration |
| ML020-ML039 | Model Inference | ONNX, TensorFlow |
| ML040-ML059 | Data Processing | Feature engineering, ETL |
| ML060-ML079 | Distributed Training | Parallel computing |
| ML080-ML099 | MLOps | Model serving, monitoring |

### Key Crates
- ndarray, tract, candle
- tch-rs, polars

### Related Meta-Questions
- m04, m07, m10, m11

---

## Cloud Native (CN001-CN099)

| Code Range | Technical Domain | Key Applications |
|------------|------------------|------------------|
| CN001-CN019 | Containerization | Docker, microservices |
| CN020-CN039 | Kubernetes | CRD, Operator |
| CN040-CN059 | Service Mesh | Istio, traffic management |
| CN060-CN079 | Observability | Monitoring, tracing |
| CN080-CN099 | Serverless | FaaS, edge computing |

### Key Crates
- tonic, kube, tracing
- opentelemetry, bollard

### Related Meta-Questions
- m06, m07, m10, m12

---

## Internet of Things (IoT001-IoT099)

| Code Range | Technical Domain | Key Applications |
|------------|------------------|------------------|
| IoT001-IoT019 | Edge Computing | Local inference, data aggregation |
| IoT020-IoT039 | Device Management | OTA, remote control |
| IoT040-IoT059 | Communication Protocols | MQTT, CoAP |
| IoT060-IoT079 | Data Collection | Sensor networks |
| IoT080-IoT099 | Security Protection | Device authentication, encryption |

### Key Crates
- embedded-hal, embassy, rtic
- rumqttc, defmt

### Related Meta-Questions
- m01, m07, unsafe-checker, m10

### Related Tech Categories
- 700-759: Embedded Development Layer

---

## Cross-Reference

| Domain | Primary Categories | Secondary Categories |
|--------|-------------------|---------------------|
| FinTech | F001-F099 | 040-043 (Error), 120-139 (Concurrency) |
| ML | ML001-ML099 | 020-029 (Types), 250-279 (Async) |
| Cloud Native | CN001-CN099 | 200-299 (Web), 250-279 (Async) |
| IoT | IoT001-IoT099 | 700-759 (Embedded), 880-889 (Unsafe) |

## Usage Examples

```sql
-- Find all FinTech high-precision computing issues
SELECT * WHERE category LIKE 'F001%' OR category LIKE 'F01%'

-- Find embedded IoT with real-time constraints
SELECT * WHERE category BETWEEN 'IoT040' AND 'IoT059'
  OR category BETWEEN '740' AND '749'

-- Find cloud-native observability patterns
SELECT * WHERE category LIKE 'CN06%'
```
