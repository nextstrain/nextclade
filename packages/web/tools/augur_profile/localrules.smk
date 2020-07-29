localrules: filter, partition_sequences, aggregate_alignments, mask, adjust_metadata_regions, clades, colors, recency, export, incorporate_travel_history, fix_colorings, all_regions, export_all_regions, export_gisaid, incorporate_travel_history_gisaid, incorporate_travel_history_zh, export_zh, dated_json, fix_colorings_zh, fix_colorings_gisaid, finalize, pangolin, rename_legacy_clades, adjust_metadata_regions_ecdc, reassign_metadata, export_nextclade

ruleorder: export_nextclade>finalize

rule export_nextclade:
    message: "Exporting data files for for auspice"
    input:
        tree = rules.refine.output.tree,
        metadata = _get_metadata_by_wildcards,
        node_data = [ rules.refine.output.node_data,
                      rules.ancestral.output.node_data,
                      rules.translate.output.node_data,
                      rules.rename_subclades.output.clade_data,
                      rules.clades.output.clade_data,
                    ],
        auspice_config = lambda w: config["builds"][w.build_name]["auspice_config"] if "auspice_config" in config["builds"][w.build_name] else config["files"]["auspice_config"],
        colors = lambda w: config["builds"][w.build_name]["colors"] if "colors" in config["builds"][w.build_name] else ( config["files"]["colors"] if "colors" in config["files"] else rules.colors.output.colors.format(**w) ),
        description = config["files"]["description"]
    output:
        auspice_json = "auspice/ncov_{build_name}.json",
    log:
        "logs/export_{build_name}.txt"
    params:
        title = export_title
    conda: config["conda_environment"]
    shell:
        """
        augur export v2 \
            --tree {input.tree} \
            --metadata {input.metadata} \
            --node-data {input.node_data} \
            --auspice-config {input.auspice_config} \
            --colors {input.colors} \
            --title {params.title:q} \
            --description {input.description} \
            --output {output.auspice_json} 2>&1 | tee {log}
        """
