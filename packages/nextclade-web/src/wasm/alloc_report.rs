//! Global allocator that reports a failed allocation to JS before the out-of-memory abort.
//!
//! On allocation failure Rust calls `handle_alloc_error`, which aborts the WebAssembly instance
//! without running the panic hook. JS then receives only `RuntimeError: unreachable`, and release
//! builds strip the function names from the stack. This allocator stores the size and alignment of
//! the failed request in `globalThis.__nextcladeAllocFailure` first, so that the worker can name
//! the cause of the abort (see `src/helpers/ErrorWasm.ts`).
//!
//! A failed fallible allocation (for example `Vec::try_reserve_exact`) also stores the report, but
//! returns an error instead of aborting. The report is meaningful only together with a
//! `WebAssembly.RuntimeError`.

use std::alloc::{GlobalAlloc, Layout, System};
use wasm_bindgen::prelude::wasm_bindgen;

// The JS function allocates nothing in the WebAssembly memory and cannot throw: an exception
// inside `GlobalAlloc::alloc` would replace the out-of-memory abort with an unrelated error.
#[wasm_bindgen(inline_js = "
export function report_alloc_failure(size, align) {
  globalThis.__nextcladeAllocFailure = { size, align }
}
")]
extern "C" {
  fn report_alloc_failure(size: usize, align: usize);
}

/// Allocator that delegates to `System` and reports every failed request to JS.
struct ReportingAllocator;

// SAFETY: every method passes its arguments unchanged to `System` and returns the result of
// `System` unchanged, so the `GlobalAlloc` contract of `System` holds for this allocator. The
// failure report runs only after `System` returned null and does not allocate.
#[allow(unsafe_code)]
unsafe impl GlobalAlloc for ReportingAllocator {
  #[inline]
  unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
    // SAFETY: the caller upholds the contract of `GlobalAlloc::alloc`.
    let ptr = unsafe { System.alloc(layout) };
    if ptr.is_null() {
      report_alloc_failure(layout.size(), layout.align());
    }
    ptr
  }

  #[inline]
  unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
    // SAFETY: the caller upholds the contract of `GlobalAlloc::alloc_zeroed`.
    let ptr = unsafe { System.alloc_zeroed(layout) };
    if ptr.is_null() {
      report_alloc_failure(layout.size(), layout.align());
    }
    ptr
  }

  #[inline]
  unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
    // SAFETY: the caller upholds the contract of `GlobalAlloc::dealloc`.
    unsafe { System.dealloc(ptr, layout) };
  }

  #[inline]
  unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
    // SAFETY: the caller upholds the contract of `GlobalAlloc::realloc`.
    let new_ptr = unsafe { System.realloc(ptr, layout, new_size) };
    if new_ptr.is_null() {
      report_alloc_failure(new_size, layout.align());
    }
    new_ptr
  }
}

#[global_allocator]
static GLOBAL_ALLOCATOR: ReportingAllocator = ReportingAllocator;
