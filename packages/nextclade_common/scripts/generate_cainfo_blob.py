#!/usr/bin/env python3

"""

Generates a .h file with the contents of the .pem cert as string

"""

import argparse
import json
import os
import urllib.request
import urllib.parse

THIS_DIR = os.path.normpath(os.path.dirname(__file__))
PROJECT_ROOT_DIR = os.path.normpath(os.path.join(THIS_DIR, "..", "..", ".."))
THIS_SCRIPT_REL = os.path.relpath(__file__, PROJECT_ROOT_DIR)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generates C++ code of the command-line interface described by the JSON file")
    parser.add_argument(
        "--input_pem",
        required=True,
        help="Path to the input PEM file.")

    parser.add_argument(
        "--output_h",
        required=True,
        help="Path where to put the generated .h file."
    )
    return parser.parse_args()


def main():
    args = parse_args()

    with open(args.input_pem, "r") as f:
        pem = f.read()

    # Can be downloaded like this. Updates once every couple of months.
    # url = 'https://curl.haxx.se/ca/cacert.pem'
    # pem = urllib.request.urlopen(url).read().decode('utf-8')

    os.makedirs(os.path.dirname(args.output_h), exist_ok=True)
    with open(args.output_h, "w") as f:
        f.write(
            f"""
// Not all Linux distributions have CA certificates setup consistently. Individual systems can also be misconfigured.
// For example CentOS 7 gives an error 'Problem with the SSL CA cert (path? access rights?)'.
// To mitigate this, we provide libcurl with a custom CA certificate blob, to override system certs. The variable below 
// contains this blob. The content is the curl's PEM CA cert file.
// See: https://curl.se/docs/caextract.html
inline const char* cainfo_blob = R\"({pem})\";
"""
        )


if __name__ == '__main__':
    main()
