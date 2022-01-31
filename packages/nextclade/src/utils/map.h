#pragma once

#include <common/safe_vector.h>

#include <algorithm>
#include <functional>
#include <string>

//template<typename Input, typename Output, template<typename> typename Container>
//Container<Output> map(const Container<Input>& input, std::function<Output(Input)> op) {
//  Container<Output> result = {};
//  result.reserve(input.size());
//  std::transform(input.cbegin(), input.cend(), std::back_inserter(result), op);
//  return result;
//}

template<typename Input, typename Output>
inline std::basic_string<Output> map(const std::basic_string<Input>& input, std::function<Output(const Input&)> op) {
  std::basic_string<Output> result = {};
  result.reserve(input.size());
  std::transform(input.cbegin(), input.cend(), std::back_inserter(result), op);
  return result;
}

template<typename Input, typename Output>
inline safe_vector<Output> map(const safe_vector<Input>& input, std::function<Output(const Input&)> op) {
  safe_vector<Output> result = {};
  result.reserve(input.size());
  std::transform(input.cbegin(), input.cend(), std::back_inserter(result), op);
  return result;
}

template<typename Input, typename Output>
inline safe_vector<Output> map_vector(const safe_vector<Input>& input, std::function<Output(const Input&)> op) {
  return map(input, op);
}
