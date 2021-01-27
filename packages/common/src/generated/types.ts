// To parse this data:
//
//   import { Convert, AuspiceJSONV2JSON } from "./file";
//
//   const auspiceJSONV2JSON = Convert.toAuspiceJSONV2JSON(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface AuspiceJSONV2JSON {
  meta: Meta;
  tree: Tree;
  /**
   * JSON schema version
   */
  version: string;
}

export interface Meta {
  /**
   * Auspice displays this at the top of the page as part of a byline
   */
  buildURL?: string;
  /**
   * Available colorBys for Auspice
   */
  colorings?: Coloring[];
  /**
   * Auspice displays this currently in the footer.
   */
  description?: string;
  /**
   * Set the defaults for certain display options in Auspice. All are optional.
   */
  displayDefaults?: DisplayDefaults;
  /**
   * These appear as filters in the footer of Auspice (which populates the displayed values
   * based upon the tree)
   */
  filters?: string[];
  frequencies?: any;
  /**
   * Genome annotations (e.g. genes), relative to the reference genome
   */
  genomeAnnotations?: GenomeAnnotations;
  /**
   * The available options for the geographic resolution dropdown, and their lat/long
   * information
   */
  geoResolutions?: GeoResolution[];
  /**
   * Who maintains this dataset?
   */
  maintainers?: Maintainer[];
  /**
   * Which panels should Auspice display?
   */
  panels: Panel[];
  /**
   * Auspice displays this at the top of the page
   */
  title?: string;
  /**
   * The name of the tree (e.g. segment name), if applicable
   */
  treeName?: string;
  /**
   * Auspice displays this (currently only in the footer)
   */
  updated: string;
}

/**
 * Each object here is an indiviual coloring, which will populate the sidebar dropdown in
 * auspice
 */
export interface Coloring {
  /**
   * They key used to access the value of this coloring on each node
   */
  key: string;
  /**
   * Provided mapping between trait values & hex values
   */
  scale?: Array<string[]>;
  /**
   * Text to be displayed in the "color by" dropdown and the tree legend
   */
  title?: string;
  /**
   * Dictates how the color scale should be constructed
   */
  type: Type;
}

/**
 * Dictates how the color scale should be constructed
 */
export enum Type {
  Boolean = "boolean",
  Categorical = "categorical",
  Continuous = "continuous",
  Ordinal = "ordinal",
}

/**
 * Set the defaults for certain display options in Auspice. All are optional.
 */
export interface DisplayDefaults {
  /**
   * What branch label should be displayed by default.
   */
  branchLabel?: string;
  /**
   * Default color by
   */
  colorBy?: string;
  /**
   * Default tree metric
   */
  distanceMeasure?: DistanceMeasure;
  /**
   * Default geographic resolution
   */
  geoResolution?: string;
  /**
   * Default tree layout
   */
  layout?: Layout;
  /**
   * Should the map be extended / wrapped around. Useful if transmissions are worldwide.
   */
  mapTriplicate?: boolean;
  /**
   * Should transmission lines (if available) be displaye by default
   */
  transmissionLines?: boolean;
}

/**
 * Default tree metric
 */
export enum DistanceMeasure {
  Div = "div",
  NumDate = "num_date",
}

/**
 * Default tree layout
 */
export enum Layout {
  Clock = "clock",
  Radial = "radial",
  Rect = "rect",
  Unrooted = "unrooted",
}

/**
 * Genome annotations (e.g. genes), relative to the reference genome
 */
export interface GenomeAnnotations {
  nuc: Nuc;
}

export interface Nuc {
  /**
   * Gene end position (one-based closed, last position of feature, following GFF format)
   */
  end?: number;
  /**
   * Sequence on which the coordinates below are valid. Could be viral segment, bacterial
   * contig, etc
   */
  seqid?: string;
  /**
   * Gene start position (one-based, following GFF format)
   */
  start?: number;
  /**
   * Positive or negative strand
   */
  strand?: Strand;
  /**
   * Type of the feature. could be mRNA, CDS, or similar
   */
  type?: string;
}

/**
 * Positive or negative strand
 */
export enum Strand {
  Empty = "-",
  Strand = "+",
}

/**
 * Each object here is an indiviual geo resolution
 */
