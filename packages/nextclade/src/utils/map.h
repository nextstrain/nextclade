#pragma once

#include <algorithm>
#include <functional>

template<typename Input, typename Output, template<typename> typename Container>
Container<Output> map(const Container<Input>& input, std::function<Output(Input)> op) {
  Container<Output> result = {};
  result.reserve(input.size());
  std::transform(input.cbegin(), input.cend(), std::back_inserter(result), op);
  return result;
}
