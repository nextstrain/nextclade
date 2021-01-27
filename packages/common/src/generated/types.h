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

#include <optional>
#include <stdexcept>
#include <regex>

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

namespace quicktype {
    using nlohmann::json;

    class ClassMemberConstraints {
        private:
        std::optional<int> min_value;
        std::optional<int> max_value;
        std::optional<size_t> min_length;
        std::optional<size_t> max_length;
        std::optional<std::string> pattern;

        public:
        ClassMemberConstraints(
            std::optional<int> min_value,
            std::optional<int> max_value,
            std::optional<size_t> min_length,
            std::optional<size_t> max_length,
            std::optional<std::string> pattern
        ) : min_value(min_value), max_value(max_value), min_length(min_length), max_length(max_length), pattern(pattern) {}
        ClassMemberConstraints() = default;
        virtual ~ClassMemberConstraints() = default;

        void set_min_value(int min_value) { this->min_value = min_value; }
        auto get_min_value() const { return min_value; }

        void set_max_value(int max_value) { this->max_value = max_value; }
        auto get_max_value() const { return max_value; }

        void set_min_length(size_t min_length) { this->min_length = min_length; }
        auto get_min_length() const { return min_length; }

        void set_max_length(size_t max_length) { this->max_length = max_length; }
        auto get_max_length() const { return max_length; }

        void set_pattern(const std::string &  pattern) { this->pattern = pattern; }
        auto get_pattern() const { return pattern; }
    };

    class ClassMemberConstraintException : public std::runtime_error {
        public:
        ClassMemberConstraintException(const std::string &  msg) : std::runtime_error(msg) {}
    };

    class ValueTooLowException : public ClassMemberConstraintException {
        public:
        ValueTooLowException(const std::string &  msg) : ClassMemberConstraintException(msg) {}
    };

    class ValueTooHighException : public ClassMemberConstraintException {
        public:
        ValueTooHighException(const std::string &  msg) : ClassMemberConstraintException(msg) {}
    };

    class ValueTooShortException : public ClassMemberConstraintException {
        public:
        ValueTooShortException(const std::string &  msg) : ClassMemberConstraintException(msg) {}
    };

    class ValueTooLongException : public ClassMemberConstraintException {
        public:
        ValueTooLongException(const std::string &  msg) : ClassMemberConstraintException(msg) {}
    };

    class InvalidPatternException : public ClassMemberConstraintException {
        public:
        InvalidPatternException(const std::string &  msg) : ClassMemberConstraintException(msg) {}
    };

    void CheckConstraint(const std::string &  name, const ClassMemberConstraints & c, int64_t value) {
        if (c.get_min_value() != std::nullopt && value < *c.get_min_value()) {
            throw ValueTooLowException ("Value too low for " + name + " (" + std::to_string(value) + "<" + std::to_string(*c.get_min_value()) + ")");
        }

        if (c.get_max_value() != std::nullopt && value > *c.get_max_value()) {
            throw ValueTooHighException ("Value too high for " + name + " (" + std::to_string(value) + ">" + std::to_string(*c.get_max_value()) + ")");
        }
    }

    void CheckConstraint(const std::string &  name, const ClassMemberConstraints & c, const std::string &  value) {
        if (c.get_min_length() != std::nullopt && value.length() < *c.get_min_length()) {
            throw ValueTooShortException ("Value too short for " + name + " (" + std::to_string(value.length()) + "<" + std::to_string(*c.get_min_length()) + ")");
        }

        if (c.get_max_length() != std::nullopt && value.length() > *c.get_max_length()) {
            throw ValueTooLongException ("Value too long for " + name + " (" + std::to_string(value.length()) + ">" + std::to_string(*c.get_max_length()) + ")");
        }

        if (c.get_pattern() != std::nullopt) {
            std::smatch result;
            std::regex_search(value, result, std::regex( *c.get_pattern() ));
            if (result.empty()) {
                throw InvalidPatternException ("Value doesn't match pattern for " + name + " (" + value +" != " + *c.get_pattern() + ")");
            }
        }
    }

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
    class Coloring {
        public:
        Coloring() = default;
        virtual ~Coloring() = default;

        private:
        std::string key;
        std::shared_ptr<std::vector<std::vector<std::string>>> scale;
        std::shared_ptr<std::string> title;
        Type type;

        public:
        /**
         * They key used to access the value of this coloring on each node
         */
        const std::string & get_key() const { return key; }
        std::string & get_mutable_key() { return key; }
        void set_key(const std::string & value) { this->key = value; }

        /**
         * Provided mapping between trait values & hex values
         */
        std::shared_ptr<std::vector<std::vector<std::string>>> get_scale() const { return scale; }
        void set_scale(std::shared_ptr<std::vector<std::vector<std::string>>> value) { this->scale = value; }

        /**
         * Text to be displayed in the "color by" dropdown and the tree legend
         */
        std::shared_ptr<std::string> get_title() const { return title; }
        void set_title(std::shared_ptr<std::string> value) { this->title = value; }

        /**
         * Dictates how the color scale should be constructed
         */
        const Type & get_type() const { return type; }
        Type & get_mutable_type() { return type; }
        void set_type(const Type & value) { this->type = value; }
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
    class DisplayDefaults {
        public:
        DisplayDefaults() = default;
        virtual ~DisplayDefaults() = default;