export interface GeoResolution {
  /**
   * The deme names & lat/long info for this geographic resolution
   */
  demes: { [key: string]: any };
  /**
   * Trait key - must be specified on nodes (e.g. 'country')
   */
  key: string;
  /**
   * The title to display in the geo resolution dropdown. Optional -- if not provided then
   * `key` will be used.
   */
  title?: string;
}

export interface Maintainer {
  name: string;
  url?: string;
}

export enum Panel {
  Entropy = "entropy",
  Frequencies = "frequencies",
  Map = "map",
  Tree = "tree",
}

export interface Tree {
  /**
   * attributes associated with the branch from the parent node to this node, such as branch
   * lengths, mutations, support values
   */
  branchAttrs?: BranchAttrs;
  /**
   * Child nodes. Recursive structure. Terminal nodes do not have this property.
   */
  children?: Tree[];
  /**
   * Strain name. Must be unique. No spaces
   */
  name: string;
  /**
   * attributes associated with the node (sequence, date, location) as opposed to changes from
   * one node to another.
   */
  nodeAttrs?: NodeAttrs;
}

/**
 * attributes associated with the branch from the parent node to this node, such as branch
 * lengths, mutations, support values
 */
export interface BranchAttrs {
  /**
   * Node labels
   */
  labels?: any;
  /**
   * Mutations occuring between the parent and this node
   */
  mutations?: Mutations;
}

/**
 * Mutations occuring between the parent and this node
 */
export interface Mutations {
  /**
   * nucelotide mutations
   */
  nuc?: string[];
}

/**
 * attributes associated with the node (sequence, date, location) as opposed to changes from
 * one node to another.
 */
export interface NodeAttrs {
  /**
   * Sequence accession number
   */
  accession?: string;
  /**
   * Author information (terminal nodes only)
   */
  author?: Author;
  /**
   * Node (phylogenetic) divergence
   */
  div?: number;
  hidden?: Hidden;
  numDate?: NumDate;
  /**
   * URL of the sequence (usually https://www.ncbi.nlm.nih.gov/nuccore/...)
   */
  url?: string;
  /**
   * Vaccine information
   */
  vaccine?: any[] | boolean | number | number | null | VaccineObject | string;
}

/**
 * Author information (terminal nodes only)
 */
export interface Author {
  /**
   * Journal title (including year, if applicable)
   */
  journal?: string;
  /**
   * URL link to paper (if available)
   */
  paperURL?: string;
  /**
   * Publication title
   */
  title?: string;
  /**
   * unique value for this publication. Displayed as-is by auspice.
   */
  value: string;
}

export enum Hidden {
  Always = "always",
  Divtree = "divtree",
  Timetree = "timetree",
}

export interface NumDate {
  /**
   * Confidence of the node date
   */
  confidence?: number[];
  value: number;
}

export interface VaccineObject {
  /**
   * When the vaccine was stopped
   */
  endDate?: string;
  /**
   * Vaccine selection date
   */
  selectionDate?: string;
  /**
   * strain used to raise sera (for ???)
   */
  serum?: boolean;
  /**
   * Vaccine usage start date
   */
  startDate?: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
  public static toAuspiceJSONV2JSON(json: string): AuspiceJSONV2JSON {
    return cast(JSON.parse(json), r("AuspiceJSONV2JSON"));
  }

  public static auspiceJSONV2JSONToJson(value: AuspiceJSONV2JSON): string {
    return JSON.stringify(uncast(value, r("AuspiceJSONV2JSON")), null, 2);
  }

  public static toMeta(json: string): Meta {
    return cast(JSON.parse(json), r("Meta"));
  }

  public static metaToJson(value: Meta): string {
    return JSON.stringify(uncast(value, r("Meta")), null, 2);
  }

  public static toColoring(json: string): Coloring {
    return cast(JSON.parse(json), r("Coloring"));
  }

  public static coloringToJson(value: Coloring): string {
    return JSON.stringify(uncast(value, r("Coloring")), null, 2);
  }

  public static toDisplayDefaults(json: string): DisplayDefaults {
    return cast(JSON.parse(json), r("DisplayDefaults"));
  }

  public static displayDefaultsToJson(value: DisplayDefaults): string {
    return JSON.stringify(uncast(value, r("DisplayDefaults")), null, 2);
  }

