#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <cstdio>
#include <utility>

#include "FileReaderGz.h"
#include "FileReaderPlain.h"
#include "FileReaderXz.h"
#include "filesystem.h"
#include "kseqpp.h"


template<typename FileReaderImpl>
class FastaStreamImpl : public FastaStream {
  using KStream = klibpp::KStream<FileReaderImpl>;
  KStream kstream;

public:
  FastaStreamImpl() = delete;

  explicit FastaStreamImpl(const std::string& filePath) : kstream{FileReaderImpl{filePath}} {}

  virtual ~FastaStreamImpl() = default;

  bool next(AlgorithmInput& record) override {
    return kstream.next(record);
  }
};

std::unique_ptr<FastaStream> makeFastaStream(const std::string& filePath) {
  fs::path p{filePath};
  const auto ext = p.extension().string();
  if (ext == ".gz") {
    return std::make_unique<FastaStreamImpl<FileReaderGz>>(filePath);
  }
  if (ext == ".xz") {
    return std::make_unique<FastaStreamImpl<FileReaderXz>>(filePath);
  }

  return std::make_unique<FastaStreamImpl<FileReaderPlain>>(filePath);
}

std::vector<AlgorithmInput> parseSequences(const std::string& filename) {
  std::vector<AlgorithmInput> seqs;

  auto fastaStream = makeFastaStream(filename);

  AlgorithmInput input;
  while (fastaStream->next(input)) {
    seqs.emplace_back(std::move(input));
  }

  return seqs;
}
