#pragma once

/** Configures jemalloc.
 * Should be included before `main()`
 *
 * See: http://jemalloc.net/jemalloc.3.html#tuning
 * https://github.com/jemalloc/jemalloc/blob/dev/TUNING.md
 */

#ifndef __APPLE__
#define MALLOC_BACKGROUND_THREAD "background_thread:true,"
#else
#define MALLOC_BACKGROUND_THREAD
#endif

const char* malloc_conf = MALLOC_BACKGROUND_THREAD "metadata_thp:auto,dirty_decay_ms:30000,muzzy_decay_ms:30000";