  public static toGenomeAnnotations(json: string): GenomeAnnotations {
    return cast(JSON.parse(json), r("GenomeAnnotations"));
  }

  public static genomeAnnotationsToJson(value: GenomeAnnotations): string {
    return JSON.stringify(uncast(value, r("GenomeAnnotations")), null, 2);
  }

  public static toNuc(json: string): Nuc {
    return cast(JSON.parse(json), r("Nuc"));
  }

  public static nucToJson(value: Nuc): string {
    return JSON.stringify(uncast(value, r("Nuc")), null, 2);
  }

  public static toGeoResolution(json: string): GeoResolution {
    return cast(JSON.parse(json), r("GeoResolution"));
  }

  public static geoResolutionToJson(value: GeoResolution): string {
    return JSON.stringify(uncast(value, r("GeoResolution")), null, 2);
  }

  public static toMaintainer(json: string): Maintainer {
    return cast(JSON.parse(json), r("Maintainer"));
  }

  public static maintainerToJson(value: Maintainer): string {
    return JSON.stringify(uncast(value, r("Maintainer")), null, 2);
  }

  public static toTree(json: string): Tree {
    return cast(JSON.parse(json), r("Tree"));
  }

  public static treeToJson(value: Tree): string {
    return JSON.stringify(uncast(value, r("Tree")), null, 2);
  }

  public static toBranchAttrs(json: string): BranchAttrs {
    return cast(JSON.parse(json), r("BranchAttrs"));
  }

  public static branchAttrsToJson(value: BranchAttrs): string {
    return JSON.stringify(uncast(value, r("BranchAttrs")), null, 2);
  }

  public static toMutations(json: string): Mutations {
    return cast(JSON.parse(json), r("Mutations"));
  }

  public static mutationsToJson(value: Mutations): string {
    return JSON.stringify(uncast(value, r("Mutations")), null, 2);
  }

  public static toNodeAttrs(json: string): NodeAttrs {
    return cast(JSON.parse(json), r("NodeAttrs"));
  }

  public static nodeAttrsToJson(value: NodeAttrs): string {
    return JSON.stringify(uncast(value, r("NodeAttrs")), null, 2);
  }

  public static toAuthor(json: string): Author {
    return cast(JSON.parse(json), r("Author"));
  }

  public static authorToJson(value: Author): string {
    return JSON.stringify(uncast(value, r("Author")), null, 2);
  }

  public static toNumDate(json: string): NumDate {
    return cast(JSON.parse(json), r("NumDate"));
  }

  public static numDateToJson(value: NumDate): string {
    return JSON.stringify(uncast(value, r("NumDate")), null, 2);
  }

  public static toVaccineObject(json: string): VaccineObject {
    return cast(JSON.parse(json), r("VaccineObject"));
  }

  public static vaccineObjectToJson(value: VaccineObject): string {
    return JSON.stringify(uncast(value, r("VaccineObject")), null, 2);
  }
}

function invalidValue(typ: any, val: any, key: any = ""): never {
  if (key) {
    throw Error(
      `Invalid value for key "${key}". Expected type ${JSON.stringify(
        typ
      )} but got ${JSON.stringify(val)}`
    );
  }
  throw Error(
    `Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`
  );
}

