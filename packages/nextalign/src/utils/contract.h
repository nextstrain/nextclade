#pragma once

#pragma GCC diagnostic push
#pragma ide diagnostic ignored "OCUnusedMacroInspection"
#pragma GCC diagnostic ignored "-Wsign-compare"


#include "config.h"

#if !defined(NDEBUG)
#include <iomanip>
#include <sstream>

#include "debugbreak.h"
#include "ieee754_comparison.h"
#include "macro_overload.h"

struct op_equal {
  template<typename T, typename U>
  inline bool operator()(const T& left, const U& right) const {
    return left == right;
  }

  template<typename T>
  inline bool operator()(const T& left, const float& right) const {
    return almost_equal(left, right, ulps);
  }

  template<typename T>
  inline bool operator()(const float& left, const T& right) const {
    return almost_equal(left, right, ulps);
  }

  template<typename T>
  inline bool operator()(const T& left, const double& right) const {
    return almost_equal(left, right, ulps);
  }

  template<typename T>
  inline bool operator()(const double& left, const T& right) const {
    return almost_equal(left, right, ulps);
  }

  inline bool operator()(double left, float right) const {
    return almost_equal(left, static_cast<double>(right), ulps);
  }

  inline bool operator()(float left, double right) const {
    return almost_equal(static_cast<double>(left), right, ulps);
  }

  inline bool operator()(float left, float right) const {
    return almost_equal(left, right, ulps);
  }

  inline bool operator()(double left, double right) const {
    return almost_equal(left, right, ulps);
  }

  inline const char* c_str() const {
    return "==";
  }

private:
  const int ulps = 4;
};

struct op_not_equal {
  template<typename T, typename U>
  inline bool operator()(const T& left, const U& right) const {
    return left != right;
  }

  template<typename T>
  inline bool operator()(const T& left, const float& right) const {
    return !almost_equal(left, right, ulps);
  }

  template<typename T>
  inline bool operator()(const float& left, const T& right) const {
    return !almost_equal(left, right, ulps);
  }

  template<typename T>
  inline bool operator()(const T& left, const double& right) const {
    return !almost_equal(left, right, ulps);
  }

  template<typename T>
  inline bool operator()(const double& left, const T& right) const {
    return !almost_equal(left, right, ulps);
  }

  inline bool operator()(double left, float right) const {
    return !almost_equal(left, static_cast<double>(right), ulps);
  }

  inline bool operator()(float left, double right) const {
    return !almost_equal(static_cast<double>(left), right, ulps);
  }

  inline bool operator()(float left, float right) const {
    return !almost_equal(left, right, ulps);
  }

  inline bool operator()(double left, double right) const {
    return !almost_equal(left, right, ulps);
  }

  inline const char* c_str() const {
    return "!=";
  }

private:
  const int ulps = 4;
};

struct op_less {
  template<typename T, typename U>
  bool operator()(const T& left, const U& right) {
    return left < right;
  }

  const char* c_str() {
    return "<";
  }
};

struct op_greater {
  template<typename T, typename U>
  bool operator()(const T& left, const U& right) {
    return left > right;
  }

  const char* c_str() {
    return ">";
  }
};

struct op_less_equal {
  template<typename T, typename U>
  bool operator()(const T& left, const U& right) {
    return left <= right;
  }

  const char* c_str() {
    return "<=";
  }
};

struct op_greater_equal {
  template<typename T, typename U>
  bool operator()(const T& left, const U& right) {
    return left >= right;
  }

  const char* c_str() {
    return ">=";
  }
};

struct op_divisible_by {
  template<typename T, typename U>
  bool operator()(const T& left, const U& right) {
    return left % right == 0;
  }

  const char* c_str() {
    return "to be divisible by";
  }
};


#define print_error(filePath, line, functionName, msgtype, errMsg)                                             \
  do {                                                                                                         \
    fflush(stdout);                                                                                            \
    fflush(stderr);                                                                                            \
    fprintf(stderr, "%s:%i:\nin function \"%s\":\n%s: %s\n\n", filePath, line, functionName, msgtype, errMsg); \
    fflush(stderr);                                                                                            \
  } while (0);

template<typename T, typename U, typename Stream>
inline void debug_assert_print_impl(
  const T& left, const U& right, const char* left_str, const char* right_str, const char* op_str, Stream& ss) {
  ss << "expected " << left_str << " " << op_str << " " << right_str << ", but got:\n"
     << left_str << " is " << left << "\n"
     << "and\n"
     << right_str << " is " << right << std::endl;
}

template<typename T, typename U>
inline std::string debug_assert_print(
  const T& left, const U& right, const char* left_str, const char* right_str, const char* op_str) {
  std::stringstream ss;
  debug_assert_print_impl(left, right, left_str, right_str, op_str, ss);
  return ss.str();
}

inline std::string debug_assert_print(
  float left, float right, const char* left_str, const char* right_str, const char* op_str) {
  std::stringstream ss;
  ss << std::fixed << std::setw(10) << std::setprecision(10);
  debug_assert_print_impl(left, right, left_str, right_str, op_str, ss);
  ss << "(The difference is " << ulps_distance(left, right) << " ULPs)\n";
  return ss.str();
}

inline std::string debug_assert_print(
  double left, double right, const char* left_str, const char* right_str, const char* op_str) {
  std::stringstream ss;
  ss << std::fixed << std::setw(20) << std::setprecision(20);
  debug_assert_print_impl(left, right, left_str, right_str, op_str, ss);
  ss << "(The difference is " << ulps_distance(left, right) << " ULPs)\n";
  return ss.str();
}

