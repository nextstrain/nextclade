//  To parse this JSON data, first install
//
//      json.hpp  https://github.com/nlohmann/json
//
//  Then include this file, and then do
//
//     AuspiceJsonV2Json data = nlohmann::json::parse(jsonString);

#pragma once

#include <variant>
#include "json.hpp"

#ifndef NLOHMANN_OPT_HELPER
#define NLOHMANN_OPT_HELPER
namespace nlohmann {
    template <typename T>
    struct adl_serializer<std::shared_ptr<T>> {
        static void to_json(json & j, const std::shared_ptr<T> & opt) {
            if (!opt) j = nullptr; else j = *opt;
        }

        static std::shared_ptr<T> from_json(const json & j) {
            if (j.is_null()) return std::unique_ptr<T>(); else return std::unique_ptr<T>(new T(j.get<T>()));
        }
    };
}
#endif

namespace Generated {
    using nlohmann::json;

    inline json get_untyped(const json & j, const char * property) {
        if (j.find(property) != j.end()) {
            return j.at(property).get<json>();
        }
        return json();
    }

    inline json get_untyped(const json & j, std::string property) {
        return get_untyped(j, property.data());
    }

    template <typename T>
    inline std::shared_ptr<T> get_optional(const json & j, const char * property) {
        if (j.find(property) != j.end()) {
            return j.at(property).get<std::shared_ptr<T>>();
        }
        return std::shared_ptr<T>();
    }

    template <typename T>
    inline std::shared_ptr<T> get_optional(const json & j, std::string property) {
        return get_optional<T>(j, property.data());
    }

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
}

namespace nlohmann {
    void from_json(const json & j, Generated::Coloring & x);
    void to_json(json & j, const Generated::Coloring & x);

    void from_json(const json & j, Generated::DisplayDefaults & x);
    void to_json(json & j, const Generated::DisplayDefaults & x);

    void from_json(const json & j, Generated::Nuc & x);
    void to_json(json & j, const Generated::Nuc & x);

    void from_json(const json & j, Generated::GenomeAnnotations & x);
    void to_json(json & j, const Generated::GenomeAnnotations & x);

    void from_json(const json & j, Generated::GeoResolution & x);
    void to_json(json & j, const Generated::GeoResolution & x);

    void from_json(const json & j, Generated::Maintainer & x);
    void to_json(json & j, const Generated::Maintainer & x);

    void from_json(const json & j, Generated::Meta & x);
    void to_json(json & j, const Generated::Meta & x);

    void from_json(const json & j, Generated::Mutations & x);
    void to_json(json & j, const Generated::Mutations & x);

    void from_json(const json & j, Generated::BranchAttrs & x);
    void to_json(json & j, const Generated::BranchAttrs & x);

    void from_json(const json & j, Generated::Author & x);
    void to_json(json & j, const Generated::Author & x);

    void from_json(const json & j, Generated::NumDate & x);
    void to_json(json & j, const Generated::NumDate & x);

    void from_json(const json & j, Generated::VaccineClass & x);
    void to_json(json & j, const Generated::VaccineClass & x);

    void from_json(const json & j, Generated::NodeAttrs & x);
    void to_json(json & j, const Generated::NodeAttrs & x);

    void from_json(const json & j, Generated::Tree & x);
    void to_json(json & j, const Generated::Tree & x);

    void from_json(const json & j, Generated::AuspiceJsonV2Json & x);
    void to_json(json & j, const Generated::AuspiceJsonV2Json & x);

    void from_json(const json & j, Generated::Type & x);
    void to_json(json & j, const Generated::Type & x);

    void from_json(const json & j, Generated::DistanceMeasure & x);
    void to_json(json & j, const Generated::DistanceMeasure & x);

    void from_json(const json & j, Generated::Layout & x);
    void to_json(json & j, const Generated::Layout & x);

    void from_json(const json & j, Generated::Strand & x);
    void to_json(json & j, const Generated::Strand & x);

    void from_json(const json & j, Generated::Panel & x);
    void to_json(json & j, const Generated::Panel & x);

    void from_json(const json & j, Generated::Hidden & x);
    void to_json(json & j, const Generated::Hidden & x);
    void from_json(const json & j, std::variant<std::vector<json>, bool, Generated::VaccineClass, double, int64_t, std::string> & x);
    void to_json(json & j, const std::variant<std::vector<json>, bool, Generated::VaccineClass, double, int64_t, std::string> & x);

    inline void from_json(const json & j, Generated::Coloring& x) {
        x.key = j.at("key").get<std::string>();
        x.scale = Generated::get_optional<std::vector<std::vector<std::string>>>(j, "scale");
        x.title = Generated::get_optional<std::string>(j, "title");
        x.type = j.at("type").get<Generated::Type>();
    }

