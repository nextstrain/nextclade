localrules: download, export_nextclade, download_metadata, download_filtered

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
		      rules.aa_muts_explicit.output.node_data
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

rule example_data:
    input:
        sequences = rules.download_sequences.output.sequences,
        metadata = rules.download_metadata.output.metadata,
    output:
        sequences = "results/{build_name}/example.fasta"
    log:
        "logs/example_{build_name}.txt"
    params:
        min_length = 20000,
        exclude_where = "genbank_accession='?'",
        min_date = "2020-07-01",
        date = date.today().strftime("%Y-%m-%d")
    shell:
        """
        augur filter \
            --sequences {input.sequences} \
            --metadata {input.metadata} \
            --max-date {params.date} \
            --min-date {params.min_date} \
	    --subsample-max-sequences 50 \
	    --group-by region month \
            --exclude-where {params.exclude_where}\
            --min-length {params.min_length} \
            --output {output.sequences} 2>&1 | tee {log}
        """
