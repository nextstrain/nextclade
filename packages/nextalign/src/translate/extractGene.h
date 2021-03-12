#pragma once

#include <fmt/format.h>

#include <exception>
#include <string>
#include <vector>

#include "nextalign/private/nextalign_private.h"

struct Gene;

class ErrorExtractGeneLengthNonMul3 : public std::runtime_error {
public:
  ErrorExtractGeneLengthNonMul3(const Gene& gene, int resultLengthPreStrip)
      : std::runtime_error(fmt::format(                                                //
          "When extracting gene \"{:s}\": Genes are expected to have length that is a "//
          "multiple of 3, but the extracted Gene \"{:s}\" has length {:d}. "           //
          "The gene map contained the following information: "                         //
          "start: {:d}, end: {:d}, length: {:d}"                                       //
          ,
          gene.geneName, gene.geneName, resultLengthPreStrip, gene.start, gene.end, gene.length)) {}
};

class ErrorExtractStrippedGeneEmpty : public std::runtime_error {
public:
  ErrorExtractStrippedGeneEmpty(const Gene& gene, int resultLengthPreStrip)
      : std::runtime_error(fmt::format(                                                                        //
          "When extracting gene \"{:s}\": The gene ended up being empty after being stripped from insertions. "//
          "Before stripping insertions this gene had length {:d}. "                                            //
          "The gene map contained the following information: "                                                 //
          "start: {:d}, end: {:d}, length: {:d}"                                                               //
          ,
          gene.geneName, resultLengthPreStrip, gene.start, gene.end, gene.length)) {}
};

class ErrorExtractGeneStrippedLengthNonMul3 : public std::runtime_error {
public:
  ErrorExtractGeneStrippedLengthNonMul3(const Gene& gene, int resultLength, int resultLengthPreStrip)
      : std::runtime_error(fmt::format(                                                                          //
          "When extracting gene \"{:s}\": Genes are expected to have length that is a "                          //
          "multiple of 3, but the extracted Gene \"{:s}\" after being stripped from insertions has length {:d}. "//
          "Before stripping insertions this gene had length {:d}. "                                              //
          "The gene map contained the following information: "                                                   //
          "start: {:d}, end: {:d}, length: {:d}"                                                                 //
          ,
          gene.geneName, gene.geneName, resultLength, resultLengthPreStrip, gene.start, gene.end, gene.length)) {}
};

NucleotideSequenceView extractGeneRef(const NucleotideSequenceView& ref, const Gene& gene);

NucleotideSequence extractGeneQuery(
  const NucleotideSequenceView& query, const Gene& gene, const std::vector<int>& coordMap);
