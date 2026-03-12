---
name: domain-ml
description: "Use when building ML/AI apps in Rust. Keywords: machine learning, ML, AI, tensor, model, inference, neural network, deep learning, training, prediction, ndarray, tch-rs, burn, candle, 机器学习, 人工智能, 模型推理"
user-invocable: false
---

# Machine Learning Domain

## Domain Constraints → Design Implications

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| Large data | Efficient memory | Zero-copy, streaming |
| GPU acceleration | CUDA/Metal support | candle, tch-rs |
| Model portability | Standard formats | ONNX |
| Batch processing | Throughput over latency | Batched inference |
| Numerical precision | Float handling | ndarray, careful f32/f64 |
| Reproducibility | Deterministic | Seeded random, versioning |

---

## Critical Constraints

| Constraint | Rule | Rust Approach |
|-----------|------|---------------|
| Memory efficiency | Never copy large tensors | References, views, in-place ops |
| GPU utilization | Batch operations to amortize kernel launch overhead | Batch sizes, async data loading |
| Model portability | Use standard formats (train Python, deploy Rust) | ONNX via tract or candle |

---

## Use Case → Framework

| Use Case | Recommended | Why |
|----------|-------------|-----|
| Inference only | tract (ONNX) | Lightweight, portable |
| Training + inference | candle, burn | Pure Rust, GPU |
| PyTorch models | tch-rs | Direct bindings |
| Data pipelines | polars | Fast, lazy eval |

## Key Crates

| Purpose | Crate |
|---------|-------|
| Tensors | ndarray |
| ONNX inference | tract |
| ML framework | candle, burn |
| PyTorch bindings | tch-rs |
| Data processing | polars |
| Embeddings | fastembed |

## Design Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Model loading | Once, reuse | `OnceLock<Model>` |
| Batching | Throughput | Collect then process |
| Streaming | Large data | Iterator-based |
| GPU async | Parallelism | Data loading parallel to compute |

## Workflow: Adding ML Inference to a Rust Service

1. **Choose framework** — Use the Use Case → Framework table above to select crate
2. **Add dependencies** — `cargo add tract-onnx ndarray anyhow` (or `candle-core` / `tch` per choice)
3. **Load model once** — Use `OnceLock` or `once_cell::sync::Lazy` for singleton; never load per-request
4. **Prepare input** — Convert raw data to `ndarray::Array` with correct shape and dtype
5. **Run inference** — Call `model.run()` with batched inputs when possible
6. **Validate output** — Check output tensor shape matches expectations before unwrapping
7. **Benchmark** — Profile with `criterion`; compare batch sizes (32, 64, 128) for throughput

## Code Pattern: Inference Server

```rust
use std::sync::OnceLock;
use tract_onnx::prelude::*;

static MODEL: OnceLock<SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>> = OnceLock::new();

fn get_model() -> &'static SimplePlan<...> {
    MODEL.get_or_init(|| {
        tract_onnx::onnx()
            .model_for_path("model.onnx")
            .unwrap()
            .into_optimized()
            .unwrap()
            .into_runnable()
            .unwrap()
    })
}

async fn predict(input: Vec<f32>) -> anyhow::Result<Vec<f32>> {
    let model = get_model();
    let input = tract_ndarray::arr1(&input).into_shape((1, input.len()))?;
    let result = model.run(tvec!(input.into()))?;
    Ok(result[0].to_array_view::<f32>()?.iter().copied().collect())
}
```

## Code Pattern: Batched Inference

```rust
use tract_onnx::prelude::*;
use tract_ndarray::{Array2, Axis};

fn batch_predict(
    model: &SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>,
    inputs: &[Vec<f32>],
    feature_dim: usize,
    batch_size: usize,
) -> anyhow::Result<Vec<Vec<f32>>> {
    let mut results = Vec::with_capacity(inputs.len());

    for batch in inputs.chunks(batch_size) {
        let n = batch.len();
        let flat: Vec<f32> = batch.iter().flatten().copied().collect();
        let tensor = Array2::from_shape_vec((n, feature_dim), flat)?;
        let output = model.run(tvec!(tensor.into_tensor().into()))?;
        let view = output[0].to_array_view::<f32>()?;
        for row in view.axis_iter(Axis(0)) {
            results.push(row.iter().copied().collect());
        }
    }

    Ok(results)
}
```

---

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Clone tensors | Memory waste | Use views |
| Single inference | GPU underutilized | Batch processing |
| Load model per request | Slow | Singleton pattern |
| Sync data loading | GPU idle | Async pipeline |

## Related Skills

| When | See |
|------|-----|
| Performance | m10-performance |
| Lazy initialization | m12-lifecycle |
| Async patterns | m07-concurrency |
| Memory efficiency | m01-ownership |
