# Lifetime Patterns

## Basic Lifetime Annotation

### When Required
```rust
// ERROR E0106: missing lifetime specifier
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
```

```rust
// FIX: explicit lifetime
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

### Lifetime Elision Rules
1. Each input reference gets its own lifetime
2. If one input lifetime, output uses same
3. If `&self` or `&mut self`, output uses self's lifetime

```rust
// These are equivalent (elision applies):
fn first_word(s: &str) -> &str { ... }
// fn first_word<'a>(s: &'a str) -> &'a str { ... }

// Method with self (elision applies):
impl MyStruct {
    fn get_ref(&self) -> &str { ... }
    // Equivalent to:
    // fn get_ref<'a>(&'a self) -> &'a str { ... }
}
```

---

## Struct Lifetimes

### Struct Holding References
```rust
// Struct must declare lifetime for references
struct Excerpt<'a> {
    part: &'a str,
}

impl<'a> Excerpt<'a> {
    fn level(&self) -> i32 { 3 }

    // Return reference tied to self's lifetime
    fn get_part(&self) -> &str {
        self.part
    }
}
```

### Multiple Lifetimes in Struct
```rust
struct Multi<'a, 'b> {
    x: &'a str,
    y: &'b str,
}

// Use when references may have different lifetimes
fn make_multi<'a, 'b>(x: &'a str, y: &'b str) -> Multi<'a, 'b> {
    Multi { x, y }
}
```

---

## 'static Lifetime

### When to Use
```rust
// String literals are 'static
let s: &'static str = "hello";

// Owned data can be leaked to 'static
let leaked: &'static str = Box::leak(String::from("hello").into_boxed_str());

// Thread spawn requires 'static or move
std::thread::spawn(move || {
    // closure owns data, satisfies 'static
});
```

### Avoid Overusing 'static
```rust
// BAD: requires 'static unnecessarily
fn process(s: &'static str) { ... }
```

```rust
// GOOD: elided lifetime — desugars to fn process<'a>(s: &'a str)
fn process(s: &str) { ... }
```

---

## Higher-Ranked Trait Bounds (HRTB)

### for<'a> Syntax
```rust
// Function that works with any lifetime
fn apply_to_ref<F>(f: F)
where
    F: for<'a> Fn(&'a str) -> &'a str,
{
    let s = String::from("hello");
    let result = f(&s);
    println!("{}", result);
}
```

### Common Use: Closure Bounds
```rust
// Name the item lifetime 'a to tie the output to the slice items
// (with two elided input lifetimes the output would be ambiguous: E0106).
// The predicate uses HRTB: it must accept a borrow of ANY lifetime.
fn filter_refs<'a, F>(items: &[&'a str], pred: F) -> Vec<&'a str>
where
    F: for<'b> Fn(&'b str) -> bool,
{
    items.iter().copied().filter(|s| pred(s)).collect()
}
```

---

## Lifetime Bounds

### 'a: 'b (Outlives)
```rust
// 'a must live at least as long as 'b
fn coerce<'a, 'b>(x: &'a str) -> &'b str
where
    'a: 'b,
{
    x
}
```

### T: 'a (Type Outlives Lifetime)
```rust
// T must live at least as long as 'a
struct Wrapper<'a, T: 'a> {
    value: &'a T,
}

// Common pattern with trait bounds
trait MyTrait {}
fn use_trait<'a, T: MyTrait + 'a>(t: &'a T) { ... }
```

---

## Common Lifetime Mistakes

### Mistake 1: Returning Reference to Local
```rust
// WRONG — ERROR E0106 (missing lifetime specifier): there is no input
// the output lifetime could come from; the data must be owned.
// (With an explicit lifetime it fails E0515 instead.)
fn dangle() -> &String {
    let s = String::from("hello");
    &s
}

// RIGHT
fn no_dangle() -> String {
    String::from("hello")
}
```

### Mistake 2: Conflicting Lifetimes
```rust
// WRONG: might return reference to y which has shorter lifetime
fn wrong<'a, 'b>(x: &'a str, y: &'b str) -> &'a str {
    y  // ERROR: lifetime may not live long enough ('b is not known to outlive 'a)
}

// RIGHT: use same lifetime or add bound
fn right<'a>(x: &'a str, y: &'a str) -> &'a str {
    y  // OK: both have lifetime 'a
}
```

### Mistake 3: Struct Outlives Reference
```rust
// WRONG: s might outlive the string it references
let r;
{
    let s = String::from("hello");
    r = Excerpt { part: &s };  // ERROR E0597: `s` does not live long enough
}
println!("{}", r.part);  // s already dropped

// RIGHT: ensure source outlives struct
let s = String::from("hello");
let r = Excerpt { part: &s };
println!("{}", r.part);  // OK: s still in scope
```

---

## Subtyping and Variance

### Covariance
```rust
// &'a T is covariant in 'a
// Can use &'long where &'short expected
fn example<'short, 'long: 'short>(long_ref: &'long str) {
    let short_ref: &'short str = long_ref;  // OK: covariance
}
```

### Invariance
```rust
// &mut T is invariant in T: a slot typed &'a str cannot accept a
// shorter-lived &'b str through a &mut reference
fn overwrite<'a, 'b>(x: &mut &'a str, y: &'b str) {
    *x = y;  // ERROR: assignment requires that `'b` must outlive `'a`
}

// FIX: declare the outlives relationship
fn overwrite_ok<'a, 'b: 'a>(x: &mut &'a str, y: &'b str) {
    *x = y;  // OK: 'b outlives 'a
}
```

### Why Invariance Matters
```rust
// Invariance stops a short-lived borrow from leaking into a
// long-lived slot through &mut:
fn set<'a>(slot: &mut &'a str, value: &'a str) {
    *slot = value;
}

fn demo() {
    let mut p: &'static str = "static";
    {
        let s = String::from("short");
        set(&mut p, &s);  // ERROR E0597: `s` does not live long enough
        // &mut &'static str is invariant, so 'a is forced to 'static
    }
    println!("{}", p);
}
```

### Practical Impact
```rust
// This works due to covariance
fn accept_any<'a>(s: &'a str) { ... }

let s = String::from("hello");
let long_lived: &str = &s;
accept_any(long_lived);  // 'long coerces to 'short
```
