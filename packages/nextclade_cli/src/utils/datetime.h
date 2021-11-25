#include <chrono>

auto getTimestampNow() {
  const auto p1 = std::chrono::system_clock::now();
  return std::chrono::duration_cast<std::chrono::seconds>(p1.time_since_epoch()).count();
}
