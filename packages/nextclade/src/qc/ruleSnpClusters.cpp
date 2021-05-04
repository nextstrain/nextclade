#include "ruleSnpClusters.h"

#include <nextclade/nextclade.h>

#include <deque>
#include <optional>
#include <vector>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  std::vector<std::vector<int>> findSnpClusters(                //
    const std::vector<NucleotideSubstitution>& privateMutations,//
    const QCRulesConfigSnpClusters& config                      //
  ) {
    const auto clusterCutOff = safe_cast<size_t>(config.clusterCutOff);
    std::deque<int> currentCluster;
    std::vector<std::vector<int>> allClusters;
    int previousPos = -1;
    for (const auto& mut : privateMutations) {
      const auto& pos = mut.pos;
      currentCluster.push_back(pos);

      while (currentCluster[0] < pos - config.windowSize) {
        currentCluster.pop_front();
      }

      if (currentCluster.size() > clusterCutOff) {
        if (!allClusters.empty() &&                                                                           //
            currentCluster.size() > 1 &&                                                                      //
            allClusters[allClusters.size() - 1][allClusters[allClusters.size() - 1].size() - 1] == previousPos//
        ) {
          allClusters[allClusters.size() - 1].push_back(pos);
        } else {
          allClusters.emplace_back(std::vector<int>{currentCluster.cbegin(), currentCluster.cend()});
        }
      }
      previousPos = pos;
    }

    return allClusters;
  }

  std::vector<ClusteredSnp> processSnpClusters(const std::vector<std::vector<int>>& snpClusters) {
    std::vector<ClusteredSnp> result;
    result.reserve(snpClusters.size());
    for (const auto& cluster : snpClusters) {
      result.emplace_back(ClusteredSnp{
        .start = cluster[0],
        .end = cluster[cluster.size() - 1],
        .numberOfSNPs = safe_cast<int>(cluster.size()),
      });
    }
    return result;
  }

  std::optional<QCResultSnpClusters> ruleSnpClusters(           //
    const AnalysisResult&,                                     //
    const std::vector<NucleotideSubstitution>& privateMutations,//
    const QCRulesConfigSnpClusters& config                      //
  ) {
    if (!config.enabled) {
      return {};
    }

    const auto snpClusters = findSnpClusters(privateMutations, config);
    const auto totalClusters = safe_cast<double>(snpClusters.size());

    auto clusteredSnps = processSnpClusters(snpClusters);
    int totalSNPs = 0;
    for (const auto& clusteredSnp : clusteredSnps) {
      totalSNPs += clusteredSnp.numberOfSNPs;
    }

    const auto score = std::max(0.0, totalClusters * config.scoreWeight);
    const auto& status = getQcRuleStatus(score);

    return QCResultSnpClusters{
      .score = score,
      .status = status,
      .totalSNPs = totalSNPs,
      .clusteredSNPs = std::move(clusteredSnps),
    };
  }
}// namespace Nextclade