function jsonToJSProps(typ: any): any {
  if (typ.jsonToJS === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.json] = { key: p.js, typ: p.typ }));
    typ.jsonToJS = map;
  }
  return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
  if (typ.jsToJSON === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.js] = { key: p.json, typ: p.typ }));
    typ.jsToJSON = map;
  }
  return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ""): any {
  function transformPrimitive(typ: string, val: any): any {
    if (typeof typ === typeof val) return val;
    return invalidValue(typ, val, key);
  }

  function transformUnion(typs: any[], val: any): any {
    // val must validate against one typ in typs
    const l = typs.length;
    for (let i = 0; i < l; i++) {
      const typ = typs[i];
      try {
        return transform(val, typ, getProps);
      } catch (_) {}
    }
    return invalidValue(typs, val);
  }

  function transformEnum(cases: string[], val: any): any {
    if (cases.indexOf(val) !== -1) return val;
    return invalidValue(cases, val);
  }

  function transformArray(typ: any, val: any): any {
    // val must be an array with no invalid elements
    if (!Array.isArray(val)) return invalidValue("array", val);
    return val.map((el) => transform(el, typ, getProps));
  }

  function transformDate(val: any): any {
    if (val === null) {
      return null;
    }
    const d = new Date(val);
    if (isNaN(d.valueOf())) {
      return invalidValue("Date", val);
    }
    return d;
  }

  function transformObject(
    props: { [k: string]: any },
    additional: any,
    val: any
  ): any {
    if (val === null || typeof val !== "object" || Array.isArray(val)) {
      return invalidValue("object", val);
    }
    const result: any = {};
    Object.getOwnPropertyNames(props).forEach((key) => {
      const prop = props[key];
      const v = Object.prototype.hasOwnProperty.call(val, key)
        ? val[key]
        : undefined;
      result[prop.key] = transform(v, prop.typ, getProps, prop.key);
    });
    Object.getOwnPropertyNames(val).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        result[key] = transform(val[key], additional, getProps, key);
      }
    });
    return result;
  }

  if (typ === "any") return val;
  if (typ === null) {
    if (val === null) return val;
    return invalidValue(typ, val);
  }
  if (typ === false) return invalidValue(typ, val);
  while (typeof typ === "object" && typ.ref !== undefined) {
    typ = typeMap[typ.ref];
  }
  if (Array.isArray(typ)) return transformEnum(typ, val);
  if (typeof typ === "object") {
    return typ.hasOwnProperty("unionMembers")
      ? transformUnion(typ.unionMembers, val)
      : typ.hasOwnProperty("arrayItems")
      ? transformArray(typ.arrayItems, val)
      : typ.hasOwnProperty("props")
      ? transformObject(getProps(typ), typ.additional, val)
      : invalidValue(typ, val);
  }
  // Numbers can be parsed by Date but shouldn't be.
  if (typ === Date && typeof val !== "number") return transformDate(val);
  return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
  return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
  return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
  return { arrayItems: typ };
}

function u(...typs: any[]) {
  return { unionMembers: typs };
}

function o(props: any[], additional: any) {
  return { props, additional };
}

function m(additional: any) {
  return { props: [], additional };
}

function r(name: string) {
  return { ref: name };
}