        private:
        std::shared_ptr<std::string> branch_label;
        std::shared_ptr<std::string> color_by;
        std::shared_ptr<DistanceMeasure> distance_measure;
        std::shared_ptr<std::string> geo_resolution;
        std::shared_ptr<Layout> layout;
        std::shared_ptr<bool> map_triplicate;
        std::shared_ptr<bool> transmission_lines;

        public:
        /**
         * What branch label should be displayed by default.
         */
        std::shared_ptr<std::string> get_branch_label() const { return branch_label; }
        void set_branch_label(std::shared_ptr<std::string> value) { this->branch_label = value; }

        /**
         * Default color by
         */
        std::shared_ptr<std::string> get_color_by() const { return color_by; }
        void set_color_by(std::shared_ptr<std::string> value) { this->color_by = value; }

        /**
         * Default tree metric
         */
        std::shared_ptr<DistanceMeasure> get_distance_measure() const { return distance_measure; }
        void set_distance_measure(std::shared_ptr<DistanceMeasure> value) { this->distance_measure = value; }

        /**
         * Default geographic resolution
         */
        std::shared_ptr<std::string> get_geo_resolution() const { return geo_resolution; }
        void set_geo_resolution(std::shared_ptr<std::string> value) { this->geo_resolution = value; }

        /**
         * Default tree layout
         */
        std::shared_ptr<Layout> get_layout() const { return layout; }
        void set_layout(std::shared_ptr<Layout> value) { this->layout = value; }

        /**
         * Should the map be extended / wrapped around. Useful if transmissions are worldwide.
         */
        std::shared_ptr<bool> get_map_triplicate() const { return map_triplicate; }
        void set_map_triplicate(std::shared_ptr<bool> value) { this->map_triplicate = value; }

        /**
         * Should transmission lines (if available) be displaye by default
         */
        std::shared_ptr<bool> get_transmission_lines() const { return transmission_lines; }
        void set_transmission_lines(std::shared_ptr<bool> value) { this->transmission_lines = value; }
    };

    /**
     * Positive or negative strand
     */
    enum class Strand : int { EMPTY, STRAND };

    class Nuc {
        public:
        Nuc() = default;
        virtual ~Nuc() = default;

        private:
        std::shared_ptr<double> end;
        std::shared_ptr<std::string> seqid;
        std::shared_ptr<double> start;
        std::shared_ptr<Strand> strand;
        std::shared_ptr<std::string> type;

        public:
        /**
         * Gene end position (one-based closed, last position of feature, following GFF format)
         */
        std::shared_ptr<double> get_end() const { return end; }
        void set_end(std::shared_ptr<double> value) { this->end = value; }

        /**
         * Sequence on which the coordinates below are valid. Could be viral segment, bacterial
         * contig, etc
         */
        std::shared_ptr<std::string> get_seqid() const { return seqid; }
        void set_seqid(std::shared_ptr<std::string> value) { this->seqid = value; }

        /**
         * Gene start position (one-based, following GFF format)
         */
        std::shared_ptr<double> get_start() const { return start; }
        void set_start(std::shared_ptr<double> value) { this->start = value; }

        /**
         * Positive or negative strand
         */
        std::shared_ptr<Strand> get_strand() const { return strand; }
        void set_strand(std::shared_ptr<Strand> value) { this->strand = value; }

        /**
         * Type of the feature. could be mRNA, CDS, or similar
         */
        std::shared_ptr<std::string> get_type() const { return type; }
        void set_type(std::shared_ptr<std::string> value) { this->type = value; }
    };

    /**
     * Genome annotations (e.g. genes), relative to the reference genome
     */
    class GenomeAnnotations {
        public:
        GenomeAnnotations() = default;
        virtual ~GenomeAnnotations() = default;

        private:
        Nuc nuc;

        public:
        const Nuc & get_nuc() const { return nuc; }
        Nuc & get_mutable_nuc() { return nuc; }
        void set_nuc(const Nuc & value) { this->nuc = value; }
    };

    /**
     * Each object here is an indiviual geo resolution
     */
    class GeoResolution {
        public:
        GeoResolution() = default;
        virtual ~GeoResolution() = default;

        private:
        std::map<std::string, nlohmann::json> demes;
        std::string key;
        std::shared_ptr<std::string> title;

        public:
        /**
         * The deme names & lat/long info for this geographic resolution
         */
        const std::map<std::string, nlohmann::json> & get_demes() const { return demes; }
        std::map<std::string, nlohmann::json> & get_mutable_demes() { return demes; }
        void set_demes(const std::map<std::string, nlohmann::json> & value) { this->demes = value; }

        /**
         * Trait key - must be specified on nodes (e.g. 'country')
         */
        const std::string & get_key() const { return key; }
        std::string & get_mutable_key() { return key; }
        void set_key(const std::string & value) { this->key = value; }

        /**
         * The title to display in the geo resolution dropdown. Optional -- if not provided then
         * `key` will be used.
         */
        std::shared_ptr<std::string> get_title() const { return title; }
        void set_title(std::shared_ptr<std::string> value) { this->title = value; }
    };

    class Maintainer {
        public:
        Maintainer() = default;
        virtual ~Maintainer() = default;

        private:
        std::string name;
        std::shared_ptr<std::string> url;

