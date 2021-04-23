#pragma once

namespace AuspiceJsonV2 {

  enum class Type : int { BOOLEAN, CATEGORICAL, CONTINUOUS, ORDINAL };

  enum class DistanceMeasure : int { DIV, NUM_DATE };

  enum class Layout : int { CLOCK, RADIAL, RECT, UNROOTED };

  enum class Strand : int { EMPTY, STRAND };

  enum class Panel : int { ENTROPY, FREQUENCIES, MAP, TREE };

  enum class Hidden : int { ALWAYS, DIVTREE, TIMETREE };

  struct Coloring {
    std::string key;
    std::shared_ptr<std::vector<std::vector<std::string>>> scale;
    std::shared_ptr<std::string> title;
    Type type;
  };

  struct DisplayDefaults {
    std::shared_ptr<std::string> branch_label;
    std::shared_ptr<std::string> color_by;
    std::shared_ptr<DistanceMeasure> distance_measure;
    std::shared_ptr<std::string> geo_resolution;
    std::shared_ptr<Layout> layout;
    std::shared_ptr<bool> map_triplicate;
    std::shared_ptr<bool> transmission_lines;
  };

  struct Nuc {
    std::shared_ptr<double> end;
    std::shared_ptr<std::string> seqid;
    std::shared_ptr<double> start;
    std::shared_ptr<Strand> strand;
    std::shared_ptr<std::string> type;
  };

  struct GenomeAnnotations {
    Nuc nuc;
  };

  struct Deme {};

  struct GeoResolution {
    std::map<std::string, Deme> demes;
    std::string key;
    std::shared_ptr<std::string> title;
  };

  struct Maintainer {
    std::string name;
    std::shared_ptr<std::string> url;
  };

  struct Meta {
    std::shared_ptr<std::string> build_url;
    std::shared_ptr<std::vector<Coloring>> colorings;
    std::shared_ptr<std::string> description;
    std::shared_ptr<DisplayDefaults> display_defaults;
    std::shared_ptr<std::vector<std::string>> filters;
    std::map<std::string, std::string> frequencies;
    std::shared_ptr<GenomeAnnotations> genome_annotations;
    std::shared_ptr<std::vector<GeoResolution>> geo_resolutions;
    std::shared_ptr<std::vector<Maintainer>> maintainers;
    std::vector<Panel> panels;
    std::shared_ptr<std::string> title;
    std::shared_ptr<std::string> tree_name;
    std::string updated;
  };

  struct Mutations {
    std::shared_ptr<std::vector<std::string>> nuc;
  };

  struct BranchAttrs {
    std::map<std::string, std::string> labels;
    std::shared_ptr<Mutations> mutations;
  };

  struct Author {
    std::shared_ptr<std::string> journal;
    std::shared_ptr<std::string> paper_url;
    std::shared_ptr<std::string> title;
    std::string value;
  };

  struct NumDate {
    std::shared_ptr<std::vector<double>> confidence;
    double value;
  };

  struct VaccineClass {
    std::shared_ptr<std::string> end_date;
    std::shared_ptr<std::string> selection_date;
    std::shared_ptr<bool> serum;
    std::shared_ptr<std::string> start_date;
  };

  struct Vaccine {};

  struct NodeAttrs {
    std::shared_ptr<std::string> accession;
    std::shared_ptr<Author> author;
    std::shared_ptr<double> div;
    std::shared_ptr<Hidden> hidden;
    std::shared_ptr<NumDate> num_date;
    std::shared_ptr<std::string> url;
    Vaccine vaccine;
  };

  struct Tree {
    std::shared_ptr<BranchAttrs> branch_attrs;
    std::shared_ptr<std::vector<Tree>> children;
    std::string name;
    std::shared_ptr<NodeAttrs> node_attrs;
  };

  struct AuspiceJsonV2 {
    Meta meta;
    Tree tree;
    std::string version;
  };
}// namespace AuspiceJsonV2
