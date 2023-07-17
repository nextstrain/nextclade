import os
from setuptools import setup

setup(
        name = "treebuilder-prototype",
        version = 0.1,
        author = "Anna Parker and Richard Neher",
        description = ("tree-builder-prototype"),
        packages=['treebuilder'],
        install_requires = [
            'biopython>=1.67,!=1.77,!=1.78',
            'pandas>=0.17.1',
        ],
        entry_points = {
            "console_scripts": [
                "treebuilder = treebuilder.__main__:main",
            ]
        }
    )