        public:
        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        std::shared_ptr<std::string> get_url() const { return url; }
        void set_url(std::shared_ptr<std::string> value) { this->url = value; }
    };

    enum class Panel : int { ENTROPY, FREQUENCIES, MAP, TREE };

    class Meta {
        public:
        Meta() :
            updated_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$"))
        {}
        virtual ~Meta() = default;

        private:
        std::shared_ptr<std::string> build_url;
        std::shared_ptr<std::vector<Coloring>> colorings;
        std::shared_ptr<std::string> description;
        std::shared_ptr<DisplayDefaults> display_defaults;
        std::shared_ptr<std::vector<std::string>> filters;
        nlohmann::json frequencies;
        std::shared_ptr<GenomeAnnotations> genome_annotations;
        std::shared_ptr<std::vector<GeoResolution>> geo_resolutions;
        std::shared_ptr<std::vector<Maintainer>> maintainers;
        std::vector<Panel> panels;
        std::shared_ptr<std::string> title;
        std::shared_ptr<std::string> tree_name;
        std::string updated;
        ClassMemberConstraints updated_constraint;

        public:
        /**
         * Auspice displays this at the top of the page as part of a byline
         */
        std::shared_ptr<std::string> get_build_url() const { return build_url; }
        void set_build_url(std::shared_ptr<std::string> value) { this->build_url = value; }

        /**
         * Available colorBys for Auspice
         */
        std::shared_ptr<std::vector<Coloring>> get_colorings() const { return colorings; }
        void set_colorings(std::shared_ptr<std::vector<Coloring>> value) { this->colorings = value; }

        /**
         * Auspice displays this currently in the footer.
         */
        std::shared_ptr<std::string> get_description() const { return description; }
        void set_description(std::shared_ptr<std::string> value) { this->description = value; }

        /**
         * Set the defaults for certain display options in Auspice. All are optional.
         */
        std::shared_ptr<DisplayDefaults> get_display_defaults() const { return display_defaults; }
        void set_display_defaults(std::shared_ptr<DisplayDefaults> value) { this->display_defaults = value; }

        /**
         * These appear as filters in the footer of Auspice (which populates the displayed values
         * based upon the tree)
         */
        std::shared_ptr<std::vector<std::string>> get_filters() const { return filters; }
        void set_filters(std::shared_ptr<std::vector<std::string>> value) { this->filters = value; }

        const nlohmann::json & get_frequencies() const { return frequencies; }
        nlohmann::json & get_mutable_frequencies() { return frequencies; }
        void set_frequencies(const nlohmann::json & value) { this->frequencies = value; }

        /**
         * Genome annotations (e.g. genes), relative to the reference genome
         */
        std::shared_ptr<GenomeAnnotations> get_genome_annotations() const { return genome_annotations; }
        void set_genome_annotations(std::shared_ptr<GenomeAnnotations> value) { this->genome_annotations = value; }

        /**
         * The available options for the geographic resolution dropdown, and their lat/long
         * information
         */
        std::shared_ptr<std::vector<GeoResolution>> get_geo_resolutions() const { return geo_resolutions; }
        void set_geo_resolutions(std::shared_ptr<std::vector<GeoResolution>> value) { this->geo_resolutions = value; }

        /**
         * Who maintains this dataset?
         */
        std::shared_ptr<std::vector<Maintainer>> get_maintainers() const { return maintainers; }
        void set_maintainers(std::shared_ptr<std::vector<Maintainer>> value) { this->maintainers = value; }

        /**
         * Which panels should Auspice display?
         */
        const std::vector<Panel> & get_panels() const { return panels; }
        std::vector<Panel> & get_mutable_panels() { return panels; }
        void set_panels(const std::vector<Panel> & value) { this->panels = value; }

        /**
         * Auspice displays this at the top of the page
         */
        std::shared_ptr<std::string> get_title() const { return title; }
        void set_title(std::shared_ptr<std::string> value) { this->title = value; }

        /**
         * The name of the tree (e.g. segment name), if applicable
         */
        std::shared_ptr<std::string> get_tree_name() const { return tree_name; }
        void set_tree_name(std::shared_ptr<std::string> value) { this->tree_name = value; }

        /**
         * Auspice displays this (currently only in the footer)
         */
        const std::string & get_updated() const { return updated; }
        std::string & get_mutable_updated() { return updated; }
        void set_updated(const std::string & value) { CheckConstraint("updated", updated_constraint, value); this->updated = value; }
    };

    /**
     * Mutations occuring between the parent and this node
     */
    class Mutations {
        public:
        Mutations() = default;
        virtual ~Mutations() = default;

        private:
        std::shared_ptr<std::vector<std::string>> nuc;

        public:
        /**
         * nucelotide mutations
         */
        std::shared_ptr<std::vector<std::string>> get_nuc() const { return nuc; }
        void set_nuc(std::shared_ptr<std::vector<std::string>> value) { this->nuc = value; }
    };

    /**
     * attributes associated with the branch from the parent node to this node, such as branch
     * lengths, mutations, support values
     */
    class BranchAttrs {
        public:
        BranchAttrs() = default;
        virtual ~BranchAttrs() = default;

        private:
        nlohmann::json labels;
        std::shared_ptr<Mutations> mutations;

