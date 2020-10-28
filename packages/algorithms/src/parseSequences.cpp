#include <fmt/format.h>

#include <boost/algorithm/string.hpp>
#include <map>
#include <regex>

namespace {
  using regex = std::regex;
  using std::regex_replace;
}// namespace

auto sanitizeLine(std::string line) {
  line = regex_replace(line, regex("\r\n"), "\n");
  line = regex_replace(line, regex("\r"), "\n");
  boost::trim(line);
  return line;
}

auto sanitizeSequence(std::string seq) {
  boost::to_upper(seq);
  // NOTE: Strip all characters except capital letters, asterisks, dots and question marks
  const auto re = regex("[^.?*A-Z]");
  seq = regex_replace(seq, re, "", std::regex_constants::match_any);
  return seq;
}

void addSequence(std::string currentSeqName, const std::string &currentSeq,
  std::map<std::string, std::string> &seqs,// NOLINT(google-runtime-references)
  std::map<std::string, int> &seqNames     // NOLINT(google-runtime-references)
) {
  if (currentSeqName.empty()) {
    currentSeqName = "Untitled";
  }

  auto it = seqNames.find(currentSeqName);
  if (it != seqNames.end()) {
    const auto nameCount = it->second;
    currentSeqName = fmt::format("{:s} ({:d})", currentSeqName, nameCount);
    it->second += 1;
  } else {
    seqNames.emplace(currentSeqName, 1);
  }

  const auto currentSeqSane = sanitizeSequence(currentSeq);
  seqs.emplace(currentSeqName, currentSeqSane);
}


std::map<std::string, std::string> parseSequences(std::istream &istream) {
  std::string currentSeqName;
  std::string currentSeq;
  std::map<std::string, std::string> seqs;
  std::map<std::string, int> seqNames;

  std::string line;
  while (std::getline(istream, line)) {
    line = sanitizeLine(line);

    if (boost::starts_with(line, ">")) {
      if (!currentSeq.empty()) {
        addSequence(currentSeqName, currentSeq, seqs, seqNames);
      }

      currentSeqName = line.substr(1, line.size());
      boost::trim(currentSeqName);
      currentSeq = "";
    } else {
      currentSeq += line;
    }
  }

  if (!currentSeq.empty()) {
    addSequence(currentSeqName, currentSeq, seqs, seqNames);
  }

  return seqs;
}
