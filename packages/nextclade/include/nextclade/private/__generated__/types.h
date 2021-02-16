#pragma once

#include <variant>

/**
 * Dictates how the color scale should be constructed
 */
enum class Type : int { BOOLEAN, CATEGORICAL, CONTINUOUS, ORDINAL };

/**
 * Each object here is an indiviual coloring, which will populate the sidebar dropdown in
 * auspice
 */
struct Coloring {
    /**
     * They key used to access the value of this coloring on each node
     */
    std::string key;
    /**
     * Provided mapping between trait values & hex values
     */
    std::shared_ptr<std::vector<std::vector<std::string>>> scale;
    /**
     * Text to be displayed in the "color by" dropdown and the tree legend
     */
    std::shared_ptr<std::string> title;
    /**
     * Dictates how the color scale should be constructed
     */
    Type type;
};

/**
 * Default tree metric
 */
enum class DistanceMeasure : int { DIV, NUM_DATE };

/**
 * Default tree layout
 */
enum class Layout : int { CLOCK, RADIAL, RECT, UNROOTED };

/**
 * Set the defaults for certain display options in Auspice. All are optional.
 */
struct DisplayDefaults {
    /**
     * What branch label should be displayed by default.
     */
    std::shared_ptr<std::string> branch_label;
    /**
     * Default color by
     */
    std::shared_ptr<std::string> color_by;
    /**
     * Default tree metric
     */
    std::shared_ptr<DistanceMeasure> distance_measure;
    /**
     * Default geographic resolution
     */
    std::shared_ptr<std::string> geo_resolution;
    /**
     * Default tree layout
     */
    std::shared_ptr<Layout> layout;
    /**
     * Should the map be extended / wrapped around. Useful if transmissions are worldwide.
     */
    std::shared_ptr<bool> map_triplicate;
    /**
     * Should transmission lines (if available) be displaye by default
     */
    std::shared_ptr<bool> transmission_lines;
};

/**
 * Positive or negative strand
 */
enum class Strand : int { EMPTY, STRAND };

struct Nuc {
    /**
     * Gene end position (one-based closed, last position of feature, following GFF format)
     */
    std::shared_ptr<double> end;
    /**
     * Sequence on which the coordinates below are valid. Could be viral segment, bacterial
     * contig, etc
     */
    std::shared_ptr<std::string> seqid;
    /**
     * Gene start position (one-based, following GFF format)
     */
    std::shared_ptr<double> start;
    /**
     * Positive or negative strand
     */
    std::shared_ptr<Strand> strand;
    /**
     * Type of the feature. could be mRNA, CDS, or similar
     */
    std::shared_ptr<std::string> type;
};

/**
 * Genome annotations (e.g. genes), relative to the reference genome
 */
struct GenomeAnnotations {
    Nuc nuc;
};

/**
 * Each object here is an indiviual geo resolution
 */
struct GeoResolution {
    /**
     * The deme names & lat/long info for this geographic resolution
     */
    std::map<std::string, nlohmann::json> demes;
    /**
     * Trait key - must be specified on nodes (e.g. 'country')
     */
    std::string key;
    /**
     * The title to display in the geo resolution dropdown. Optional -- if not provided then
     * `key` will be used.
     */
    std::shared_ptr<std::string> title;
};

struct Maintainer {
    std::string name;
    std::shared_ptr<std::string> url;
};

enum class Panel : int { ENTROPY, FREQUENCIES, MAP, TREE };