        public:
        /**
         * Node labels
         */
        const nlohmann::json & get_labels() const { return labels; }
        nlohmann::json & get_mutable_labels() { return labels; }
        void set_labels(const nlohmann::json & value) { this->labels = value; }

        /**
         * Mutations occuring between the parent and this node
         */
        std::shared_ptr<Mutations> get_mutations() const { return mutations; }
        void set_mutations(std::shared_ptr<Mutations> value) { this->mutations = value; }
    };

    /**
     * Author information (terminal nodes only)
     */
    class Author {
        public:
        Author() :
            paper_url_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^https?://.+$"))
        {}
        virtual ~Author() = default;

        private:
        std::shared_ptr<std::string> journal;
        std::shared_ptr<std::string> paper_url;
        ClassMemberConstraints paper_url_constraint;
        std::shared_ptr<std::string> title;
        std::string value;

        public:
        /**
         * Journal title (including year, if applicable)
         */
        std::shared_ptr<std::string> get_journal() const { return journal; }
        void set_journal(std::shared_ptr<std::string> value) { this->journal = value; }

        /**
         * URL link to paper (if available)
         */
        std::shared_ptr<std::string> get_paper_url() const { return paper_url; }
        void set_paper_url(std::shared_ptr<std::string> value) { if (value) CheckConstraint("paper_url", paper_url_constraint, *value); this->paper_url = value; }

        /**
         * Publication title
         */
        std::shared_ptr<std::string> get_title() const { return title; }
        void set_title(std::shared_ptr<std::string> value) { this->title = value; }

        /**
         * unique value for this publication. Displayed as-is by auspice.
         */
        const std::string & get_value() const { return value; }
        std::string & get_mutable_value() { return value; }
        void set_value(const std::string & value) { this->value = value; }
    };

    enum class Hidden : int { ALWAYS, DIVTREE, TIMETREE };

    class NumDate {
        public:
        NumDate() = default;
        virtual ~NumDate() = default;

        private:
        std::shared_ptr<std::vector<double>> confidence;
        double value;

        public:
        /**
         * Confidence of the node date
         */
        std::shared_ptr<std::vector<double>> get_confidence() const { return confidence; }
        void set_confidence(std::shared_ptr<std::vector<double>> value) { this->confidence = value; }

        const double & get_value() const { return value; }
        double & get_mutable_value() { return value; }
        void set_value(const double & value) { this->value = value; }
    };

    class VaccineClass {
        public:
        VaccineClass() :
            end_date_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$")),
            selection_date_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$")),
            start_date_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$"))
        {}
        virtual ~VaccineClass() = default;

        private:
        std::shared_ptr<std::string> end_date;
        ClassMemberConstraints end_date_constraint;
        std::shared_ptr<std::string> selection_date;
        ClassMemberConstraints selection_date_constraint;
        std::shared_ptr<bool> serum;
        std::shared_ptr<std::string> start_date;
        ClassMemberConstraints start_date_constraint;

        public:
        /**
         * When the vaccine was stopped
         */
        std::shared_ptr<std::string> get_end_date() const { return end_date; }
        void set_end_date(std::shared_ptr<std::string> value) { if (value) CheckConstraint("end_date", end_date_constraint, *value); this->end_date = value; }

        /**
         * Vaccine selection date
         */
        std::shared_ptr<std::string> get_selection_date() const { return selection_date; }
        void set_selection_date(std::shared_ptr<std::string> value) { if (value) CheckConstraint("selection_date", selection_date_constraint, *value); this->selection_date = value; }

        /**
         * strain used to raise sera (for ???)
         */
        std::shared_ptr<bool> get_serum() const { return serum; }
        void set_serum(std::shared_ptr<bool> value) { this->serum = value; }

        /**
         * Vaccine usage start date
         */
        std::shared_ptr<std::string> get_start_date() const { return start_date; }
        void set_start_date(std::shared_ptr<std::string> value) { if (value) CheckConstraint("start_date", start_date_constraint, *value); this->start_date = value; }
    };

    using VaccineUnion = std::shared_ptr<std::variant<std::vector<nlohmann::json>, bool, VaccineClass, double, int64_t, std::string>>;

    /**
     * attributes associated with the node (sequence, date, location) as opposed to changes from
     * one node to another.
     */
    class NodeAttrs {
        public:
        NodeAttrs() :
            accession_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^[0-9A-Za-z-_]+$")),
            url_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^https?://.+$"))
        {}
        virtual ~NodeAttrs() = default;

        private:
        std::shared_ptr<std::string> accession;
        ClassMemberConstraints accession_constraint;
        std::shared_ptr<Author> author;
        std::shared_ptr<double> div;
        std::shared_ptr<Hidden> hidden;
        std::shared_ptr<NumDate> num_date;
        std::shared_ptr<std::string> url;
        ClassMemberConstraints url_constraint;
        VaccineUnion vaccine;

        public:
        /**
         * Sequence accession number
         */
        std::shared_ptr<std::string> get_accession() const { return accession; }
        void set_accession(std::shared_ptr<std::string> value) { if (value) CheckConstraint("accession", accession_constraint, *value); this->accession = value; }

        /**
         * Author information (terminal nodes only)
         */
        std::shared_ptr<Author> get_author() const { return author; }
        void set_author(std::shared_ptr<Author> value) { this->author = value; }

