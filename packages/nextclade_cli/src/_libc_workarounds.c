/**
 * Contains a collection of workarounds for static linkage of libraries that
 * rely on dynamic libc linkage.
 *
 * Linking static libraries which require symbols in libc is not portable, as
 * end user machine might not contain the version of libc the program was
 * linked against originally.
 *
 * Below are the functions from dynamic libraries, that our
 * dependencies rely on for features which are not used in our application. It
 * is safe to replace them with these empty stubs.
 */


int getpwuid_r(void) {
  return 0;
}

int getservbyname_r(void) {
  return 0;
}

int getservbyport_r(void) {
  return 0;
}