struct Meta {
    /**
     * Auspice displays this at the top of the page as part of a byline
     */
    std::shared_ptr<std::string> build_url;
    /**
     * Available colorBys for Auspice
     */
    std::shared_ptr<std::vector<Coloring>> colorings;
    /**
     * Auspice displays this currently in the footer.
     */
    std::shared_ptr<std::string> description;
    /**
     * Set the defaults for certain display options in Auspice. All are optional.
     */
    std::shared_ptr<DisplayDefaults> display_defaults;
    /**
     * These appear as filters in the footer of Auspice (which populates the displayed values
     * based upon the tree)
     */
    std::shared_ptr<std::vector<std::string>> filters;
    nlohmann::json frequencies;
    /**
     * Genome annotations (e.g. genes), relative to the reference genome
     */
    std::shared_ptr<GenomeAnnotations> genome_annotations;
    /**
     * The available options for the geographic resolution dropdown, and their lat/long
     * information
     */
    std::shared_ptr<std::vector<GeoResolution>> geo_resolutions;
    /**
     * Who maintains this dataset?
     */
    std::shared_ptr<std::vector<Maintainer>> maintainers;
    /**
     * Which panels should Auspice display?
     */
    std::vector<Panel> panels;
    /**
     * Auspice displays this at the top of the page
     */
    std::shared_ptr<std::string> title;
    /**
     * The name of the tree (e.g. segment name), if applicable
     */
    std::shared_ptr<std::string> tree_name;
    /**
     * Auspice displays this (currently only in the footer)
     */
    std::string updated;
};

/**
 * Mutations occuring between the parent and this node
 */
struct Mutations {
    /**
     * nucelotide mutations
     */
    std::shared_ptr<std::vector<std::string>> nuc;
};

/**
 * attributes associated with the branch from the parent node to this node, such as branch
 * lengths, mutations, support values
 */
struct BranchAttrs {
    /**
     * Node labels
     */
    nlohmann::json labels;
    /**
     * Mutations occuring between the parent and this node
     */
    std::shared_ptr<Mutations> mutations;
};

/**
 * Author information (terminal nodes only)
 */
struct Author {
    /**
     * Journal title (including year, if applicable)
     */
    std::shared_ptr<std::string> journal;
    /**
     * URL link to paper (if available)
     */
    std::shared_ptr<std::string> paper_url;
    /**
     * Publication title
     */
    std::shared_ptr<std::string> title;
    /**
     * unique value for this publication. Displayed as-is by auspice.
     */
    std::string value;
};

enum class Hidden : int { ALWAYS, DIVTREE, TIMETREE };

struct NumDate {
    /**
     * Confidence of the node date
     */
    std::shared_ptr<std::vector<double>> confidence;
    double value;
};

struct VaccineClass {
    /**
     * When the vaccine was stopped
     */
    std::shared_ptr<std::string> end_date;
    /**
     * Vaccine selection date
     */
    std::shared_ptr<std::string> selection_date;
    /**
     * strain used to raise sera (for ???)
     */
    std::shared_ptr<bool> serum;
    /**
     * Vaccine usage start date
     */
    std::shared_ptr<std::string> start_date;
};

using VaccineUnion = std::shared_ptr<std::variant<std::vector<nlohmann::json>, bool, VaccineClass, double, int64_t, std::string>>;

/**
 * attributes associated with the node (sequence, date, location) as opposed to changes from
 * one node to another.
 */
struct NodeAttrs {
    /**
     * Sequence accession number
     */
    std::shared_ptr<std::string> accession;
    /**
     * Author information (terminal nodes only)
     */
    std::shared_ptr<Author> author;
    /**
     * Node (phylogenetic) divergence
     */
    std::shared_ptr<double> div;
    std::shared_ptr<Hidden> hidden;
    std::shared_ptr<NumDate> num_date;
    /**
     * URL of the sequence (usually https://www.ncbi.nlm.nih.gov/nuccore/...)
     */
    std::shared_ptr<std::string> url;
    /**
     * Vaccine information
     */
    VaccineUnion vaccine;
};

struct Tree {
    /**
     * attributes associated with the branch from the parent node to this node, such as branch
     * lengths, mutations, support values
     */
    std::shared_ptr<BranchAttrs> branch_attrs;
    /**
     * Child nodes. Recursive structure. Terminal nodes do not have this property.
     */
    std::shared_ptr<std::vector<Tree>> children;
    /**
     * Strain name. Must be unique. No spaces
     */
    std::string name;
    /**
     * attributes associated with the node (sequence, date, location) as opposed to changes from
     * one node to another.
     */
    std::shared_ptr<NodeAttrs> node_attrs;
};

struct AuspiceJsonV2Json {
    Meta meta;
    Tree tree;
    /**
     * JSON schema version
     */
    std::string version;
};
