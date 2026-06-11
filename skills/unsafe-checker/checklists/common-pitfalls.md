# Common Unsafe Pitfalls and Fixes

A reference of frequently encountered unsafe bugs and how to fix them.

## Pitfall 1: Dangling Pointer from Local

**Bug:**
```rust
fn bad() -> *const i32 {
    let x = 42;
    &x as *const i32  // Dangling after return!
}
```

**Fix:**
```rust
fn good() -> Box<i32> {
    Box::new(42)  // Heap allocation lives beyond function
}

// Or return the value itself
fn better() -> i32 {
    42
}
```

## Pitfall 2: CString Lifetime

**Bug:**
```rust
use std::ffi::{CString, c_char};

fn bad() -> *const c_char {
    let s = CString::new("hello").unwrap();
    s.as_ptr()  // Dangling! CString dropped
}
```

**Fix:**
```rust
use std::ffi::{CString, c_char};

fn good(s: &CString) -> *const c_char {
    s.as_ptr()  // Caller keeps CString alive
}

// Or take ownership
fn also_good(s: CString) -> *const c_char {
    s.into_raw()  // Caller must free with CString::from_raw
}
```

## Pitfall 3: Vec set_len with Uninitialized Data

**Bug:**
```rust
fn bad() -> Vec<String> {
    let mut v = Vec::with_capacity(10);
    unsafe { v.set_len(10); }  // Strings are uninitialized!
    v
}
```

**Fix:**
```rust
fn good() -> Vec<String> {
    let mut v = Vec::with_capacity(10);
    for _ in 0..10 {
        v.push(String::new());
    }
    v
}

// Or use resize
fn also_good() -> Vec<String> {
    let mut v = Vec::new();
    v.resize(10, String::new());
    v
}
```

## Pitfall 4: Reference to Packed Field

**Bug:**
```rust
#[repr(packed)]
struct Packed { a: u8, b: u32 }

fn bad(p: &Packed) -> &u32 {
    &p.b  // E0793: hard error (was UB before it became a hard error)
}
```

**Fix:**
```rust
#[repr(packed)]
struct Packed { a: u8, b: u32 }

fn good(p: &Packed) -> u32 {
    unsafe { std::ptr::addr_of!(p.b).read_unaligned() }
}
```

## Pitfall 5: Mutable Aliasing Through Raw Pointers

**Bug:**
```rust
fn bad() {
    let mut x = 42;
    let ptr1 = &mut x as *mut i32;
    let ptr2 = &mut x as *mut i32;  // Already have ptr1!
    unsafe {
        *ptr1 = 1;
        *ptr2 = 2;  // Aliasing mutable pointers!
    }
}
```

**Fix:**
```rust
fn good() {
    let mut x = 42;
    let ptr = &mut x as *mut i32;
    unsafe {
        *ptr = 1;
        *ptr = 2;  // Same pointer, sequential access
    }
}
```

## Pitfall 6: Transmute to Wrong Size

**Bug:**
```rust
fn bad() {
    let x: u32 = 42;
    let y: u64 = unsafe { std::mem::transmute(x) };  // E0512: size mismatch (rejected at compile time)
}
```

**Fix:**
```rust
fn good() {
    let x: u32 = 42;
    let y: u64 = x as u64;  // Use conversion
}
```

## Pitfall 7: Invalid Enum Discriminant

**Bug:**
```rust
#[repr(u8)]
enum Status { A = 0, B = 1, C = 2 }

fn bad(raw: u8) -> Status {
    unsafe { std::mem::transmute(raw) }  // UB if raw > 2!
}
```

**Fix:**
```rust
#[repr(u8)]
enum Status { A = 0, B = 1, C = 2 }

fn good(raw: u8) -> Option<Status> {
    match raw {
        0 => Some(Status::A),
        1 => Some(Status::B),
        2 => Some(Status::C),
        _ => None,
    }
}
```

## Pitfall 8: FFI Panic Unwinding

**Bug:**
```rust
#[unsafe(no_mangle)]
extern "C" fn callback(x: i32) -> i32 {
    if x < 0 {
        panic!("negative!");  // Panic reaching an extern "C" boundary
                              // aborts the process (defined since 1.81;
                              // UB before that). Either way: no recovery.
    }
    x * 2
}
```

**Fix:**
```rust
#[unsafe(no_mangle)]
extern "C" fn callback(x: i32) -> i32 {
    std::panic::catch_unwind(|| {
        if x < 0 {
            panic!("negative!");
        }
        x * 2
    }).unwrap_or(-1)  // Return error code on panic
}
```

## Pitfall 9: Double Free from Clone + into_raw

**Bug:**
```rust
use std::ffi::c_void;

unsafe extern "C" { fn free(ptr: *mut c_void); }

struct Handle(*mut c_void);

impl Clone for Handle {
    fn clone(&self) -> Self {
        Handle(self.0)  // Both now "own" same pointer!
    }
}

impl Drop for Handle {
    fn drop(&mut self) {
        unsafe { free(self.0); }  // Double free when both drop!
    }
}
```

**Fix:**
```rust
use std::ffi::c_void;

struct Handle(*mut c_void);

// Don't implement Clone, or implement proper reference counting
impl Handle {
    fn clone_ptr(&self) -> *mut c_void {
        self.0  // Return raw pointer, no ownership
    }
}
```

## Pitfall 10: Forget Doesn't Run Destructors

**Bug:**
```rust
fn bad(lock: &std::sync::Mutex<i32>) {
    let guard = lock.lock().unwrap();
    std::mem::forget(guard);  // Lock never released!
}
```

**Fix:**
```rust
fn good(lock: &std::sync::Mutex<i32>) {
    let guard = lock.lock().unwrap();
    // Let guard drop naturally
    // or explicitly: drop(guard);
}
```

## Quick Reference Table

| Pitfall | Detection | Fix |
|---------|-----------|-----|
| Dangling pointer | Miri | Extend lifetime or heap allocate |
| Uninitialized read | Miri | Use MaybeUninit properly |
| Misaligned access | Miri, UBsan | read_unaligned, copy by value |
| Data race | TSan | Use atomics or mutex |
| Double free | ASan | Track ownership carefully |
| Invalid enum | Manual review | Use TryFrom |
| FFI panic | Testing | catch_unwind |
| Type confusion | Miri | Match types exactly |