const typeMap: any = {
  AuspiceJSONV2JSON: o(
    [
      { json: "meta", js: "meta", typ: r("Meta") },
      { json: "tree", js: "tree", typ: r("Tree") },
      { json: "version", js: "version", typ: "" },
    ],
    false
  ),
  Meta: o(
    [
      { json: "build_url", js: "buildURL", typ: u(undefined, "") },
      {
        json: "colorings",
        js: "colorings",
        typ: u(undefined, a(r("Coloring"))),
      },
      { json: "description", js: "description", typ: u(undefined, "") },
      {
        json: "display_defaults",
        js: "displayDefaults",
        typ: u(undefined, r("DisplayDefaults")),
      },
      { json: "filters", js: "filters", typ: u(undefined, a("")) },
      { json: "frequencies", js: "frequencies", typ: u(undefined, "any") },
      {
        json: "genome_annotations",
        js: "genomeAnnotations",
        typ: u(undefined, r("GenomeAnnotations")),
      },
      {
        json: "geo_resolutions",
        js: "geoResolutions",
        typ: u(undefined, a(r("GeoResolution"))),
      },
      {
        json: "maintainers",
        js: "maintainers",
        typ: u(undefined, a(r("Maintainer"))),
      },
      { json: "panels", js: "panels", typ: a(r("Panel")) },
      { json: "title", js: "title", typ: u(undefined, "") },
      { json: "tree_name", js: "treeName", typ: u(undefined, "") },
      { json: "updated", js: "updated", typ: "" },
    ],
    false
  ),
  Coloring: o(
    [
      { json: "key", js: "key", typ: "" },
      { json: "scale", js: "scale", typ: u(undefined, a(a(""))) },
      { json: "title", js: "title", typ: u(undefined, "") },
      { json: "type", js: "type", typ: r("Type") },
    ],
    "any"
  ),
  DisplayDefaults: o(
    [
      { json: "branch_label", js: "branchLabel", typ: u(undefined, "") },
      { json: "color_by", js: "colorBy", typ: u(undefined, "") },
      {
        json: "distance_measure",
        js: "distanceMeasure",
        typ: u(undefined, r("DistanceMeasure")),
      },
      { json: "geo_resolution", js: "geoResolution", typ: u(undefined, "") },
      { json: "layout", js: "layout", typ: u(undefined, r("Layout")) },
      { json: "map_triplicate", js: "mapTriplicate", typ: u(undefined, true) },
      {
        json: "transmission_lines",
        js: "transmissionLines",
        typ: u(undefined, true),
      },
    ],
    false
  ),
  GenomeAnnotations: o([{ json: "nuc", js: "nuc", typ: r("Nuc") }], false),
  Nuc: o(
    [
      { json: "end", js: "end", typ: u(undefined, 3.14) },
      { json: "seqid", js: "seqid", typ: u(undefined, "") },
      { json: "start", js: "start", typ: u(undefined, 3.14) },
      { json: "strand", js: "strand", typ: u(undefined, r("Strand")) },
      { json: "type", js: "type", typ: u(undefined, "") },
    ],
    "any"
  ),
  GeoResolution: o(
    [
      { json: "demes", js: "demes", typ: m("any") },
      { json: "key", js: "key", typ: "" },
      { json: "title", js: "title", typ: u(undefined, "") },
    ],
    false
  ),
  Maintainer: o(
    [
      { json: "name", js: "name", typ: "" },
      { json: "url", js: "url", typ: u(undefined, "") },
    ],
    "any"
  ),
  Tree: o(
    [
      {
        json: "branch_attrs",
        js: "branchAttrs",
        typ: u(undefined, r("BranchAttrs")),
      },
      { json: "children", js: "children", typ: u(undefined, a(r("Tree"))) },
      { json: "name", js: "name", typ: "" },
      {
        json: "node_attrs",
        js: "nodeAttrs",
        typ: u(undefined, r("NodeAttrs")),
      },
    ],
    false
  ),
  BranchAttrs: o(
    [
      { json: "labels", js: "labels", typ: u(undefined, "any") },
      { json: "mutations", js: "mutations", typ: u(undefined, r("Mutations")) },
    ],
    "any"
  ),
  Mutations: o([{ json: "nuc", js: "nuc", typ: u(undefined, a("")) }], false),
  NodeAttrs: o(
    [
      { json: "accession", js: "accession", typ: u(undefined, "") },
      { json: "author", js: "author", typ: u(undefined, r("Author")) },
      { json: "div", js: "div", typ: u(undefined, 3.14) },
      { json: "hidden", js: "hidden", typ: u(undefined, r("Hidden")) },
      { json: "num_date", js: "numDate", typ: u(undefined, r("NumDate")) },
      { json: "url", js: "url", typ: u(undefined, "") },
      {
        json: "vaccine",
        js: "vaccine",
        typ: u(
          undefined,
          u(a("any"), true, 3.14, 0, null, r("VaccineObject"), "")
        ),
      },
    ],
    "any"
  ),
  Author: o(
    [
      { json: "journal", js: "journal", typ: u(undefined, "") },
      { json: "paper_url", js: "paperURL", typ: u(undefined, "") },
      { json: "title", js: "title", typ: u(undefined, "") },
      { json: "value", js: "value", typ: "" },
    ],
    "any"
  ),
  NumDate: o(
    [
      { json: "confidence", js: "confidence", typ: u(undefined, a(3.14)) },
      { json: "value", js: "value", typ: 3.14 },
    ],
    "any"
  ),
  VaccineObject: o(
    [
      { json: "end_date", js: "endDate", typ: u(undefined, "") },
      { json: "selection_date", js: "selectionDate", typ: u(undefined, "") },
      { json: "serum", js: "serum", typ: u(undefined, true) },
      { json: "start_date", js: "startDate", typ: u(undefined, "") },
    ],
    "any"
  ),
  Type: ["boolean", "categorical", "continuous", "ordinal"],
  DistanceMeasure: ["div", "num_date"],
  Layout: ["clock", "radial", "rect", "unrooted"],
  Strand: ["-", "+"],
  Panel: ["entropy", "frequencies", "map", "tree"],
  Hidden: ["always", "divtree", "timetree"],
};