        /**
         * Node (phylogenetic) divergence
         */
        std::shared_ptr<double> get_div() const { return div; }
        void set_div(std::shared_ptr<double> value) { this->div = value; }

        std::shared_ptr<Hidden> get_hidden() const { return hidden; }
        void set_hidden(std::shared_ptr<Hidden> value) { this->hidden = value; }

        std::shared_ptr<NumDate> get_num_date() const { return num_date; }
        void set_num_date(std::shared_ptr<NumDate> value) { this->num_date = value; }

        /**
         * URL of the sequence (usually https://www.ncbi.nlm.nih.gov/nuccore/...)
         */
        std::shared_ptr<std::string> get_url() const { return url; }
        void set_url(std::shared_ptr<std::string> value) { if (value) CheckConstraint("url", url_constraint, *value); this->url = value; }

        /**
         * Vaccine information
         */
        VaccineUnion get_vaccine() const { return vaccine; }
        void set_vaccine(VaccineUnion value) { this->vaccine = value; }
    };

    class Tree {
        public:
        Tree() = default;
        virtual ~Tree() = default;

        private:
        std::shared_ptr<BranchAttrs> branch_attrs;
        std::shared_ptr<std::vector<Tree>> children;
        std::string name;
        std::shared_ptr<NodeAttrs> node_attrs;

        public:
        /**
         * attributes associated with the branch from the parent node to this node, such as branch
         * lengths, mutations, support values
         */
        std::shared_ptr<BranchAttrs> get_branch_attrs() const { return branch_attrs; }
        void set_branch_attrs(std::shared_ptr<BranchAttrs> value) { this->branch_attrs = value; }

        /**
         * Child nodes. Recursive structure. Terminal nodes do not have this property.
         */
        std::shared_ptr<std::vector<Tree>> get_children() const { return children; }
        void set_children(std::shared_ptr<std::vector<Tree>> value) { this->children = value; }

        /**
         * Strain name. Must be unique. No spaces
         */
        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        /**
         * attributes associated with the node (sequence, date, location) as opposed to changes from
         * one node to another.
         */
        std::shared_ptr<NodeAttrs> get_node_attrs() const { return node_attrs; }
        void set_node_attrs(std::shared_ptr<NodeAttrs> value) { this->node_attrs = value; }
    };

    class AuspiceJsonV2Json {
        public:
        AuspiceJsonV2Json() :
            version_constraint(std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::string("^v[0-9]+$"))
        {}
        virtual ~AuspiceJsonV2Json() = default;

        private:
        Meta meta;
        Tree tree;
        std::string version;
        ClassMemberConstraints version_constraint;

        public:
        const Meta & get_meta() const { return meta; }
        Meta & get_mutable_meta() { return meta; }
        void set_meta(const Meta & value) { this->meta = value; }

        const Tree & get_tree() const { return tree; }
        Tree & get_mutable_tree() { return tree; }
        void set_tree(const Tree & value) { this->tree = value; }

        /**
         * JSON schema version
         */
        const std::string & get_version() const { return version; }
        std::string & get_mutable_version() { return version; }
        void set_version(const std::string & value) { CheckConstraint("version", version_constraint, value); this->version = value; }
    };
}

namespace nlohmann {
    void from_json(const json & j, quicktype::Coloring & x);
    void to_json(json & j, const quicktype::Coloring & x);

    void from_json(const json & j, quicktype::DisplayDefaults & x);
    void to_json(json & j, const quicktype::DisplayDefaults & x);

    void from_json(const json & j, quicktype::Nuc & x);
    void to_json(json & j, const quicktype::Nuc & x);

    void from_json(const json & j, quicktype::GenomeAnnotations & x);
    void to_json(json & j, const quicktype::GenomeAnnotations & x);

    void from_json(const json & j, quicktype::GeoResolution & x);
    void to_json(json & j, const quicktype::GeoResolution & x);

    void from_json(const json & j, quicktype::Maintainer & x);
    void to_json(json & j, const quicktype::Maintainer & x);

    void from_json(const json & j, quicktype::Meta & x);
    void to_json(json & j, const quicktype::Meta & x);

    void from_json(const json & j, quicktype::Mutations & x);
    void to_json(json & j, const quicktype::Mutations & x);

    void from_json(const json & j, quicktype::BranchAttrs & x);
    void to_json(json & j, const quicktype::BranchAttrs & x);

    void from_json(const json & j, quicktype::Author & x);
    void to_json(json & j, const quicktype::Author & x);

    void from_json(const json & j, quicktype::NumDate & x);
    void to_json(json & j, const quicktype::NumDate & x);

    void from_json(const json & j, quicktype::VaccineClass & x);
    void to_json(json & j, const quicktype::VaccineClass & x);

    void from_json(const json & j, quicktype::NodeAttrs & x);
    void to_json(json & j, const quicktype::NodeAttrs & x);

    void from_json(const json & j, quicktype::Tree & x);
    void to_json(json & j, const quicktype::Tree & x);

    void from_json(const json & j, quicktype::AuspiceJsonV2Json & x);
    void to_json(json & j, const quicktype::AuspiceJsonV2Json & x);

    void from_json(const json & j, quicktype::Type & x);
    void to_json(json & j, const quicktype::Type & x);

    void from_json(const json & j, quicktype::DistanceMeasure & x);
    void to_json(json & j, const quicktype::DistanceMeasure & x);

