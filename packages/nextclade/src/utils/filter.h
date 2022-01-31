#include <common/safe_vector.h>

template<typename T, typename Predicate>
safe_vector<T> filter(const safe_vector<T>& arr, Predicate predicate) {
  safe_vector<T> result;
  result.reserve(arr.size());
  std::copy_if(arr.begin(), arr.end(), std::back_inserter(result), predicate);
  result.shrink_to_fit();
  return result;
}