    inline void to_json(json & j, const Generated::Coloring & x) {
        j = json::object();
        j["key"] = x.key;
        j["scale"] = x.scale;
        j["title"] = x.title;
        j["type"] = x.type;
    }

    inline void from_json(const json & j, Generated::DisplayDefaults& x) {
        x.branch_label = Generated::get_optional<std::string>(j, "branch_label");
        x.color_by = Generated::get_optional<std::string>(j, "color_by");
        x.distance_measure = Generated::get_optional<Generated::DistanceMeasure>(j, "distance_measure");
        x.geo_resolution = Generated::get_optional<std::string>(j, "geo_resolution");
        x.layout = Generated::get_optional<Generated::Layout>(j, "layout");
        x.map_triplicate = Generated::get_optional<bool>(j, "map_triplicate");
        x.transmission_lines = Generated::get_optional<bool>(j, "transmission_lines");
    }

    inline void to_json(json & j, const Generated::DisplayDefaults & x) {
        j = json::object();
        j["branch_label"] = x.branch_label;
        j["color_by"] = x.color_by;
        j["distance_measure"] = x.distance_measure;
        j["geo_resolution"] = x.geo_resolution;
        j["layout"] = x.layout;
        j["map_triplicate"] = x.map_triplicate;
        j["transmission_lines"] = x.transmission_lines;
    }

    inline void from_json(const json & j, Generated::Nuc& x) {
        x.end = Generated::get_optional<double>(j, "end");
        x.seqid = Generated::get_optional<std::string>(j, "seqid");
        x.start = Generated::get_optional<double>(j, "start");
        x.strand = Generated::get_optional<Generated::Strand>(j, "strand");
        x.type = Generated::get_optional<std::string>(j, "type");
    }

    inline void to_json(json & j, const Generated::Nuc & x) {
        j = json::object();
        j["end"] = x.end;
        j["seqid"] = x.seqid;
        j["start"] = x.start;
        j["strand"] = x.strand;
        j["type"] = x.type;
    }

    inline void from_json(const json & j, Generated::GenomeAnnotations& x) {
        x.nuc = j.at("nuc").get<Generated::Nuc>();
    }

    inline void to_json(json & j, const Generated::GenomeAnnotations & x) {
        j = json::object();
        j["nuc"] = x.nuc;
    }

    inline void from_json(const json & j, Generated::GeoResolution& x) {
        x.demes = j.at("demes").get<std::map<std::string, json>>();
        x.key = j.at("key").get<std::string>();
        x.title = Generated::get_optional<std::string>(j, "title");
    }

    inline void to_json(json & j, const Generated::GeoResolution & x) {
        j = json::object();
        j["demes"] = x.demes;
        j["key"] = x.key;
        j["title"] = x.title;
    }

    inline void from_json(const json & j, Generated::Maintainer& x) {
        x.name = j.at("name").get<std::string>();
        x.url = Generated::get_optional<std::string>(j, "url");
    }

    inline void to_json(json & j, const Generated::Maintainer & x) {
        j = json::object();
        j["name"] = x.name;
        j["url"] = x.url;
    }

    inline void from_json(const json & j, Generated::Meta& x) {
        x.build_url = Generated::get_optional<std::string>(j, "build_url");
        x.colorings = Generated::get_optional<std::vector<Generated::Coloring>>(j, "colorings");
        x.description = Generated::get_optional<std::string>(j, "description");
        x.display_defaults = Generated::get_optional<Generated::DisplayDefaults>(j, "display_defaults");
        x.filters = Generated::get_optional<std::vector<std::string>>(j, "filters");
        x.frequencies = Generated::get_untyped(j, "frequencies");
        x.genome_annotations = Generated::get_optional<Generated::GenomeAnnotations>(j, "genome_annotations");
        x.geo_resolutions = Generated::get_optional<std::vector<Generated::GeoResolution>>(j, "geo_resolutions");
        x.maintainers = Generated::get_optional<std::vector<Generated::Maintainer>>(j, "maintainers");
        x.panels = j.at("panels").get<std::vector<Generated::Panel>>();
        x.title = Generated::get_optional<std::string>(j, "title");
        x.tree_name = Generated::get_optional<std::string>(j, "tree_name");
        x.updated = j.at("updated").get<std::string>();
    }