    void from_json(const json & j, quicktype::Layout & x);
    void to_json(json & j, const quicktype::Layout & x);

    void from_json(const json & j, quicktype::Strand & x);
    void to_json(json & j, const quicktype::Strand & x);

    void from_json(const json & j, quicktype::Panel & x);
    void to_json(json & j, const quicktype::Panel & x);

    void from_json(const json & j, quicktype::Hidden & x);
    void to_json(json & j, const quicktype::Hidden & x);
    void from_json(const json & j, std::variant<std::vector<json>, bool, quicktype::VaccineClass, double, int64_t, std::string> & x);
    void to_json(json & j, const std::variant<std::vector<json>, bool, quicktype::VaccineClass, double, int64_t, std::string> & x);

    inline void from_json(const json & j, quicktype::Coloring& x) {
        x.set_key(j.at("key").get<std::string>());
        x.set_scale(quicktype::get_optional<std::vector<std::vector<std::string>>>(j, "scale"));
        x.set_title(quicktype::get_optional<std::string>(j, "title"));
        x.set_type(j.at("type").get<quicktype::Type>());
    }

    inline void to_json(json & j, const quicktype::Coloring & x) {
        j = json::object();
        j["key"] = x.get_key();
        j["scale"] = x.get_scale();
        j["title"] = x.get_title();
        j["type"] = x.get_type();
    }

    inline void from_json(const json & j, quicktype::DisplayDefaults& x) {
        x.set_branch_label(quicktype::get_optional<std::string>(j, "branch_label"));
        x.set_color_by(quicktype::get_optional<std::string>(j, "color_by"));
        x.set_distance_measure(quicktype::get_optional<quicktype::DistanceMeasure>(j, "distance_measure"));
        x.set_geo_resolution(quicktype::get_optional<std::string>(j, "geo_resolution"));
        x.set_layout(quicktype::get_optional<quicktype::Layout>(j, "layout"));
        x.set_map_triplicate(quicktype::get_optional<bool>(j, "map_triplicate"));
        x.set_transmission_lines(quicktype::get_optional<bool>(j, "transmission_lines"));
    }

    inline void to_json(json & j, const quicktype::DisplayDefaults & x) {
        j = json::object();
        j["branch_label"] = x.get_branch_label();
        j["color_by"] = x.get_color_by();
        j["distance_measure"] = x.get_distance_measure();
        j["geo_resolution"] = x.get_geo_resolution();
        j["layout"] = x.get_layout();
        j["map_triplicate"] = x.get_map_triplicate();
        j["transmission_lines"] = x.get_transmission_lines();
    }

    inline void from_json(const json & j, quicktype::Nuc& x) {
        x.set_end(quicktype::get_optional<double>(j, "end"));
        x.set_seqid(quicktype::get_optional<std::string>(j, "seqid"));
        x.set_start(quicktype::get_optional<double>(j, "start"));
        x.set_strand(quicktype::get_optional<quicktype::Strand>(j, "strand"));
        x.set_type(quicktype::get_optional<std::string>(j, "type"));
    }

    inline void to_json(json & j, const quicktype::Nuc & x) {
        j = json::object();
        j["end"] = x.get_end();
        j["seqid"] = x.get_seqid();
        j["start"] = x.get_start();
        j["strand"] = x.get_strand();
        j["type"] = x.get_type();
    }

    inline void from_json(const json & j, quicktype::GenomeAnnotations& x) {
        x.set_nuc(j.at("nuc").get<quicktype::Nuc>());
    }

    inline void to_json(json & j, const quicktype::GenomeAnnotations & x) {
        j = json::object();
        j["nuc"] = x.get_nuc();
    }

    inline void from_json(const json & j, quicktype::GeoResolution& x) {
        x.set_demes(j.at("demes").get<std::map<std::string, json>>());
        x.set_key(j.at("key").get<std::string>());
        x.set_title(quicktype::get_optional<std::string>(j, "title"));
    }

    inline void to_json(json & j, const quicktype::GeoResolution & x) {
        j = json::object();
        j["demes"] = x.get_demes();
        j["key"] = x.get_key();
        j["title"] = x.get_title();
    }

    inline void from_json(const json & j, quicktype::Maintainer& x) {
        x.set_name(j.at("name").get<std::string>());
        x.set_url(quicktype::get_optional<std::string>(j, "url"));
    }

    inline void to_json(json & j, const quicktype::Maintainer & x) {
        j = json::object();
        j["name"] = x.get_name();
        j["url"] = x.get_url();
    }

    inline void from_json(const json & j, quicktype::Meta& x) {
        x.set_build_url(quicktype::get_optional<std::string>(j, "build_url"));
        x.set_colorings(quicktype::get_optional<std::vector<quicktype::Coloring>>(j, "colorings"));
        x.set_description(quicktype::get_optional<std::string>(j, "description"));
        x.set_display_defaults(quicktype::get_optional<quicktype::DisplayDefaults>(j, "display_defaults"));
        x.set_filters(quicktype::get_optional<std::vector<std::string>>(j, "filters"));
        x.set_frequencies(quicktype::get_untyped(j, "frequencies"));
        x.set_genome_annotations(quicktype::get_optional<quicktype::GenomeAnnotations>(j, "genome_annotations"));
        x.set_geo_resolutions(quicktype::get_optional<std::vector<quicktype::GeoResolution>>(j, "geo_resolutions"));
        x.set_maintainers(quicktype::get_optional<std::vector<quicktype::Maintainer>>(j, "maintainers"));
        x.set_panels(j.at("panels").get<std::vector<quicktype::Panel>>());
        x.set_title(quicktype::get_optional<std::string>(j, "title"));
        x.set_tree_name(quicktype::get_optional<std::string>(j, "tree_name"));
        x.set_updated(j.at("updated").get<std::string>());
    }

