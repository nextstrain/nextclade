#pragma once

#include <algorithm>
#include <functional>
#include <string>
#include <vector>

//template<typename Input, typename Output, template<typename> typename Container>
//Container<Output> map(const Container<Input>& input, std::function<Output(Input)> op) {
//  Container<Output> result = {};
//  result.reserve(input.size());
//  std::transform(input.cbegin(), input.cend(), std::back_inserter(result), op);
//  return result;
//}

template<typename Input, typename Output>
inline std::basic_string<Output> map(const std::basic_string<Input>& input, std::function<Output(Input)> op) {
  std::basic_string<Output> result = {};
  result.reserve(input.size());
  std::transform(input.cbegin(), input.cend(), std::back_inserter(result), op);
  return result;
}

template<typename Input, typename Output>
inline std::vector<Output> map(const std::vector<Input>& input, std::function<Output(Input)> op) {
  std::vector<Output> result = {};
  result.reserve(input.size());
  std::transform(input.cbegin(), input.cend(), std::back_inserter(result), op);
  return result;
}
