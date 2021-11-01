#pragma once

#include <nextclade/nextclade.h>

#include <boost/algorithm/string/join.hpp>
#include <string>
#include <vector>

namespace Nextclade {
  template<typename Container, typename Formatter, typename Delimiter>
  std::string formatAndJoin(const Container& elements, Formatter formatter, Delimiter delimiter) {
    std::vector<std::string> formatted;
    std::transform(elements.cbegin(), elements.cend(), std::back_inserter(formatted), formatter);
    return boost::algorithm::join(formatted, delimiter);
  }
}// namespace Nextclade
