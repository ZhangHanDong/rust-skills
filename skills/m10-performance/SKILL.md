---
name: m10-performance
description: "Use when: performance optimization. Keywords: performance, optimization, benchmark, profiling, flamegraph, criterion, slow, fast, allocation, cache, SIMD, make it faster, 性能优化, 基准测试"
user-invocable: false
---

# Performance Optimization

> **Layer 2: Design Choices**

## Core Question

**What's the bottleneck, and is optimization worth it?** Profile before optimizing (never guess), benchmark in `--release` only, and weigh complexity against the win.

## Optimization Priority

```
1. Algorithm choice     (10x - 1000x)
2. Data structure       (2x - 10x)
3. Allocation reduction (2x - 5x)
4. Cache optimization   (1.5x - 3x)
5. SIMD/Parallelism     (2x - 8x)
```

## Technique Table

| Goal | When | How |
|------|------|-----|
| Reduce allocations | Known size | `Vec::with_capacity(n)`, `String::with_capacity` |
| Avoid copies in hot paths | Read-mostly data | References or `Cow<'_, T>` |
| Reuse buffers | Per-iteration allocs | `buffer.clear()` + refill instead of `Vec::new()` per loop |
| Improve cache locality | Iteration-heavy | `Vec` over `HashMap`/`LinkedList`; sequential access |
| Inline small collections | Usually < N items | `smallvec::SmallVec<[T; N]>`, fixed arrays |
| Parallelize CPU-bound work | Data parallelism | `rayon` (`par_iter`); async only helps I/O-bound |
| Batch operations | Many small ops | Collect then process |

## Measurement Tools

| Tool | Purpose |
|------|---------|
| `criterion` + `cargo bench` | Statistical micro-benchmarks |
| `cargo flamegraph` / `perf` | CPU profiling |
| `heaptrack` | Allocation tracking |
| `valgrind --tool=cachegrind` | Cache analysis |

See `patterns/optimization-guide.md` for worked examples (Cow, buffer reuse, rayon, struct layout, async I/O, release-profile TOML).

## Mistakes and Anti-Patterns

| Mistake | Why Wrong | Better |
|---------|-----------|--------|
| Optimize without profiling | Wrong target, wasted effort | Profile first; make it work, then fast |
| Benchmark in debug mode | Meaningless numbers | Always `--release` |
| `LinkedList` / custom linked list | Cache unfriendly | `Vec` or `VecDeque` |
| Clone to avoid lifetimes | Hides ownership issue + alloc cost | Proper references/ownership (m01) |
| Box everything | Pointer indirection cost | Stack values when possible |
| `HashMap` for small sets (<~20) | Hashing overhead | `Vec` + linear search |
| String concat with `+` in loop | O(n^2) reallocations | `push_str` on `with_capacity` String, or `join` |

## Related Skills

| When | See |
|------|-----|
| Reducing clones, ownership redesign | m01-ownership |
| rayon vs threads vs async | m07-concurrency |
| Smart pointer choice | m02-resource |
| Latency/throughput/memory budget questions | domain-* |
