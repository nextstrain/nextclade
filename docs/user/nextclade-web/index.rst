================================================================================
Nextclade Web
================================================================================

Nextclade Web is available online at `clades.nextstrain.org <https://clades.nextstrain.org>`_. This is the easiest way of using Nextclade and is the recommended way to get started.

The application accepts sequence data in `FASTA <https://en.wikipedia.org/wiki/FASTA_format>`_ format, performs alignment, mutation calling, clade assignment, phylogenetic placement and quality control checks and displays the results in tabular form and as a phylogenetic tree. The results can also be downloaded as files, for further review and analysis.

Nextclade is built for quick feedback. The entire analysis, depending on the number of sequences to be processed, takes only a few seconds to a minute.

Despite being made in the form of a website, Nextclade runs its processing entirely offline, on your own computer. The algorithms are executed within your browser and the data never leaves your computer (i.e. no data upload is happening). Nextclade however still needs internet access to download its own modules and dataset files.


  💡 Nextclade Web is suitable for analyzing of small batches of sequences, at most a few hundreds at a time. For large-scale analysis and for integration into bioinformatics pipelines try `Nextclade CLI <nextclade-cli>`_.


..  toctree::
    :titlesonly:
    :maxdepth: 2

    getting-started
    analysis-results-table
    phylogenetic-tree-view
    export
    performance-tips
    url-parameters
