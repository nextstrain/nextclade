#include <stdarg.h>
#include <stdio.h>

/** Symbols that are missing in libmusl, but required */

#if defined __linux__ && !defined(__GLIBC__)
int __printf_chk(int flag, const char *format, ...) {
  va_list ap;
  int ret;
  va_start(ap, format);
  ret = vfprintf(stdout, format, ap);
  va_end(ap);
  return ret;
}

int __fprintf_chk(FILE *fp, int flag, const char *format, ...) {
  va_list ap;
  int ret;
  va_start(ap, format);
  ret = vfprintf(fp, format, ap);
  va_end(ap);
  return ret;
}

int __snprintf_chk(char *s, size_t maxlen, int flags, size_t len, const char *format, ...) {
  va_list arg;
  int done;
  va_start(arg, format);
  done = vsnprintf(s, maxlen, format, arg);
  va_end(arg);
  return done;
}

int __vfprintf_chk(FILE *stream, int flag, const char *format, va_list ap) {
  return vfprintf(stream, format, ap);
}
#endif
