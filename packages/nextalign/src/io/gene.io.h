#pragma once

#include <ostream>

struct Gene;

bool operator==(const Gene& left, const Gene& right);

std::ostream& operator<<(std::ostream& os, const Gene& gene);
