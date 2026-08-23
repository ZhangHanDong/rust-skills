---
name: domain-fintech
description: "Use when building fintech apps. Keywords: fintech, trading, decimal, currency, financial, money, transaction, ledger, payment, exchange rate, precision, rounding, accounting, 金融, 交易系统, 货币, 支付"
user-invocable: false
---

# FinTech Domain

> **Layer 3: Domain Constraints**

## Domain Constraints -> Rust Implications

| Domain Rule | Rust Implication |
|-------------|------------------|
| Never use f64 for money (precision loss) | `rust_decimal::Decimal` |
| Money cannot silently appear/disappear | Checked arithmetic: `checked_add`, `checked_mul`, `checked_div` |
| Audit trail: records are immutable | `Arc<T>` for sharing, event sourcing, no in-place mutation |
| Different currencies must not mix | Currency-tagged `Amount` newtype, mismatch = typed error |
| Reproducibility, compliance | Deterministic execution, structured `tracing` with IDs |

## Precision and Rounding

- The rounding strategy is a **business decision**, not a technical default.
  Banker's rounding (`RoundingStrategy::MidpointNearestEven`) is standard in
  accounting; `MidpointAwayFromZero` is what most people expect from "round
  half up". Pick one explicitly per operation.
- Division produces full-precision results: round to the target scale
  explicitly with `round_dp_with_strategy(scale, strategy)` -- never let
  serialization truncate for you.
- Use `checked_div` (division by zero returns `None` instead of panicking).

```rust
use rust_decimal::{Decimal, RoundingStrategy};

let price = Decimal::new(1, 0) / Decimal::new(3, 0); // 0.3333333... full precision
let rounded = price.round_dp_with_strategy(2, RoundingStrategy::MidpointNearestEven);
```

## Key Crates

| Purpose | Crate |
|---------|-------|
| Decimal math | rust_decimal |
| Date/time | chrono, time |
| UUID | uuid |
| Serialization | serde |
| Validation | validator |

## Design Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Amount newtype | Type safety | `struct Amount { value: Decimal, currency: Currency }` |
| Transaction | Atomic operations | Event sourcing |
| Audit log | Traceability | Structured logging with trace IDs |
| Ledger | Double-entry | Debit/credit balance |

## Code Pattern: Currency-Safe Amount

```rust
use rust_decimal::Decimal;

// Currency must be Copy (or be cloned) -- otherwise constructing a new
// Amount from &self moves out of a borrow and fails with E0507.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Currency { Usd, Eur, Jpy }

#[derive(Clone, Debug, PartialEq)]
pub struct Amount {
    value: Decimal,
    currency: Currency,
}

#[derive(Debug)]
pub enum AmountError { CurrencyMismatch, Overflow }

impl Amount {
    pub fn new(value: Decimal, currency: Currency) -> Self {
        Self { value, currency }
    }

    pub fn checked_add(&self, other: &Amount) -> Result<Amount, AmountError> {
        if self.currency != other.currency {
            return Err(AmountError::CurrencyMismatch);
        }
        let value = self
            .value
            .checked_add(other.value)
            .ok_or(AmountError::Overflow)?;
        Ok(Amount::new(value, self.currency))
    }
}
```

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Using f64 | Precision loss | rust_decimal |
| Unchecked `+`/`*` on Decimal | Silent overflow panic in release | `checked_*` APIs |
| Implicit rounding at serialization | Cent-level discrepancies | Explicit `round_dp_with_strategy` |
| Mutable transaction records | Audit trail broken | Immutable + event sourcing |
| String for amounts | No validation | Validated newtype |

## Related Skills

| When | See |
|------|-----|
| Value Object design | m09-domain |
| Ownership for immutable data | m01-ownership |
| Arc for sharing | m02-resource |
| Domain error design, retries | m13-domain-error |
