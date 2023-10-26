================================================================================
Nextclade: analysis of viral genetic sequences
================================================================================

..  note::

  If you are migrating from Nextclade v2 to Nextclade v3, please read our `Nextclade v3 migration guide <./user/migration-v3.html>`_


Nextclade is an open-source project for viral genome alignment, mutation calling, clade assignment, quality checks and phylogenetic placement.

Nextclade consists of a set of related tools:

- Nextclade Web - a web application available online at `clades.nextstrain.org <https://clades.nextstrain.org>`_
- Nextclade CLI - a command-line tool


Both tools are powered by the same algorithms, they consume the same inputs and produce the same outputs, but they differ in the user interface, the amount of features included and the degree of customization. It is recommended to start with Nextclade Web and later proceed to CLI tools if you have more advanced use-cases (for example, repeated batch processing, bioinformatics pipelines).

Nextclade is a part of `Nextstrain <https://nextstrain.org>`_, an open-source project to harness the scientific and public health potential of pathogen genome data. All source code is available on `GitHub <https://github.com/nextstrain/nextclade>`_.

..  note::

  **Referring to Nextclade in a publication**

  If you use results obtained with Nextclade in a publication, please

  - cite our paper:

      Aksamentov, I., Roemer, C., Hodcroft, E. B., & Neher, R. A., (2021). Nextclade: clade assignment, mutation calling and quality control for viral genomes. Journal of Open Source Software, 6(67), 3773, https://doi.org/10.21105/joss.03773

    `bibtex <https://clades.nextstrain.org/citation.bib>`_

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

    user/migration-v3

    user/nextclade-web
    user/nextclade-cli/index

    user/datasets
    user/input-files/index
    user/output-files/index

    user/algorithm/index

    user/links
    user/faq
    user/terminology

    changes/index
