#include <vector>

template<typename T, typename Predicate>
std::vector<T> filter(const std::vector<T>& arr, Predicate predicate) {
  std::vector<T> result;
  result.reserve(arr.size());
  std::copy_if(arr.begin(), arr.end(), std::back_inserter(result), predicate);
  result.shrink_to_fit();
  return result;
}
