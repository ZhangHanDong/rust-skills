# Trigger Keywords Index

Keywords that trigger each skill.

## m01-ownership

CRITICAL: Use for ownership/borrow/lifetime issues. Triggers: E0382, E0597, E0506, E0507, E0515, E0716, E0106, value moved, borrowed value does not live long enough, cannot move out of, use of moved value, ownership, borrow, lifetime, 'a, 'static, move, clone, Copy, 所有权, 借用, 生命周期

## m02-resource

CRITICAL: Use for smart pointers and resource management. Triggers: Box, Rc, Arc, Weak, RefCell, Cell, smart pointer, heap allocation, reference counting, RAII, Drop, should I use Box or Rc, when to use Arc vs Rc, 智能指针, 引用计数, 堆分配

## m03-mutability

CRITICAL: Use for mutability issues. Triggers: E0596, E0499, E0502, cannot borrow as mutable, already borrowed as immutable, mut, &mut, interior mutability, Cell, RefCell, Mutex, RwLock, 可变性, 内部可变性, 借用冲突

## m04-zero-cost

CRITICAL: Use for generics, traits, zero-cost abstraction. Triggers: E0277, E0308, E0599, generic, trait, impl, dyn, where, monomorphization, static dispatch, dynamic dispatch, impl Trait, trait bound not satisfied, 泛型, 特征, 零成本抽象, 单态化

## m05-type-driven

CRITICAL: Use for type-driven design. Triggers: type state, PhantomData, newtype, marker trait, builder pattern, make invalid states unrepresentable, compile-time validation, sealed trait, ZST, 类型状态, 新类型模式, 类型驱动设计

## m06-error-handling

CRITICAL: Use for error handling. Triggers: Result, Option, Error, ?, unwrap, expect, panic, anyhow, thiserror, when to panic vs return Result, custom error, error propagation, 错误处理, Result 用法, 什么时候用 panic

## m07-concurrency

CRITICAL: Use for concurrency/async. Triggers: E0277 Send Sync, cannot be sent between threads, thread, spawn, channel, mpsc, Mutex, RwLock, Atomic, async, await, Future, tokio, deadlock, race condition, 并发, 线程, 异步, 死锁

## m09-domain

CRITICAL: Use for domain modeling. Triggers: domain model, DDD, domain-driven design, entity, value object, aggregate, repository pattern, business rules, validation, invariant, 领域模型, 领域驱动设计, 业务规则

## m10-performance

CRITICAL: Use for performance optimization. Triggers: performance, optimization, benchmark, profiling, flamegraph, criterion, slow, fast, allocation, cache, SIMD, make it faster, 性能优化, 基准测试

## m11-ecosystem

Use when integrating crates or ecosystem questions. Keywords: E0425, E0433, E0603, crate, cargo, dependency, feature flag, workspace, which crate to use, using external C libraries, creating Python extensions, PyO3, wasm, WebAssembly, bindgen, cbindgen, napi-rs, cannot find, private, crate recommendation, best crate for, Cargo.toml, features, crate 推荐, 依赖管理, 特性标志, 工作空间, Python 绑定

## m12-lifecycle

Use when designing resource lifecycles. Keywords: RAII, Drop, resource lifecycle, connection pool, lazy initialization, connection pool design, resource cleanup patterns, cleanup, scope, OnceCell, Lazy, once_cell, OnceLock, transaction, session management, when is Drop called, cleanup on error, guard pattern, scope guard, 资源生命周期, 连接池, 惰性初始化, 资源清理, RAII 模式

## m13-domain-error

Use when designing domain error handling. Keywords: domain error, error categorization, recovery strategy, retry, fallback, domain error hierarchy, user-facing vs internal errors, error code design, circuit breaker, graceful degradation, resilience, error context, backoff, retry with backoff, error recovery, transient vs permanent error, 领域错误, 错误分类, 恢复策略, 重试, 熔断器, 优雅降级

## m14-mental-model

Use when learning Rust concepts. Keywords: mental model, how to think about ownership, understanding borrow checker, visualizing memory layout, analogy, misconception, explaining ownership, why does Rust, help me understand, confused about, learning Rust, explain like I'm, ELI5, intuition for, coming from Java, coming from Python, 心智模型, 如何理解所有权, 学习 Rust, Rust 入门, 为什么 Rust

## m15-anti-pattern

Use when reviewing code for anti-patterns. Keywords: anti-pattern, common mistake, pitfall, code smell, bad practice, code review, is this an anti-pattern, better way to do this, common mistake to avoid, why is this bad, idiomatic way, beginner mistake, fighting borrow checker, clone everywhere, unwrap in production, should I refactor, 反模式, 常见错误, 代码异味, 最佳实践, 地道写法