    inline void to_json(json & j, const Generated::Meta & x) {
        j = json::object();
        j["build_url"] = x.build_url;
        j["colorings"] = x.colorings;
        j["description"] = x.description;
        j["display_defaults"] = x.display_defaults;
        j["filters"] = x.filters;
        j["frequencies"] = x.frequencies;
        j["genome_annotations"] = x.genome_annotations;
        j["geo_resolutions"] = x.geo_resolutions;
        j["maintainers"] = x.maintainers;
        j["panels"] = x.panels;
        j["title"] = x.title;
        j["tree_name"] = x.tree_name;
        j["updated"] = x.updated;
    }

    inline void from_json(const json & j, Generated::Mutations& x) {
        x.nuc = Generated::get_optional<std::vector<std::string>>(j, "nuc");
    }

    inline void to_json(json & j, const Generated::Mutations & x) {
        j = json::object();
        j["nuc"] = x.nuc;
    }

    inline void from_json(const json & j, Generated::BranchAttrs& x) {
        x.labels = Generated::get_untyped(j, "labels");
        x.mutations = Generated::get_optional<Generated::Mutations>(j, "mutations");
    }

    inline void to_json(json & j, const Generated::BranchAttrs & x) {
        j = json::object();
        j["labels"] = x.labels;
        j["mutations"] = x.mutations;
    }

    inline void from_json(const json & j, Generated::Author& x) {
        x.journal = Generated::get_optional<std::string>(j, "journal");
        x.paper_url = Generated::get_optional<std::string>(j, "paper_url");
        x.title = Generated::get_optional<std::string>(j, "title");
        x.value = j.at("value").get<std::string>();
    }

    inline void to_json(json & j, const Generated::Author & x) {
        j = json::object();
        j["journal"] = x.journal;
        j["paper_url"] = x.paper_url;
        j["title"] = x.title;
        j["value"] = x.value;
    }

    inline void from_json(const json & j, Generated::NumDate& x) {
        x.confidence = Generated::get_optional<std::vector<double>>(j, "confidence");
        x.value = j.at("value").get<double>();
    }

    inline void to_json(json & j, const Generated::NumDate & x) {
        j = json::object();
        j["confidence"] = x.confidence;
        j["value"] = x.value;
    }

    inline void from_json(const json & j, Generated::VaccineClass& x) {
        x.end_date = Generated::get_optional<std::string>(j, "end_date");
        x.selection_date = Generated::get_optional<std::string>(j, "selection_date");
        x.serum = Generated::get_optional<bool>(j, "serum");
        x.start_date = Generated::get_optional<std::string>(j, "start_date");
    }

    inline void to_json(json & j, const Generated::VaccineClass & x) {
        j = json::object();
        j["end_date"] = x.end_date;
        j["selection_date"] = x.selection_date;
        j["serum"] = x.serum;
        j["start_date"] = x.start_date;
    }

    inline void from_json(const json & j, Generated::NodeAttrs& x) {
        x.accession = Generated::get_optional<std::string>(j, "accession");
        x.author = Generated::get_optional<Generated::Author>(j, "author");
        x.div = Generated::get_optional<double>(j, "div");
        x.hidden = Generated::get_optional<Generated::Hidden>(j, "hidden");
        x.num_date = Generated::get_optional<Generated::NumDate>(j, "num_date");
        x.url = Generated::get_optional<std::string>(j, "url");
        x.vaccine = Generated::get_optional<std::variant<std::vector<json>, bool, Generated::VaccineClass, double, int64_t, std::string>>(j, "vaccine");
    }

    inline void to_json(json & j, const Generated::NodeAttrs & x) {
        j = json::object();
        j["accession"] = x.accession;
        j["author"] = x.author;
        j["div"] = x.div;
        j["hidden"] = x.hidden;
        j["num_date"] = x.num_date;
        j["url"] = x.url;
        j["vaccine"] = x.vaccine;
    }

    inline void from_json(const json & j, Generated::Tree& x) {
        x.branch_attrs = Generated::get_optional<Generated::BranchAttrs>(j, "branch_attrs");
        x.children = Generated::get_optional<std::vector<Generated::Tree>>(j, "children");
        x.name = j.at("name").get<std::string>();
        x.node_attrs = Generated::get_optional<Generated::NodeAttrs>(j, "node_attrs");
    }

    inline void to_json(json & j, const Generated::Tree & x) {
        j = json::object();
        j["branch_attrs"] = x.branch_attrs;
        j["children"] = x.children;
        j["name"] = x.name;
        j["node_attrs"] = x.node_attrs;
    }

    inline void from_json(const json & j, Generated::AuspiceJsonV2Json& x) {
        x.meta = j.at("meta").get<Generated::Meta>();
        x.tree = j.at("tree").get<Generated::Tree>();
        x.version = j.at("version").get<std::string>();
    }

