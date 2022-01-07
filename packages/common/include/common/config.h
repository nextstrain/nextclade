#pragma once

#include <boost/current_function.hpp>

#if defined DEBUG || defined _DEBUG || !defined(NDEBUG) || !defined(_NDEBUG)
#define NA_DEBUG//NOLINT(OCUnusedMacroInspection)
#endif

#define NA_FUNCTION BOOST_CURRENT_FUNCTION//NOLINT(OCUnusedMacroInspection)
