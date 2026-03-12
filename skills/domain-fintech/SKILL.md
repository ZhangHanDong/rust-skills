---
name: domain-fintech
description: "Use when building fintech apps. Keywords: fintech, trading, decimal, currency, financial, money, transaction, ledger, payment, exchange rate, precision, rounding, accounting, 金融, 交易系统, 货币, 支付"
user-invocable: false
---

# FinTech Domain

> **Layer 3: Domain Constraints**

## Domain Constraints → Design Implications

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| Audit trail | Immutable records | Arc<T>, no mutation |
| Precision | No floating point | rust_decimal |
| Consistency | Transaction boundaries | Clear ownership |
| Compliance | Complete logging | Structured tracing |
| Reproducibility | Deterministic execution | No race conditions |

---

## Implementation Workflow

1. **Define currency types** — Create newtypes wrapping `rust_decimal::Decimal` for all monetary values. Never use `f64`.
2. **Enforce currency safety** — Arithmetic operations must validate matching currencies at compile time or return `Result`.
3. **Model transactions as immutable events** — Use event sourcing; once created, a transaction record is never mutated.
4. **Validate double-entry invariants** — Every transaction must balance: total debits == total credits. Assert this at construction time.
5. **Add structured audit logging** — Attach trace IDs (`tracing::Span`) to every financial operation for regulatory compliance.
6. **Use checked arithmetic** — All math via `Decimal::checked_add`, `checked_mul` etc. Propagate overflow as errors, never silently truncate.

---

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
| Currency newtype | Type safety | `struct Amount(Decimal);` |
| Transaction | Atomic operations | Event sourcing |
| Audit log | Traceability | Structured logging with trace IDs |
| Ledger | Double-entry | Debit/credit balance |

## Code Pattern: Currency Type with Checked Arithmetic

```rust
use rust_decimal::Decimal;
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum Currency { USD, EUR, GBP }

#[derive(Debug, Clone, thiserror::Error)]
pub enum FinError {
    #[error("currency mismatch: {0:?} vs {1:?}")]
    CurrencyMismatch(Currency, Currency),
    #[error("arithmetic overflow")]
    Overflow,
    #[error("transaction imbalance: debits={0}, credits={1}")]
    Imbalance(Decimal, Decimal),
}

#[derive(Clone, Debug, PartialEq)]
pub struct Amount {
    value: Decimal,
    currency: Currency,
}

impl Amount {
    pub fn new(value: Decimal, currency: Currency) -> Self {
        Self { value, currency }
    }

    pub fn checked_add(&self, other: &Amount) -> Result<Amount, FinError> {
        if self.currency != other.currency {
            return Err(FinError::CurrencyMismatch(
                self.currency.clone(), other.currency.clone(),
            ));
        }
        let sum = self.value.checked_add(other.value)
            .ok_or(FinError::Overflow)?;
        Ok(Amount::new(sum, self.currency.clone()))
    }
}

/// Immutable ledger entry — wrap in Arc for shared read access.
#[derive(Debug, Clone)]
pub struct LedgerEntry {
    pub debit: Amount,
    pub credit: Amount,
    pub trace_id: String,
}

impl LedgerEntry {
    /// Validates double-entry invariant at construction time.
    pub fn new(debit: Amount, credit: Amount, trace_id: String) -> Result<Arc<Self>, FinError> {
        if debit.currency != credit.currency {
            return Err(FinError::CurrencyMismatch(
                debit.currency.clone(), credit.currency.clone(),
            ));
        }
        if debit.value != credit.value {
            return Err(FinError::Imbalance(debit.value, credit.value));
        }
        Ok(Arc::new(Self { debit, credit, trace_id }))
    }
}
```

---

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Using f64 | Precision loss | rust_decimal |
| Mutable transaction | Audit trail broken | Immutable + events |
| String for amount | No validation | Validated newtype |
| Silent overflow | Money disappears | Checked arithmetic |

---

## Related Skills

| When | See |
|------|-----|
| Value Object design | m09-domain |
| Ownership for immutable | m01-ownership |
| Arc for sharing | m02-resource |
| Error handling | m13-domain-error |