    inline void to_json(json & j, const quicktype::Meta & x) {
        j = json::object();
        j["build_url"] = x.get_build_url();
        j["colorings"] = x.get_colorings();
        j["description"] = x.get_description();
        j["display_defaults"] = x.get_display_defaults();
        j["filters"] = x.get_filters();
        j["frequencies"] = x.get_frequencies();
        j["genome_annotations"] = x.get_genome_annotations();
        j["geo_resolutions"] = x.get_geo_resolutions();
        j["maintainers"] = x.get_maintainers();
        j["panels"] = x.get_panels();
        j["title"] = x.get_title();
        j["tree_name"] = x.get_tree_name();
        j["updated"] = x.get_updated();
    }

    inline void from_json(const json & j, quicktype::Mutations& x) {
        x.set_nuc(quicktype::get_optional<std::vector<std::string>>(j, "nuc"));
    }

    inline void to_json(json & j, const quicktype::Mutations & x) {
        j = json::object();
        j["nuc"] = x.get_nuc();
    }

    inline void from_json(const json & j, quicktype::BranchAttrs& x) {
        x.set_labels(quicktype::get_untyped(j, "labels"));
        x.set_mutations(quicktype::get_optional<quicktype::Mutations>(j, "mutations"));
    }

    inline void to_json(json & j, const quicktype::BranchAttrs & x) {
        j = json::object();
        j["labels"] = x.get_labels();
        j["mutations"] = x.get_mutations();
    }

    inline void from_json(const json & j, quicktype::Author& x) {
        x.set_journal(quicktype::get_optional<std::string>(j, "journal"));
        x.set_paper_url(quicktype::get_optional<std::string>(j, "paper_url"));
        x.set_title(quicktype::get_optional<std::string>(j, "title"));
        x.set_value(j.at("value").get<std::string>());
    }

    inline void to_json(json & j, const quicktype::Author & x) {
        j = json::object();
        j["journal"] = x.get_journal();
        j["paper_url"] = x.get_paper_url();
        j["title"] = x.get_title();
        j["value"] = x.get_value();
    }

    inline void from_json(const json & j, quicktype::NumDate& x) {
        x.set_confidence(quicktype::get_optional<std::vector<double>>(j, "confidence"));
        x.set_value(j.at("value").get<double>());
    }

    inline void to_json(json & j, const quicktype::NumDate & x) {
        j = json::object();
        j["confidence"] = x.get_confidence();
        j["value"] = x.get_value();
    }

    inline void from_json(const json & j, quicktype::VaccineClass& x) {
        x.set_end_date(quicktype::get_optional<std::string>(j, "end_date"));
        x.set_selection_date(quicktype::get_optional<std::string>(j, "selection_date"));
        x.set_serum(quicktype::get_optional<bool>(j, "serum"));
        x.set_start_date(quicktype::get_optional<std::string>(j, "start_date"));
    }

    inline void to_json(json & j, const quicktype::VaccineClass & x) {
        j = json::object();
        j["end_date"] = x.get_end_date();
        j["selection_date"] = x.get_selection_date();
        j["serum"] = x.get_serum();
        j["start_date"] = x.get_start_date();
    }

    inline void from_json(const json & j, quicktype::NodeAttrs& x) {
        x.set_accession(quicktype::get_optional<std::string>(j, "accession"));
        x.set_author(quicktype::get_optional<quicktype::Author>(j, "author"));
        x.set_div(quicktype::get_optional<double>(j, "div"));
        x.set_hidden(quicktype::get_optional<quicktype::Hidden>(j, "hidden"));
        x.set_num_date(quicktype::get_optional<quicktype::NumDate>(j, "num_date"));
        x.set_url(quicktype::get_optional<std::string>(j, "url"));
        x.set_vaccine(quicktype::get_optional<std::variant<std::vector<json>, bool, quicktype::VaccineClass, double, int64_t, std::string>>(j, "vaccine"));
    }

    inline void to_json(json & j, const quicktype::NodeAttrs & x) {
        j = json::object();
        j["accession"] = x.get_accession();
        j["author"] = x.get_author();
        j["div"] = x.get_div();
        j["hidden"] = x.get_hidden();
        j["num_date"] = x.get_num_date();
        j["url"] = x.get_url();
        j["vaccine"] = x.get_vaccine();
    }

    inline void from_json(const json & j, quicktype::Tree& x) {
        x.set_branch_attrs(quicktype::get_optional<quicktype::BranchAttrs>(j, "branch_attrs"));
        x.set_children(quicktype::get_optional<std::vector<quicktype::Tree>>(j, "children"));
        x.set_name(j.at("name").get<std::string>());
        x.set_node_attrs(quicktype::get_optional<quicktype::NodeAttrs>(j, "node_attrs"));
    }

