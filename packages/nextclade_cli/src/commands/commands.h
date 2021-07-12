#pragma once


namespace Nextclade {
  struct CliParamsRoot;
  struct CliParamsRun;
  struct CliParamsDatasetFetch;
  struct CliParamsDatasetList;

  void executeCommandRoot(const CliParamsRoot& cliParams);

  void executeCommandRun(const CliParamsRun& cliParams);

  void executeCommandDatasetFetch(const CliParamsDatasetFetch& cliParams);

  void executeCommandDatasetList(const CliParamsDatasetList& cliParams);
}// namespace Nextclade
