#pragma once

#include <nextalign/nextalign.h>

#include <vector>

std::vector<int> mapCoordinates(const NucleotideSequence& ref);

std::vector<int> mapReverseCoordinates(const NucleotideSequence& ref);
