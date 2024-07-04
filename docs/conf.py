# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.abspath('.'))

# -- Project information -----------------------------------------------------

project = 'Nextclade'
copyright = f'2020-{datetime.now().year}, Trevor Bedford and Richard Neher'
author = 'The Nextstrain Team'

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
  'myst_parser',
  'sphinx.ext.intersphinx',
  'sphinx.ext.mathjax',
  'sphinx_markdown_tables',
  'sphinxarg.ext',
  'sphinx.ext.autodoc',
  'sphinx_tabs.tabs',
  'nextstrain.sphinx.theme',
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ['templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = [
  "README.md",
  "assets/**",
  "build/**",
  "changes/CHANGELOG.old.md",
  "dev/docs-meta.md",
  "dev/old-versions.md",
]

myst_enable_extensions = [
  "amsmath",
  "dollarmath",
  "linkify",
  "strikethrough",
]
myst_heading_anchors = 6
myst_gfm_only = False  # For math to work. GitHub renders this syntax just fine though.
myst_linkify_fuzzy_links = False
myst_url_schemes = ["mailto", "http", "https"]

suppress_warnings = [
  "myst.header"
]

# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'nextstrain-sphinx-theme'

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']

html_css_files = [
  'css/custom.css',
]

html_favicon = '_static/favicon.ico'

html_theme_options = {
  'logo_only': False,
  'collapse_navigation': False,
  'titles_only': True,
}

# -- Cross-project references ------------------------------------------------

intersphinx_mapping = {
}


# Force full rebuild, including updating static files (such as custom css)
# https://github.com/sphinx-doc/sphinx/issues/2090#issuecomment-572902572
def env_get_outdated(app, env, added, changed, removed):
  return ['index']


def setup(app):
  app.connect('env-get-outdated', env_get_outdated)
