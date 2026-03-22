---
name: domain-embedded
description: "Use when developing embedded/no_std Rust. Keywords: embedded, no_std, microcontroller, MCU, ARM, RISC-V, bare metal, firmware, HAL, PAC, RTIC, embassy, interrupt, DMA, peripheral, GPIO, SPI, I2C, UART, embedded-hal, cortex-m, esp32, stm32, nrf, 嵌入式, 单片机, 固件, 裸机"
globs: ["**/Cargo.toml", "**/.cargo/config.toml"]
user-invocable: false
---

## Project Context (Auto-Injected)

**Target configuration:**
!`cat .cargo/config.toml 2>/dev/null || echo "No .cargo/config.toml found"`

---

# Embedded Domain

## Domain Constraints → Design Implications

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| No heap | Stack allocation | heapless, no Box/Vec |
| No std | Core only | #![no_std] |
| Real-time | Predictable timing | No dynamic alloc |
| Resource limited | Minimal memory | Static buffers |
| Hardware safety | Safe peripheral access | HAL + ownership |
| Interrupt safe | No blocking in ISR | Atomic, critical sections |

---

## Critical Constraints

### No Dynamic Allocation

Use fixed-capacity collections from `heapless` instead of `std` collections:

```rust
use heapless::Vec;

// Fixed-capacity buffer — no heap, compile-time size
let mut buf: Vec<u8, 64> = Vec::new();
buf.push(0xAB).unwrap(); // Returns Err if full
```

### Interrupt Safety

Shared state between main and ISR requires a critical section:

```rust
use cortex_m::interrupt::{self, Mutex};
use core::cell::RefCell;

static COUNTER: Mutex<RefCell<u32>> = Mutex::new(RefCell::new(0));

// In ISR handler:
interrupt::free(|cs| {
    let mut cnt = COUNTER.borrow(cs).borrow_mut();
    *cnt += 1;
});
```

### Hardware Ownership

Peripherals use singleton pattern — `take()` returns `Some` only once:

```rust
let dp = pac::Peripherals::take().unwrap(); // Second call panics
let led = Led::new(dp.GPIOA); // Ownership transferred — no conflicting access
```

---

## Embedded Stack Layers

| Layer | Examples | Purpose |
|-------|----------|---------|
| PAC | stm32f4, esp32c3 | Register access |
| HAL | stm32f4xx-hal | Hardware abstraction |
| Framework | RTIC, Embassy | Concurrency model |
| Traits | embedded-hal | Portable drivers |

## Framework Comparison

| Framework | Style | Best For |
|-----------|-------|----------|
| RTIC | Priority-based | Interrupt-driven apps |
| Embassy | Async | Complex state machines |
| Bare metal | Manual | Simple apps |

## Key Crates

| Purpose | Crate |
|---------|-------|
| Runtime (ARM) | cortex-m-rt |
| Panic handler | panic-halt, panic-probe |
| Collections | heapless |
| HAL traits | embedded-hal |
| Logging | defmt |
| Flash/debug | probe-run |

## Code Pattern: Static Peripheral (cortex-m)

```rust
#![no_std]
#![no_main]

use cortex_m::interrupt::{self, Mutex};
use core::cell::RefCell;

static LED: Mutex<RefCell<Option<Led>>> = Mutex::new(RefCell::new(None));

#[entry]
fn main() -> ! {
    let dp = pac::Peripherals::take().unwrap();
    let led = Led::new(dp.GPIOA);

    interrupt::free(|cs| {
        LED.borrow(cs).replace(Some(led));
    });

    loop {
        interrupt::free(|cs| {
            if let Some(led) = LED.borrow(cs).borrow_mut().as_mut() {
                led.toggle();
            }
        });
    }
}
```

---

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Using Vec | Heap allocation | heapless::Vec |
| No critical section | Race with ISR | Mutex + interrupt::free |
| Blocking in ISR | Missed interrupts | Defer to main loop |
| Unsafe peripheral | Hardware conflict | HAL ownership |

---

## Code Pattern: Embassy Async

```rust
#![no_std]
#![no_main]

use embassy_executor::Spawner;
use embassy_stm32::gpio::{Level, Output, Speed};
use embassy_time::Timer;

#[embassy_executor::main]
async fn main(_spawner: Spawner) {
    let p = embassy_stm32::init(Default::default());
    let mut led = Output::new(p.PA5, Level::Low, Speed::Low);

    loop {
        led.toggle();
        Timer::after_millis(500).await;
    }
}
```

---

## Workflow: New Embedded Project

1. **Scaffold** — `#![no_std]`, `#![no_main]`, panic handler, entry point
2. **Configure target** — `.cargo/config.toml` with target triple, runner (probe-run/espflash)
3. **Initialize peripherals** — `Peripherals::take().unwrap()`, configure clocks
4. **Wire HAL** — GPIO, SPI, I2C, UART via `embedded-hal` traits
5. **Add concurrency** — Choose RTIC (interrupt-driven) or Embassy (async)
6. **Validate** — `cargo build --release`, flash to hardware, verify with `defmt` logging
