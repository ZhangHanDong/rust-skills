# Common Ownership Errors & Fixes

## E0382: Use of Moved Value

### Error Pattern
```rust
let s = String::from("hello");
let s2 = s;          // s moved here
println!("{}", s);   // ERROR: value borrowed after move
```

### Fix Options

**Option 1: Clone (if ownership not needed)**
```rust
let s = String::from("hello");
let s2 = s.clone();  // s is cloned
println!("{}", s);   // OK: s still valid
```

**Option 2: Borrow (if modification not needed)**
```rust
let s = String::from("hello");
let s2 = &s;         // borrow, not move
println!("{}", s);   // OK
println!("{}", s2);  // OK
```

**Option 3: Use Rc/Arc (for shared ownership)**
```rust
use std::rc::Rc;
let s = Rc::new(String::from("hello"));
let s2 = Rc::clone(&s);  // shared ownership
println!("{}", s);       // OK
println!("{}", s2);      // OK
```

---

## E0597: Borrowed Value Does Not Live Long Enough

### Error Pattern
```rust
let r;
{
    let s = String::from("hello");
    r = &s;
}                    // ERROR E0597: `s` does not live long enough
println!("{}", r);   // borrow used after owner dropped
```

(Returning `&s` to a local from a function is the related E0515; a bare
`fn get_str() -> &str` with no inputs fails earlier with E0106.)

### Fix Options

**Option 1: Keep the owner alive as long as the borrow**
```rust
let s = String::from("hello");
let r = &s;
println!("{}", r);  // OK: owner outlives the borrow
```

**Option 2: Move ownership out instead of borrowing**
```rust
let r;
{
    let s = String::from("hello");
    r = s;  // move, not borrow
}
println!("{}", r);  // OK: r owns the data now
```

---

## E0499: Cannot Borrow as Mutable More Than Once

### Error Pattern
```rust
let mut s = String::from("hello");
let r1 = &mut s;
let r2 = &mut s;  // ERROR: second mutable borrow
println!("{}, {}", r1, r2);
```

### Fix Options

**Option 1: Sequential borrows**
```rust
let mut s = String::from("hello");
{
    let r1 = &mut s;
    r1.push_str(" world");
}  // r1 goes out of scope
let r2 = &mut s;  // OK: r1 no longer exists
```

**Option 2: Use RefCell for interior mutability**
```rust
use std::cell::RefCell;
let s = RefCell::new(String::from("hello"));
let mut r1 = s.borrow_mut();
// drop r1 before borrowing again
drop(r1);
let mut r2 = s.borrow_mut();
```

---

## E0502: Cannot Borrow as Mutable While Immutable Borrow Exists

### Error Pattern
```rust
let mut v = vec![1, 2, 3];
let first = &v[0];      // immutable borrow
v.push(4);              // ERROR: mutable borrow while immutable exists
println!("{}", first);
```

### Fix Options

**Option 1: Finish using immutable borrow first**
```rust
let mut v = vec![1, 2, 3];
let first = v[0];       // copy value, not borrow
v.push(4);              // OK
println!("{}", first);  // OK: using copied value
```

**Option 2: Clone before mutating**
```rust
let mut v = vec![1, 2, 3];
let first = v[0].clone();  // if T: Clone
v.push(4);
println!("{}", first);
```

---

## E0507: Cannot Move Out of Borrowed Content

### Error Pattern
```rust
fn take_string(s: &String) {
    let moved = *s;  // ERROR E0507: cannot move out of `*s` which is behind a shared reference
}
```

### Fix Options

**Option 1: Clone**
```rust
fn take_string(s: &String) {
    let cloned = s.clone();
}
```

**Option 2: Take ownership in function signature**
```rust
fn take_string(s: String) {  // take ownership
    let moved = s;
}
```

**Option 3: Use mem::take for Option/Default types**
```rust
fn take_from_option(opt: &mut Option<String>) -> Option<String> {
    std::mem::take(opt)  // replaces with None, returns owned value
}
```

---

## E0515: Return Local Reference

### Error Pattern
```rust
fn create_string<'a>() -> &'a String {
    let s = String::from("hello");
    &s  // ERROR E0515: cannot return reference to local variable `s`
}
// Note: without the explicit lifetime, the same code fails earlier
// with E0106 (missing lifetime specifier).
```

### Fix Options

**Option 1: Return owned value**
```rust
fn create_string() -> String {
    String::from("hello")
}
```

**Option 2: Use static/const**
```rust
fn get_static_str() -> &'static str {
    "hello"
}
```

---

## E0716: Temporary Value Dropped While Borrowed

### Error Pattern
```rust
let s = String::from("hello").as_str();  // ERROR E0716: temporary value
println!("{}", s);                       // dropped while borrowed
```

Note: `let r: &str = &String::from("hello");` compiles on current Rust —
temporary lifetime extension covers a direct `&temp` in a `let` initializer,
but NOT a method call (`temp.as_str()`) or a borrow created mid-expression.

### Fix Options

**Option 1: Bind the owner first, then borrow**
```rust
let owner = String::from("hello");
let s = owner.as_str();
println!("{}", s);  // OK: owner lives to end of scope
```

**Option 2: Use the temporary within the same statement**
```rust
println!("{}", String::from("hello"));  // temporary lives long enough here
```

---

## Pattern: Loop Ownership Issues

### Error Pattern
```rust
let strings = vec![String::from("a"), String::from("b")];
for s in strings {
    println!("{}", s);
}
// ERROR E0382: strings moved into loop (borrow of moved value)
println!("{:?}", strings);
```

### Fix Options

**Option 1: Iterate by reference**
```rust
let strings = vec![String::from("a"), String::from("b")];
for s in &strings {
    println!("{}", s);
}
println!("{:?}", strings);  // OK
```

**Option 2: Use iter()**
```rust
let strings = vec![String::from("a"), String::from("b")];
for s in strings.iter() {
    println!("{}", s);
}
```

**Option 3: Clone if needed**
```rust
let strings = vec![String::from("a"), String::from("b")];
for s in strings.clone() {
    // consumes cloned vec
}
println!("{:?}", strings);  // original still available
```