#define debug_assert3(what_happened, cond, msg)                                    \
  do {                                                                             \
    if (!(cond)) {                                                                 \
      print_error(__FILE__, __LINE__, NA_FUNCTION, what_happened, #cond "\n" msg); \
      debug_break();                                                               \
    }                                                                              \
  } while (0)

#define debug_assert2(what_happened, cond)                                \
  do {                                                                    \
    if (!(cond)) {                                                        \
      print_error(__FILE__, __LINE__, NA_FUNCTION, what_happened, #cond); \
      debug_break();                                                      \
    }                                                                     \
  } while (0)

#define debug_assert1(what_happened)                                 \
  do {                                                               \
    print_error(__FILE__, __LINE__, NA_FUNCTION, what_happened, ""); \
    debug_break();                                                   \
  } while (0)


#define debug_assert_impl(...) MACRO_OVERLOAD(debug_assert, __VA_ARGS__)


#define debug_assert_op(what_happened, left, right, op)                            \
  do {                                                                             \
    if (!(op(left, right))) {                                                      \
      const auto msg = debug_assert_print(left, right, #left, #right, op.c_str()); \
      print_error(__FILE__, __LINE__, NA_FUNCTION, what_happened, (msg.c_str()));  \
      debug_break();                                                               \
    }                                                                              \
  } while (0)

// clang-format off
#define debug_assert(...) debug_assert_impl("Assertion failed", __VA_ARGS__)
#define debug_assert_equal(left, right) debug_assert_op("Assertion failed", left, right, op_equal())
#define debug_assert_not_equal(left, right) debug_assert_op("Assertion failed", left, right, op_not_equal())
#define debug_assert_less(left, right) debug_assert_op("Assertion failed", left, right, op_less())
#define debug_assert_less_equal(left, right) debug_assert_op("Assertion failed", left, right, op_less_equal())
#define debug_assert_greater(left, right) debug_assert_op("Assertion failed", left, right, op_greater())
#define debug_assert_greater_equal(left, right) debug_assert_op("Assertion failed", left, right, op_greater_equal())
#define debug_assert_divisible_by(left, right) debug_assert_op("Assertion failed", left, right, op_divisible_by())

#define precondition(...) debug_assert_impl("Precondition violated", __VA_ARGS__)
#define precondition_equal(left, right) debug_assert_op("Precondition violated", left, right, op_equal())
#define precondition_not_equal(left, right) debug_assert_op("Precondition violated", left, right, op_not_equal())
#define precondition_less(left, right) debug_assert_op("Precondition violated", left, right, op_less())
#define precondition_less_equal(left, right) debug_assert_op("Precondition violated", left, right, op_less_equal())
#define precondition_greater(left, right) debug_assert_op("Precondition violated", left, right, op_greater())
#define precondition_greater_equal(left, right) debug_assert_op("Precondition violated", left, right, op_greater_equal())
#define precondition_divisible_by(left, right) debug_assert_op("Precondition violated", left, right, op_divisible_by())

#define invariant(cond) debug_assert_impl("Invariant violated", cond)
#define invariant_equal(left, right) debug_assert_op("Invariant violated", left, right, op_equal())
#define invariant_not_equal(left, right) debug_assert_op("Invariant violated", left, right, op_not_equal())
#define invariant_less(left, right) debug_assert_op("Invariant violated", left, right, op_less())
#define invariant_less_equal(left, right) debug_assert_op("Invariant violated", left, right, op_less_equal())
#define invariant_greater(left, right) debug_assert_op("Invariant violated", left, right, op_greater())
#define invariant_greater_equal(left, right) debug_assert_op("Invariant violated", left, right, op_greater_equal())
#define invariant_divisible_by(left, right) debug_assert_op("Invariant violated", left, right, op_divisible_by())

#define postcondition(cond) debug_assert_impl("Postcondition violated", cond)
#define postcondition_equal(left, right) debug_assert_op("Postcondition violated", left, right, op_equal())
#define postcondition_not_equal(left, right) debug_assert_op("Postcondition violated", left, right, op_not_equal())
#define postcondition_less(left, right) debug_assert_op("Postcondition violated", left, right, op_less())
#define postcondition_less_equal(left, right) debug_assert_op("Postcondition violated", left, right, op_less_equal())
#define postcondition_greater(left, right) debug_assert_op("Postcondition violated", left, right, op_greater())
#define postcondition_greater_equal(left, right) debug_assert_op("Postcondition violated", left, right, op_greater_equal())
#define postcondition_divisible_by(left, right) debug_assert_op("Postcondition violated", left, right, op_divisible_by())
// clang-format on


#else// not debug mode

#define debug_assert(...)
#define debug_assert_equal(...)
#define debug_assert_not_equal(...)
#define debug_assert_less(...)
#define debug_assert_less_equal(...)
#define debug_assert_greater(...)
#define debug_assert_greater_equal(...)
#define debug_assert_divisible_by(...)

#define precondition(...)
#define precondition_equal(...)
#define precondition_not_equal(...)
#define precondition_less(...)
#define precondition_less_equal(...)
#define precondition_greater(...)
#define precondition_greater_equal(...)
#define precondition_divisible_by(...)

#define invariant(...)
#define invariant_equal(...)
#define invariant_not_equal(...)
#define invariant_less(...)
#define invariant_less_equal(...)
#define invariant_greater(...)
#define invariant_greater_equal(...)
#define invariant_divisible_by(...)

#define postcondition(...)
#define postcondition_equal(...)
#define postcondition_not_equal(...)
#define postcondition_less(...)
#define postcondition_less_equal(...)
#define postcondition_greater(...)
#define postcondition_greater_equal(...)
#define postcondition_divisible_by(...)

#endif

#pragma GCC diagnostic pop
