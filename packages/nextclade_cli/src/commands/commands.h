#pragma once

#include <memory>

namespace Nextclade {
  struct CliParamsRoot;
  struct CliParamsRun;
  struct CliParamsDatasetFetch;
  struct CliParamsDatasetList;

  void executeCommandRoot(const std::shared_ptr<CliParamsRoot>& cliParams);

  void executeCommandRun(const std::shared_ptr<CliParamsRun>& cliParams);

  void executeCommandDatasetFetch(const std::shared_ptr<CliParamsDatasetFetch>& cliParams);

  void executeCommandDatasetList(const std::shared_ptr<CliParamsDatasetList>& cliParams);
}// namespace Nextclade
