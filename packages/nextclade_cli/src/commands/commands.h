#pragma once

#include <memory>

namespace Nextclade {
  struct CliParamsRoot;
  struct CliParamsRun;
  struct CliParamsDatasetGet;
  struct CliParamsDatasetList;

  void executeCommandRoot(const std::shared_ptr<CliParamsRoot>& cliParams);

  void executeCommandRun(const std::shared_ptr<CliParamsRun>& cliParams);

  void executeCommandDatasetGet(const std::shared_ptr<CliParamsDatasetGet>& cliParams);

  void executeCommandDatasetList(const std::shared_ptr<CliParamsDatasetList>& cliParams);
}// namespace Nextclade
