#pragma once

#include <boost/config.hpp>

#ifndef NDEBUG
#include <boost/numeric/conversion/cast.hpp>
#endif

template<typename Y, typename X>
BOOST_FORCEINLINE Y safe_cast(X x) {
#ifndef NDEBUG
  return boost::numeric_cast<Y>(x);
#else
  return static_cast<Y>(x);
#endif
}
