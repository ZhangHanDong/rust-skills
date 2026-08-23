---
name: domain-ml
description: "Use when building ML/AI apps in Rust. Keywords: machine learning, ML, AI, tensor, model, inference, neural network, deep learning, training, prediction, ndarray, tch-rs, burn, candle, 机器学习, 人工智能, 模型推理"
user-invocable: false
---

# Machine Learning Domain

> **Layer 3: Domain Constraints**

## Use Case -> Framework (the key decision)

| Use Case | Recommended | Why |
|----------|-------------|-----|
| ONNX inference, pure Rust / portable | tract | No C deps, small, CPU-only |
| ONNX inference, production / accelerated | ort | ONNX Runtime bindings: CUDA, TensorRT, CoreML |
| Training + inference in Rust | candle, burn | Pure Rust, GPU backends |
| Existing PyTorch models | tch-rs | Direct libtorch bindings |
| Data pipelines | polars | Fast, lazy evaluation |

## Domain Constraints -> Rust Implications

| Domain Rule | Rust Implication |
|-------------|------------------|
| Tensor copies are the bottleneck | ndarray views, in-place ops, zero-copy slicing |
| GPU kernel launch overhead | Batch inference; load data async while GPU computes |
| Train in Python, deploy in Rust | ONNX as the interchange format |
| Model load is expensive | Load once: `OnceLock`/`LazyLock` singleton, never per request |
| Reproducibility | Seeded RNG, pinned model + crate versions |

## Key Crates

| Purpose | Crate |
|---------|-------|
| Tensors | ndarray |
| ONNX inference | tract, ort |
| ML framework | candle, burn |
| PyTorch bindings | tch-rs |
| Data processing | polars |
| Embeddings | fastembed |

## Code Pattern: Inference with tract (tract-onnx 0.21)

Note the two current-API points: ndarray 0.16 renamed `into_shape` to
`into_shape_with_order`, and `model.run` takes `TValue`s, which convert
from `Tensor` (so call `.into_tensor()` on the array first).

```rust
use std::sync::OnceLock;
use tract_onnx::prelude::*;

type Model = SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>;

static MODEL: OnceLock<Model> = OnceLock::new();

fn get_model() -> &'static Model {
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

fn predict(input: Vec<f32>) -> anyhow::Result<Vec<f32>> {
    let model = get_model();
    let len = input.len();
    let tensor = tract_ndarray::Array1::from(input)
        .into_shape_with_order((1, len))?
        .into_tensor();
    let result = model.run(tvec!(tensor.into()))?;
    Ok(result[0].to_array_view::<f32>()?.iter().copied().collect())
}
```

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Cloning tensors | Memory bandwidth waste | ndarray views (`.view()`, slicing) |
| Loading model per request | Latency, memory churn | `OnceLock` singleton (above) |
| Single-item GPU inference | GPU underutilized | Batch requests, `chunks(batch_size)` |
| Synchronous data loading | GPU idles between batches | Overlap loading with compute (tokio tasks/channels) |

## Related Skills

| When | See |
|------|-----|
| Performance, allocation | m10-performance |
| Lazy initialization | m12-lifecycle |
| Async pipelines | m07-concurrency |
| Zero-copy ownership | m01-ownership |
