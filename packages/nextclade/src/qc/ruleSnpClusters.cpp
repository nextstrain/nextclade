#include "ruleSnpClusters.h"

#include <nextclade/nextclade.h>

#include <algorithm>
#include <deque>
#include <optional>
#include <common/safe_vector.h>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"


namespace Nextclade {
  safe_vector<safe_vector<int>> findSnpClusters(                         //
    const safe_vector<NucleotideSubstitutionSimple>& privateMutationsRaw,//
    const QCRulesConfigSnpClusters& config                               //
  ) {
    auto privateMutations = privateMutationsRaw;
    std::sort(privateMutations.begin(), privateMutations.end());

    const auto clusterCutOff = safe_cast<size_t>(config.clusterCutOff);
    std::deque<int> currentCluster;
    safe_vector<safe_vector<int>> allClusters;
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
          allClusters.emplace_back(safe_vector<int>{currentCluster.cbegin(), currentCluster.cend()});
        }
      }
      previousPos = pos;
    }

    for (auto& cluster : allClusters) {
      std::sort(cluster.begin(), cluster.end());
    }

    return allClusters;
  }

  safe_vector<ClusteredSnp> processSnpClusters(const safe_vector<safe_vector<int>>& snpClusters) {
    safe_vector<ClusteredSnp> result;
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

  std::optional<QCResultSnpClusters> ruleSnpClusters(//
    const AnalysisResult& query,                     //
    const QCRulesConfigSnpClusters& config           //
  ) {
    if (!config.enabled) {
      return {};
    }

    // TODO: should we also account for result. privateDeletions here
    const auto snpClusters = findSnpClusters(query.privateNucMutations.privateSubstitutions, config);
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
