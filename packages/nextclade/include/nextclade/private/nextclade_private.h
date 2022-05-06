#pragma once


#include <common/safe_vector.h>
#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <ostream>
#include <string>


namespace Nextclade {
  struct AminoacidSubstitutionWithoutGene {
    Aminoacid ref;
    int pos;
    Aminoacid qry;
  };

  /** Maps a position to Nucleotide */
  using PosToNucMap = std::map<int, NucleotideSubstitutionSimple>;

  /** Maps a position to Aminoacid */
  using PosToAaMapForGene = std::map<int, AminoacidSubstitutionWithoutGene>;

  /** Aminoacid maps for all the genes */
  using PosToAaMap = std::map<std::string, PosToAaMapForGene>;

  NextcladeResult analyzeOneSequence(                            //
    const std::string& seqName,                                  //
    const NucleotideSequence& ref,                               //
    const NucleotideSequence& query,                             //
    const std::map<std::string, RefPeptideInternal>& refPeptides,//
    const safe_vector<RefPeptideInternal>& refPeptidesArr,       //
    const GeneMap& geneMap,                                      //
    const safe_vector<PcrPrimer>& pcrPrimers,                    //
    const QcConfig& qcRulesConfig,                               //
    const VirusJson& virusJson,                                  //
    const Tree& tree,                                            //
    const NextalignOptions& nextalignOptions,                    //
    const safe_vector<CladeNodeAttr>& customNodeAttrKeys         //
  );

  safe_vector<RefPeptideInternal> getRefPeptidesArray(const std::map<std::string, RefPeptideInternal>& refPeptides);


  inline std::ostream& operator<<(std::ostream& os, const NucleotideSubstitution& val) {
    os << "{ ";
    os << "refNuc: " << nucToString(val.ref) << ", ";
    os << "pos: " << val.pos << ", ";
    os << "queryNuc: " << nucToString(val.qry);
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideSubstitutionSimple& val) {
    os << "{ ";
    os << "refNuc: " << nucToString(val.ref) << ", ";
    os << "pos: " << val.pos << ", ";
    os << "queryNuc: " << nucToString(val.qry);
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideDeletionSimple& val) {
    os << "{ ";
    os << "refNuc: " << nucToString(val.ref) << ", ";
    os << "pos: " << val.pos;
    os << " }";
    return os;
  }


  inline std::ostream& operator<<(std::ostream& os, const NucleotideInsertion& val) {
    os << "{ ";
    os << "pos: " << val.pos << ", ";
    os << "length: " << val.length << ", ";
    os << "ins: '";
    for (const auto& v : val.ins) {
      os << nucToString(v);
    }
    os << "' }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideDeletion& val) {
    os << "{ ";
    os << "start: " << val.start << ", ";
    os << "length: " << val.length;
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideRange& val) {
    os << "{ ";
    os << "nuc: " << nucToString(val.character) << ", ";
    os << "begin: " << val.begin << ", ";
    os << "end: " << val.end << ", ";
    os << "length: " << val.length;
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const AminoacidRange& val) {
    os << "{ ";
    os << "nuc: " << aaToString(val.character) << ", ";
    os << "begin: " << val.begin << ", ";
    os << "end: " << val.end << ", ";
    os << "length: " << val.length;
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const AminoacidSubstitution& val) {
    os << "{ ";
    os << "gene: \"" << val.gene << "\", ";
    os << "refAA: " << val.ref << ", ";
    os << "queryAA: " << val.qry << ", ";
    os << "codon: " << val.pos << ", ";
    os << "codonNucRange: " << val.codonNucRange << ", ";
    os << "refContext: " << val.refContext << ", ";
    os << "queryContext: " << val.queryContext << ", ";
    os << "contextNucRange: " << val.contextNucRange;
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const AminoacidDeletion& val) {
    os << "{ ";
    os << "gene: \"" << val.gene << "\", ";
    os << "refAA: " << val.ref << ", ";
    os << "codon: " << val.pos << ", ";
    os << "codonNucRange: " << val.codonNucRange << ", ";
    os << "refContext: " << val.refContext << ", ";
    os << "contextNucRange: " << val.contextNucRange;
    os << " }";
    return os;
  }
}// namespace Nextclade