    inline void to_json(json & j, const Generated::AuspiceJsonV2Json & x) {
        j = json::object();
        j["meta"] = x.meta;
        j["tree"] = x.tree;
        j["version"] = x.version;
    }

    inline void from_json(const json & j, Generated::Type & x) {
        if (j == "boolean") x = Generated::Type::BOOLEAN;
        else if (j == "categorical") x = Generated::Type::CATEGORICAL;
        else if (j == "continuous") x = Generated::Type::CONTINUOUS;
        else if (j == "ordinal") x = Generated::Type::ORDINAL;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const Generated::Type & x) {
        switch (x) {
            case Generated::Type::BOOLEAN: j = "boolean"; break;
            case Generated::Type::CATEGORICAL: j = "categorical"; break;
            case Generated::Type::CONTINUOUS: j = "continuous"; break;
            case Generated::Type::ORDINAL: j = "ordinal"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, Generated::DistanceMeasure & x) {
        if (j == "div") x = Generated::DistanceMeasure::DIV;
        else if (j == "num_date") x = Generated::DistanceMeasure::NUM_DATE;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const Generated::DistanceMeasure & x) {
        switch (x) {
            case Generated::DistanceMeasure::DIV: j = "div"; break;
            case Generated::DistanceMeasure::NUM_DATE: j = "num_date"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, Generated::Layout & x) {
        if (j == "clock") x = Generated::Layout::CLOCK;
        else if (j == "radial") x = Generated::Layout::RADIAL;
        else if (j == "rect") x = Generated::Layout::RECT;
        else if (j == "unrooted") x = Generated::Layout::UNROOTED;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const Generated::Layout & x) {
        switch (x) {
            case Generated::Layout::CLOCK: j = "clock"; break;
            case Generated::Layout::RADIAL: j = "radial"; break;
            case Generated::Layout::RECT: j = "rect"; break;
            case Generated::Layout::UNROOTED: j = "unrooted"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, Generated::Strand & x) {
        if (j == "-") x = Generated::Strand::EMPTY;
        else if (j == "+") x = Generated::Strand::STRAND;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const Generated::Strand & x) {
        switch (x) {
            case Generated::Strand::EMPTY: j = "-"; break;
            case Generated::Strand::STRAND: j = "+"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, Generated::Panel & x) {
        if (j == "entropy") x = Generated::Panel::ENTROPY;
        else if (j == "frequencies") x = Generated::Panel::FREQUENCIES;
        else if (j == "map") x = Generated::Panel::MAP;
        else if (j == "tree") x = Generated::Panel::TREE;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const Generated::Panel & x) {
        switch (x) {
            case Generated::Panel::ENTROPY: j = "entropy"; break;
            case Generated::Panel::FREQUENCIES: j = "frequencies"; break;
            case Generated::Panel::MAP: j = "map"; break;
            case Generated::Panel::TREE: j = "tree"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, Generated::Hidden & x) {
        if (j == "always") x = Generated::Hidden::ALWAYS;
        else if (j == "divtree") x = Generated::Hidden::DIVTREE;
        else if (j == "timetree") x = Generated::Hidden::TIMETREE;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const Generated::Hidden & x) {
        switch (x) {
            case Generated::Hidden::ALWAYS: j = "always"; break;
            case Generated::Hidden::DIVTREE: j = "divtree"; break;
            case Generated::Hidden::TIMETREE: j = "timetree"; break;
            default: throw "This should not happen";
        }
    }
    inline void from_json(const json & j, std::variant<std::vector<json>, bool, Generated::VaccineClass, double, int64_t, std::string> & x) {
        if (j.is_boolean())
            x = j.get<bool>();
        else if (j.is_number_integer())
            x = j.get<int64_t>();
        else if (j.is_number())
            x = j.get<double>();
        else if (j.is_string())
            x = j.get<std::string>();
        else if (j.is_object())
            x = j.get<Generated::VaccineClass>();
        else if (j.is_array())
            x = j.get<std::vector<json>>();
        else throw "Could not deserialize";
    }

    inline void to_json(json & j, const std::variant<std::vector<json>, bool, Generated::VaccineClass, double, int64_t, std::string> & x) {
        switch (x.index()) {
            case 0:
                j = std::get<std::vector<json>>(x);
                break;
            case 1:
                j = std::get<bool>(x);
                break;
            case 2:
                j = std::get<Generated::VaccineClass>(x);
                break;
            case 3:
                j = std::get<double>(x);
                break;
            case 4:
                j = std::get<int64_t>(x);
                break;
            case 5:
                j = std::get<std::string>(x);
                break;
            default: throw "Input JSON does not conform to schema";
        }
    }
}
