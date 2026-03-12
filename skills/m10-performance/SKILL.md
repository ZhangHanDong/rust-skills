---
name: m10-performance
description: "Use when the user asks about performance optimization, benchmarking, profiling, flamegraphs, criterion, slow code, allocations, cache efficiency, SIMD, or making Rust code faster. Triggers: performance, optimization, benchmark, profiling, flamegraph, criterion, slow, fast, allocation, cache, SIMD, make it faster, 性能优化, 基准测试"
user-invocable: false
---

# Performance Optimization

> **Layer 2: Design Choices**

## Core Question

**What's the bottleneck, and is optimization worth it?**

Before optimizing:
- Have you measured? (Don't guess)
- What's the acceptable performance?
- Will optimization add complexity?

---

## Performance Decision → Implementation

| Goal | Design Choice | Implementation |
|------|---------------|----------------|
| Reduce allocations | Pre-allocate, reuse | `with_capacity`, object pools |
| Improve cache | Contiguous data | `Vec`, `SmallVec` |
| Parallelize | Data parallelism | `rayon`, threads |
| Avoid copies | Zero-copy | References, `Cow<T>` |
| Reduce indirection | Inline data | `smallvec`, arrays |

---

## Thinking Prompt

Before optimizing:

1. **Have you measured?**
   - Profile first → flamegraph, perf
   - Benchmark → criterion, cargo bench
   - Identify actual hotspots

2. **What's the priority?**
   - Algorithm (10x-1000x improvement)
   - Data structure (2x-10x)
   - Allocation (2x-5x)
   - Cache (1.5x-3x)

3. **What's the trade-off?**
   - Complexity vs speed
   - Memory vs CPU
   - Latency vs throughput

---

## Trace Up ↑

To domain constraints (Layer 3):

```
"How fast does this need to be?"
    ↑ Ask: What's the performance SLA?
    ↑ Check: domain-* (latency requirements)
    ↑ Check: Business requirements (acceptable response time)
```

| Question | Trace To | Ask |
|----------|----------|-----|
| Latency requirements | domain-* | What's acceptable response time? |
| Throughput needs | domain-* | How many requests per second? |
| Memory constraints | domain-* | What's the memory budget? |

---

## Trace Down ↓

To implementation (Layer 1):

```
"Need to reduce allocations"
    ↓ m01-ownership: Use references, avoid clone
    ↓ m02-resource: Pre-allocate with_capacity

"Need to parallelize"
    ↓ m07-concurrency: Choose rayon or threads
    ↓ m07-concurrency: Consider async for I/O-bound

"Need cache efficiency"
    ↓ Data layout: Prefer Vec over HashMap when possible
    ↓ Access patterns: Sequential over random access
```

---

## Quick Reference

| Tool | Purpose |
|------|---------|
| `cargo bench` | Micro-benchmarks |
| `criterion` | Statistical benchmarks |
| `perf` / `flamegraph` | CPU profiling |
| `heaptrack` | Allocation tracking |
| `valgrind` / `cachegrind` | Cache analysis |

## Workflow

1. **Profile** — Identify the actual bottleneck before changing anything
   - Run `cargo flamegraph` or `perf record` to find hot functions
   - Validate: you can point to a specific function or line consuming >10% of runtime

2. **Benchmark the baseline** — Establish a measurable starting point
   - Add a criterion benchmark for the hot path
   - Validate: `cargo bench` produces stable, reproducible numbers

3. **Apply the highest-leverage fix** — Use the priority order (algorithm > data structure > allocation > cache > SIMD)
   - Validate: `cargo bench` shows measurable improvement

4. **Verify correctness** — Optimization must not break behavior
   - Run `cargo test` and compare outputs against baseline
   - Validate: all tests pass, no regressions

### Example: Benchmark with Criterion

```rust
// benches/parse_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn parse_records(data: &[u8]) -> Vec<Record> {
    // Pre-allocate based on estimated count to reduce allocations
    let estimated = data.len() / 64;
    let mut results = Vec::with_capacity(estimated);
    for chunk in data.chunks(64) {
        results.push(Record::from_bytes(chunk));
    }
    results
}

fn bench_parse(c: &mut Criterion) {
    let data = vec![0u8; 6400];
    c.bench_function("parse_records", |b| {
        b.iter(|| parse_records(black_box(&data)))
    });
}

criterion_group!(benches, bench_parse);
criterion_main!(benches);
```

## Common Techniques

| Technique | When | How |
|-----------|------|-----|
| Pre-allocation | Known size | `Vec::with_capacity(n)` |
| Avoid cloning | Hot paths | Use references or `Cow<T>` |
| Batch operations | Many small ops | Collect then process |
| SmallVec | Usually small | `smallvec::SmallVec<[T; N]>` |
| Inline buffers | Fixed-size data | Arrays over Vec |

---

## Common Mistakes

| Mistake | Why Wrong | Better |
|---------|-----------|--------|
| Optimize without profiling | Wrong target | Profile first |
| Benchmark in debug mode | Meaningless | Always `--release` |
| Use `LinkedList` | Cache unfriendly | `Vec` or `VecDeque` |
| Clone to avoid lifetimes | Unnecessary allocs on hot paths | Use references or `Cow<T>` |
| Box everything | Indirection + cache miss cost | Stack allocate when possible |
| `HashMap` for small sets | Hash overhead | `Vec` with linear search (<50 items) |
| String concat in loop | O(n^2) allocations | `String::with_capacity` or `write!` |
| Premature optimization | Wasted effort, added complexity | Make it correct first, then measure |

---

## Related Skills

| When | See |
|------|-----|
| Reducing clones | m01-ownership |
| Concurrency options | m07-concurrency |
| Smart pointer choice | m02-resource |
| Domain requirements | domain-* |
