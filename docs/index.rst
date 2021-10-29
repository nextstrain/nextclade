================================================================================
Nextclade: analysis of viral genetic sequences
================================================================================

Nextclade is an open-source project for viral genome alignment, mutation calling, clade assignment, quality checks and phylogenetic placement.

Nextclade consists of a set of related tools:

 - Nextclade Web - a web application available online at `clades.nextstrain.org <https://clades.nextstrain.org>`_
 - Nextclade CLI - a command-line tool that mimics Nextclade Web
 - Nextalign CLI - a command-line tool which is similar to Nextclade CLI, but performs only the alignment, without further analysis


All tools are powered by the same algorithms, they consume the same inputs and produce the same outputs, but they differ in the user interface, the amount of features included and the degree of customization. It is recommended to start with Nextclade Web and later proceed to CLI tools if you have more advanced use-cases (for example, repeated batch processing, bioinformatics pipelines).

Nextclade is a part of `Nextstrain <https://nextstrain.org>`_, an open-source project to harness the scientific and public health potential of pathogen genome data. All source code is available on `GitHub <https://github.com/nextstrain/nextclade>`_.


..  note::

  **Referring to Nextclade in a publication**

  If you use results obtained with Nextclade in a publication, please

  - cite our preprint:

      Ivan Aksamentov, Cornelius Roemer, Emma B Hodcroft, & Richard A Neher. (2021). Nextclade: clade assignment, mutation calling and quality control for viral genomes. https://doi.org/10.5281/zenodo.5607694

    `bibtex <https://zenodo.org/record/5607694/export/hx>`_

  - where possible, provide a link to Nextclade Web:

      https://clades.nextstrain.org


..  note::
  Do you find Nextclade useful? Tell us about your use-case and experience with it.

  For a general conversation, feel free to join Nextstrain Discussion at `discussion.nextstrain.org <https://discussion.nextstrain.org>`_.

  If you want to report an error or request a new feature, please open a new `Github Issue <https://github.com/nextstrain/nextclade/issues/new>`_ (despite the name, "Github Issues" can be about anything, not only problems).


..  toctree::
    :maxdepth: 2
    :caption: Table of contents

    Home <self>

    user/nextclade-web
    user/nextclade-cli
    user/nextalign-cli
    user/datasets

    user/input-files
    user/output-files

    user/algorithm/index
    user/faq
    user/terminology

    changes/index