    inline void to_json(json & j, const quicktype::Tree & x) {
        j = json::object();
        j["branch_attrs"] = x.get_branch_attrs();
        j["children"] = x.get_children();
        j["name"] = x.get_name();
        j["node_attrs"] = x.get_node_attrs();
    }

    inline void from_json(const json & j, quicktype::AuspiceJsonV2Json& x) {
        x.set_meta(j.at("meta").get<quicktype::Meta>());
        x.set_tree(j.at("tree").get<quicktype::Tree>());
        x.set_version(j.at("version").get<std::string>());
    }

    inline void to_json(json & j, const quicktype::AuspiceJsonV2Json & x) {
        j = json::object();
        j["meta"] = x.get_meta();
        j["tree"] = x.get_tree();
        j["version"] = x.get_version();
    }

    inline void from_json(const json & j, quicktype::Type & x) {
        if (j == "boolean") x = quicktype::Type::BOOLEAN;
        else if (j == "categorical") x = quicktype::Type::CATEGORICAL;
        else if (j == "continuous") x = quicktype::Type::CONTINUOUS;
        else if (j == "ordinal") x = quicktype::Type::ORDINAL;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const quicktype::Type & x) {
        switch (x) {
            case quicktype::Type::BOOLEAN: j = "boolean"; break;
            case quicktype::Type::CATEGORICAL: j = "categorical"; break;
            case quicktype::Type::CONTINUOUS: j = "continuous"; break;
            case quicktype::Type::ORDINAL: j = "ordinal"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, quicktype::DistanceMeasure & x) {
        if (j == "div") x = quicktype::DistanceMeasure::DIV;
        else if (j == "num_date") x = quicktype::DistanceMeasure::NUM_DATE;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const quicktype::DistanceMeasure & x) {
        switch (x) {
            case quicktype::DistanceMeasure::DIV: j = "div"; break;
            case quicktype::DistanceMeasure::NUM_DATE: j = "num_date"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, quicktype::Layout & x) {
        if (j == "clock") x = quicktype::Layout::CLOCK;
        else if (j == "radial") x = quicktype::Layout::RADIAL;
        else if (j == "rect") x = quicktype::Layout::RECT;
        else if (j == "unrooted") x = quicktype::Layout::UNROOTED;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const quicktype::Layout & x) {
        switch (x) {
            case quicktype::Layout::CLOCK: j = "clock"; break;
            case quicktype::Layout::RADIAL: j = "radial"; break;
            case quicktype::Layout::RECT: j = "rect"; break;
            case quicktype::Layout::UNROOTED: j = "unrooted"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, quicktype::Strand & x) {
        if (j == "-") x = quicktype::Strand::EMPTY;
        else if (j == "+") x = quicktype::Strand::STRAND;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const quicktype::Strand & x) {
        switch (x) {
            case quicktype::Strand::EMPTY: j = "-"; break;
            case quicktype::Strand::STRAND: j = "+"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, quicktype::Panel & x) {
        if (j == "entropy") x = quicktype::Panel::ENTROPY;
        else if (j == "frequencies") x = quicktype::Panel::FREQUENCIES;
        else if (j == "map") x = quicktype::Panel::MAP;
        else if (j == "tree") x = quicktype::Panel::TREE;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const quicktype::Panel & x) {
        switch (x) {
            case quicktype::Panel::ENTROPY: j = "entropy"; break;
            case quicktype::Panel::FREQUENCIES: j = "frequencies"; break;
            case quicktype::Panel::MAP: j = "map"; break;
            case quicktype::Panel::TREE: j = "tree"; break;
            default: throw "This should not happen";
        }
    }

    inline void from_json(const json & j, quicktype::Hidden & x) {
        if (j == "always") x = quicktype::Hidden::ALWAYS;
        else if (j == "divtree") x = quicktype::Hidden::DIVTREE;
        else if (j == "timetree") x = quicktype::Hidden::TIMETREE;
        else throw "Input JSON does not conform to schema";
    }

    inline void to_json(json & j, const quicktype::Hidden & x) {
        switch (x) {
            case quicktype::Hidden::ALWAYS: j = "always"; break;
            case quicktype::Hidden::DIVTREE: j = "divtree"; break;
            case quicktype::Hidden::TIMETREE: j = "timetree"; break;
            default: throw "This should not happen";
        }
    }
    inline void from_json(const json & j, std::variant<std::vector<json>, bool, quicktype::VaccineClass, double, int64_t, std::string> & x) {
        if (j.is_boolean())
            x = j.get<bool>();
        else if (j.is_number_integer())
            x = j.get<int64_t>();
        else if (j.is_number())
            x = j.get<double>();
        else if (j.is_string())
            x = j.get<std::string>();
        else if (j.is_object())
            x = j.get<quicktype::VaccineClass>();
        else if (j.is_array())
            x = j.get<std::vector<json>>();
        else throw "Could not deserialize";
    }

    inline void to_json(json & j, const std::variant<std::vector<json>, bool, quicktype::VaccineClass, double, int64_t, std::string> & x) {
        switch (x.index()) {
            case 0:
                j = std::get<std::vector<json>>(x);
                break;
            case 1:
                j = std::get<bool>(x);
                break;
            case 2:
                j = std::get<quicktype::VaccineClass>(x);
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
