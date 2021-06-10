#include "serializeResults.h"

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <nlohmann/json.hpp>
#include <string>

#include "../io/jsonStringify.h"
#include "formatQcStatus.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;

  namespace {
    template<typename Container, typename Serializer>
    json serializeArray(const Container& container, Serializer serializer) {
      auto j = json::array();
      for (const auto& elem : container) {
        j.template emplace_back(serializer(elem));
      }
      return j;
    }

    json serializeRange(const Range& range) {
      auto j = json::object();
      j.emplace("begin", range.begin);
      j.emplace("end", range.end);
      return j;
    }

    json serializeNucleotideLocation(const NucleotideLocation& loc) {
      auto j = json::object();
      j.emplace("pos", loc.pos);
      j.emplace("nuc", nucToString(loc.nuc));
      return j;
    }

    json serializeNucleotideRange(const NucleotideRange& nucRange) {
      auto j = json::object();
      j.emplace("begin", nucRange.begin);
      j.emplace("end", nucRange.end);
      j.emplace("length", nucRange.length);
      j.emplace("nuc", nucToString(nucRange.character));
      return j;
    }

    json serializePcrPrimer(const PcrPrimer& pcrPrimer) {
      auto j = json::object();
      j.emplace("name", pcrPrimer.name);
      j.emplace("target", pcrPrimer.target);
      j.emplace("source", pcrPrimer.source);
      j.emplace("rootOligonuc", toString(pcrPrimer.rootOligonuc));
      j.emplace("primerOligonuc", toString(pcrPrimer.primerOligonuc));
      j.emplace("range", serializeRange(pcrPrimer.range));
      j.emplace("nonACGTs", serializeArray(pcrPrimer.nonAcgts, serializeNucleotideLocation));
      return j;
    }

    json serializePcrPrimers(const std::vector<PcrPrimer>& pcrPrimers) {
      return serializeArray(pcrPrimers, serializePcrPrimer);
    }

    json serializeAminoacidMutation(const AminoacidSubstitution& mut);

    json serializeAminoacidDeletion(const AminoacidDeletion& del);

    json serializeMutation(const NucleotideSubstitution& mut) {
      auto j = json::object();
      j.emplace("refNuc", nucToString(mut.refNuc));
      j.emplace("pos", mut.pos);
      j.emplace("queryNuc", nucToString(mut.queryNuc));
      j.emplace("aaSubstitutions", serializeArray(mut.aaSubstitutions, serializeAminoacidMutation));
      j.emplace("aaDeletions", serializeArray(mut.aaDeletions, serializeAminoacidDeletion));
      j.emplace("pcrPrimersChanged", serializePcrPrimers(mut.pcrPrimersChanged));
      return j;
    }

    json serializeDeletion(const NucleotideDeletion& del) {
      auto j = json::object();
      j.emplace("start", del.start);
      j.emplace("length", del.length);
      j.emplace("aaSubstitutions", serializeArray(del.aaSubstitutions, serializeAminoacidMutation));
      j.emplace("aaDeletions", serializeArray(del.aaDeletions, serializeAminoacidDeletion));
      return j;
    }

    json serializeInsertion(const NucleotideInsertion& ins) {
      auto j = json::object();
      j.emplace("pos", ins.pos);
      j.emplace("length", ins.length);
      j.emplace("ins", toString(ins.ins));
      return j;
    }

    json serializeMissing(const NucleotideRange& missing) {
      auto j = json::object();
      j.emplace("begin", missing.begin);
      j.emplace("end", missing.end);
      j.emplace("length", missing.length);
      j.emplace("nuc", nucToString(Nucleotide::N));
      return j;
    }

    json serializeNonAcgtn(const NucleotideRange& nonAcgt) {
      return serializeNucleotideRange(nonAcgt);
    }

    json serializePcrPrimerChange(const PcrPrimerChange& primerChange) {
      auto j = json::object();
      j.emplace("primer", serializePcrPrimer(primerChange.primer));
      j.emplace("substitutions", serializeArray(primerChange.substitutions, serializeMutation));
      return j;
    }

    json serializeAminoacidMutation(const AminoacidSubstitution& mut) {
      auto j = json::object();
      j.emplace("gene", mut.gene);
      j.emplace("refAA", aaToString(mut.refAA));
      j.emplace("codon", mut.codon);
      j.emplace("queryAA", aaToString(mut.queryAA));
      j.emplace("codonNucRange", serializeRange(mut.codonNucRange));
      j.emplace("refContext", toString(mut.refContext));
      j.emplace("queryContext", toString(mut.queryContext));
      j.emplace("contextNucRange", serializeRange(mut.contextNucRange));
      j.emplace("nucSubstitutions", serializeArray(mut.nucSubstitutions, serializeMutation));
      j.emplace("nucDeletions", serializeArray(mut.nucDeletions, serializeDeletion));
      return j;
    }

    json serializeAminoacidDeletion(const AminoacidDeletion& del) {
      auto j = json::object();
      j.emplace("gene", del.gene);
      j.emplace("refAA", aaToString(del.refAA));
      j.emplace("codon", del.codon);
      j.emplace("codonNucRange", serializeRange(del.codonNucRange));
      j.emplace("refContext", toString(del.refContext));
      j.emplace("queryContext", toString(del.queryContext));
      j.emplace("contextNucRange", serializeRange(del.contextNucRange));
      j.emplace("nucSubstitutions", serializeArray(del.nucSubstitutions, serializeMutation));
      j.emplace("nucDeletions", serializeArray(del.nucDeletions, serializeDeletion));
      return j;
    }

    json serializeClusteredSnp(const ClusteredSnp& snp) {
      auto j = json::object();
      j.emplace("start", snp.start);
      j.emplace("end", snp.end);
      j.emplace("numberOfSNPs", snp.numberOfSNPs);
      return j;
    }

    json serializeQcResult(const QcResult& qc) {
      auto j = json::object(//
        {
          {"overallScore", qc.overallScore},
          {"overallStatus", formatQcStatus(qc.overallStatus)},
        });

      if (qc.missingData) {
        j.emplace("missingData",//
          json::object(         //
            {
              {"missingDataThreshold", qc.missingData->missingDataThreshold},
              {"score", qc.missingData->score},
              {"status", formatQcStatus(qc.missingData->status)},
              {"totalMissing", qc.missingData->totalMissing},
            }));
      }

      if (qc.mixedSites) {
        j.emplace("mixedSites",//
          json::object(        //
            {
              {"mixedSitesThreshold", qc.mixedSites->mixedSitesThreshold},
              {"score", qc.mixedSites->score},
              {"status", formatQcStatus(qc.mixedSites->status)},
              {"totalMixedSites", qc.mixedSites->totalMixedSites},
            }));
      }

      if (qc.privateMutations) {
        j.emplace("privateMutations",//
          json::object(              //
            {
              {"cutoff", qc.privateMutations->cutoff},
              {"excess", qc.privateMutations->excess},
              {"score", qc.privateMutations->score},
              {"status", formatQcStatus(qc.privateMutations->status)},
              {"total", qc.privateMutations->total},
            }));
      }

      if (qc.snpClusters) {
        j.emplace("snpClusters",//
          json::object(         //
            {
              {"clusteredSNPs", serializeArray(qc.snpClusters->clusteredSNPs, serializeClusteredSnp)},
              {"score", qc.snpClusters->score},
              {"status", formatQcStatus(qc.snpClusters->status)},
              {"totalSNPs", qc.snpClusters->totalSNPs},
            }));
      }

      return j;
    }

    json serializeNucleotideComposition(const std::map<Nucleotide, int>& nucleotideComposition) {
      json j = json::object();
      for (const auto& [nuc, num] : nucleotideComposition) {
        j.emplace(nucToString(nuc), num);
      }
      return j;
    }

    json serializeResult(const AnalysisResult& result) {
      auto j = json::object();

      j.emplace("seqName", result.seqName);
      j.emplace("clade", result.clade);

      j.emplace("alignmentStart", result.alignmentStart);
      j.emplace("alignmentScore", result.alignmentScore);
      j.emplace("alignmentEnd", result.alignmentEnd);

      j.emplace("totalSubstitutions", result.totalSubstitutions);
      j.emplace("totalDeletions", result.totalDeletions);
      j.emplace("totalInsertions", result.totalInsertions);
      j.emplace("totalMissing", result.totalMissing);
      j.emplace("totalNonACGTNs", result.totalNonACGTNs);
      j.emplace("totalPcrPrimerChanges", result.totalPcrPrimerChanges);
      j.emplace("totalAminoacidSubstitutions", result.totalAminoacidSubstitutions);
      j.emplace("totalAminoacidDeletions", result.totalAminoacidDeletions);

      j.emplace("substitutions", serializeArray(result.substitutions, serializeMutation));
      j.emplace("deletions", serializeArray(result.deletions, serializeDeletion));
      j.emplace("insertions", serializeArray(result.insertions, serializeInsertion));
      j.emplace("missing", serializeArray(result.missing, serializeMissing));
      j.emplace("nonACGTNs", serializeArray(result.nonACGTNs, serializeNonAcgtn));
      j.emplace("pcrPrimerChanges", serializeArray(result.pcrPrimerChanges, serializePcrPrimerChange));
      j.emplace("aaSubstitutions", serializeArray(result.aaSubstitutions, serializeAminoacidMutation));
      j.emplace("aaDeletions", serializeArray(result.aaDeletions, serializeAminoacidDeletion));

      j.emplace("nearestNodeId", result.nearestNodeId);

      j.emplace("qc", serializeQcResult(result.qc));
      j.emplace("nucleotideComposition", serializeNucleotideComposition(result.nucleotideComposition));

      return j;
    }
  }// namespace

  json serializePeptide(const Peptide& peptide) {
    auto j = json::object();
    j.emplace("name", peptide.name);
    j.emplace("seq", peptide.seq);
    return j;
  }

  std::string serializePeptidesToString(const std::vector<Peptide>& peptides) {
    json j = serializeArray(peptides, serializePeptide);
    return jsonStringify(j);
  }

  std::string serializeResultToString(const AnalysisResult& result) {
    auto j = serializeResult(result);
    return jsonStringify(j);
  }

  std::string serializeResults(const std::vector<AnalysisResult>& results) {
    auto j = json::array();
    for (const auto& result : results) {
      j.emplace_back(serializeResult(result));
    }
    return jsonStringify(j);
  }

  json serializePcrPrimerCsvRow(const PcrPrimerCsvRow& pcrPrimer) {
    auto j = json::object();
    j.emplace("name", pcrPrimer.name);
    j.emplace("target", pcrPrimer.target);
    j.emplace("source", pcrPrimer.source);
    j.emplace("primerOligonuc", pcrPrimer.primerOligonuc);
    return j;
  }

  std::string serializePcrPrimerRowsToString(const std::vector<PcrPrimerCsvRow>& pcrPrimers) {
    json j = serializeArray(pcrPrimers, serializePcrPrimerCsvRow);
    return jsonStringify(j);
  }

}// namespace Nextclade
