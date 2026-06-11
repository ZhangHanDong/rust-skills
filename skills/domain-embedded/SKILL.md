---
name: domain-embedded
description: "Use when developing embedded/no_std Rust. Keywords: embedded, no_std, microcontroller, MCU, ARM, RISC-V, bare metal, firmware, HAL, PAC, RTIC, embassy, interrupt, DMA, peripheral, GPIO, SPI, I2C, UART, embedded-hal, cortex-m, esp32, stm32, nrf, 嵌入式, 单片机, 固件, 裸机"
globs: ["**/Cargo.toml", "**/.cargo/config.toml"]
user-invocable: false
---

# Embedded Domain

> **Layer 3: Domain Constraints**

## Domain Constraints -> Rust Implications

| Domain Rule | Rust Implication |
|-------------|------------------|
| No heap, no allocator | `#![no_std]`, `heapless::Vec<T, N>`, static buffers -- no `Box`/`Vec`/`String` |
| ISR can preempt at any time | Shared state in `Mutex<RefCell<Option<T>>>` (runtime-checked borrow) inside critical sections |
| Peripherals must have one owner | HAL takes ownership; `Peripherals::take()` singleton |
| Real-time, predictable timing | No dynamic allocation, no blocking in ISRs (defer work to main loop/task) |
| Resource limited | Capacity is part of the design (see below) |

## Buffering Without a Heap

- In `no_std` firmware, logging and buffering use fixed-capacity structures
  instead of heap-backed `String`/`Vec`: `heapless::String`, `heapless::Vec`,
  static arrays, or ring buffers.
- Capacity is part of the design. Decide explicitly what happens on overflow
  (drop oldest, drop newest, or surface an error) instead of assuming the
  buffer can grow at runtime.

## Layer Stack

| Layer | Examples | Purpose |
|-------|----------|---------|
| PAC | stm32f4, esp32c3 | Register access |
| HAL | stm32f4xx-hal, esp-hal | Hardware abstraction |
| Framework | RTIC, Embassy | Concurrency |
| Traits | embedded-hal | Portable drivers |

## Framework Comparison

| Framework | Style | Best For |
|-----------|-------|----------|
| RTIC | Priority-based, interrupt-driven | Hard real-time, static scheduling |
| Embassy | async/await | Complex state machines, multi-peripheral apps |
| Bare metal | Manual | Simple apps |

## Key Crates

| Purpose | Crate |
|---------|-------|
| Runtime (ARM) | cortex-m-rt |
| Panic handler | panic-halt, panic-probe |
| Collections | heapless |
| HAL traits | embedded-hal |
| Critical sections | critical-section |
| Logging | defmt |
| Flash/debug | probe-rs (`probe-rs run`, cargo-embed) -- replaces deprecated probe-run |

## Code Pattern: ISR-Safe Static State

Use the `critical-section` crate: portable across cortex-m, esp32, and
RISC-V (each chip crate provides the implementation). The cortex-m-only
equivalent is `cortex_m::interrupt::free`.

```rust
#![no_std]

use core::cell::RefCell;
use critical_section::Mutex;

// Led = your HAL pin type
static LED: Mutex<RefCell<Option<Led>>> = Mutex::new(RefCell::new(None));

fn init(led: Led) {
    critical_section::with(|cs| {
        LED.borrow_ref_mut(cs).replace(led);
    });
}

// callable from main loop or ISR alike
fn toggle_led() {
    critical_section::with(|cs| {
        if let Some(led) = LED.borrow_ref_mut(cs).as_mut() {
            led.toggle();
        }
    });
}
```

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Using `Vec`/`Box` | Heap allocation, no allocator | `heapless::Vec<T, N>` |
| Touching shared static without critical section | Data race with ISR | `critical_section::with` + `Mutex<RefCell<T>>` |
| Blocking in ISR | Missed interrupts, jitter | Set a flag/queue, defer to main loop or task |
| Bypassing HAL with raw registers | Conflicting peripheral access | HAL ownership; unsafe only with review |

## Related Skills

| When | See |
|------|-----|
| Static memory, fixed capacity | m02-resource |
| Interior mutability | m03-mutability |
| Interrupt/concurrency patterns | m07-concurrency |
| Unsafe for hardware access | unsafe-checker |
| MQTT, gateway-side IoT | domain-iot |
