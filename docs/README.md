# Nextclade documentation

This is the Readthedocs subproject for docs.nextstrain.org. More details:
 - https://github.com/nextstrain/docs.nextstrain.org
 - https://docs.nextstrain.org

## Building the docs with Docker (recommended)

Once you have [Docker](https://docs.docker.com/get-docker/) installed, run from the root of the project:

    make docker-html

The HTML files will appear in `docs/build/html/` (for manual inspection) and served on `http://localhost:8000`. The package `sphinx-autobuild` will watch the files, rebuild the HTML and reload the page in the browser on changes. 


## Building the docs locally

Build dependencies are managed with [Conda](https://conda.io).

Enter the docs directory:

    cd docs

Install them into an isolated environment named `docs.clades.nextstrain.org` with:

    conda env create

Enter the environment with:

    conda activate docs.clades.nextstrain.org

You can now build the documentation with:

    make html

which invokes Sphinx to build static HTML pages in `docs/build/html/`.

On some platforms you can view them in the default browser by running:

    open build/html/index.html

or

    xdg-open build/html/index.html


Alternatively, you can run

    make autobuild

The HTML files will also appear in `docs/build/html/` (for manual inspection) and served on `http://localhost:8000`. The `sphinx-autobuild` will watch the files, rebuild the HTML and reload the page in the browser on changes.

Leave the environment with:

    conda deactivate
