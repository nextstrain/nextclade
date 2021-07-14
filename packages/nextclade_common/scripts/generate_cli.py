#!/usr/bin/env python3

"""

Generates a .cpp and a .h file running CLI parser, according to a JSON file describing CLI options

"""

import argparse
import json
import os

THIS_DIR = os.path.normpath(os.path.dirname(__file__))
PROJECT_ROOT_DIR = os.path.normpath(os.path.join(THIS_DIR, "..", "..", ".."))
THIS_SCRIPT_REL = os.path.relpath(__file__, PROJECT_ROOT_DIR)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generates C++ code of the command-line interface described by the JSON file")
    parser.add_argument(
        "--input_json",
        required=True,
        help="Path to the input JSON file describing the CLI.")
    parser.add_argument(
        "--output_cpp",
        required=True,
        help="Path where to put the generated .cpp file."
    )
    parser.add_argument(
        "--output_h",
        required=True,
        help="Path where to put the generated .h file."
    )
    return parser.parse_args()


COMMON_FLAGS = [
    {
        "flags": ["--verbosity"],
        "desc": "Set minimum verbosity level of console output. Possible values are: silent, error, warn, info, debug",
        "cppName": "verbosity",
        "cppType": "std::string",
        "defaultValue": "\"warn\"",
        "isOptional": True
    },
    {
        "flags": ["--verbose"],
        "desc": "Increase verbosity of the console output. Same as --verbosity=info",
        "cppName": "verbose",
        "cppType": "bool",
        "defaultValue": "false",
        "isOptional": True
    },
    {
        "flags": ["--silent"],
        "desc": "Disable console output entirely. --verbosity=silent",
        "cppName": "silent",
        "cppType": "bool",
        "defaultValue": "false",
        "isOptional": True
    }
]

##########

H_HEADING = """
#pragma once

#include "../io/Logger.h"
#include <string>
#include <CLI/CLI.hpp>

namespace Nextclade {

"""

##########

H_FOOTER = """

int parseCommandLine(int argc, char* argv[], const std::string& appDescription, const CliCallbacks& callbacks, const CliParamsAll& defaults);

}// namespace Nextclade

"""

##########

CPP_HEADING = """
#include "cli.h"
#include <string>
#include <CLI/CLI.hpp>

namespace Nextclade {

  int parseCommandLine(int argc, char* argv[], const std::string& appDescription, const CliCallbacks& callbacks, const CliParamsAll& defaults) {

    auto app = CLI::App(appDescription);
    auto* root = &app;

    // Allows to avoid running root command is any of the subcommands ran
    auto hasRanSubcommand = std::make_shared<bool>(false);
"""

##########

CPP_FOOTER = """

    CLI11_PARSE(app, argc, argv);

    return 0;
}


}// namespace Nextclade

"""


def add_common_flags(command):
    """
    Options that are valid for all subcommands
    """

    if "options" in command:
        command["options"] = command.get("options", []) + COMMON_FLAGS
    return command


def generate_header_file_callbacks_recursive(parent, command, h):
    """
    Generates a struct with callbacks, one callback for each subcommand.
    These callbacks are called when user issues a subcommand.
    """
    if parent is None:
        h += "struct CliCallbacks {\n"

    callback_name = command.get("callbackName", None)
    if callback_name is not None:
        struct_name = command.get("cppStructName", None)
        h += f"std::function<void(const std::shared_ptr<{struct_name}>&)> {callback_name};\n"

    for subcommand in command.get("subcommands", []):
        h = generate_header_file_callbacks_recursive("<not root>", subcommand, h)

    if parent is None:
        h += "};\n\n"

    return h


def generate_header_file_types_recursive(parent, command, h):
    command = add_common_flags(command.copy())

    command_name = command["name"]
    command_desc = command["desc"]
    struct_name = command.get("cppStructName", None)

    for subcommand in command.get("subcommands", []):
        h = generate_header_file_types_recursive(command_name, subcommand, h)

    options = command.get("options", [])
    if len(options) > 0 and struct_name is not None:
        h += f"""
        // Parameters for command "{command_name}": {command_desc}
        struct {struct_name} {{"""

    for option in options:
        desc = option["desc"]
        cpp_name = option["cppName"]
        cpp_type = option["cppType"]

        h += f"""{cpp_type} {cpp_name};
        """

    # for subcommand in command.get("subcommands", []):
    #     subcommand_type = subcommand["cppStructName"]
    #     subcommand_name = subcommand["name"]
    #     h += f"""{subcommand_type} {subcommand_name};"""

    if len(options) > 0:
        h += "};\n\n"

    return h


def generate_header_file_main_type_recursive(parent, command, h):
    """
    Generates a struct with callbacks, one callback for each subcommand.
    These callbacks are called when user issues a subcommand.
    """
    if parent is None:
        h += "struct CliParamsAll {\n"

    command_name = command.get("name", None)
    struct_name = command.get("cppStructName", None)
    if command_name is not None and struct_name is not None:
        h += f"{struct_name} {command_name};\n"

    for subcommand in command.get("subcommands", []):
        h = generate_header_file_main_type_recursive("<not root>", subcommand, h)

    if parent is None:
        h += "};\n\n"

    return h


def generate_cpp_code_recursive(parent, parents, command, cpp):
    command = add_common_flags(command.copy())

    command_name = command["name"]
    command_desc = command["desc"]
    struct_name = command.get("cppStructName", None)

    params_var_name = f"{command_name}Params"

    cpp += f"""// {command_name}: {command_desc}
    """

    if parent is not None:
        cpp += f"""auto* {command_name} = {parent}->add_subcommand("{command_name}", "{command_desc}");
        """

        require_subcommand = command.get("requireSubcommand", 0)
        if require_subcommand > 0:
            cpp += f"""{command_name}->require_subcommand(0, {require_subcommand});
            """

        if parent != "root":
            parents.append(parent)

    if struct_name is not None:
        cpp += f"""
        auto {params_var_name} = std::make_shared<{struct_name}>();
        """

    for option in command.get("options", []):
        flags = option["flags"]
        desc = option["desc"]
        cpp_name = option["cppName"]
        cpp_type = option["cppType"]
        is_optional = option["isOptional"]
        default_value = option.get("defaultValue", f"defaults.{command_name}.{cpp_name}")

        flags_joined = ",".join(flags)

        required = ""
        if not is_optional:
            required = "->required()"

        if cpp_type == "bool":
            cpp += f"""
            {params_var_name}->{cpp_name} = {default_value};
            {command_name}->add_flag("{flags_joined}", {params_var_name}->{cpp_name}, "{desc}"){required};
            """
        else:
            cpp += f"""
            {params_var_name}->{cpp_name} = {default_value};
            {command_name}->add_option("{flags_joined}", {params_var_name}->{cpp_name}, "{desc}"){required}->capture_default_str();
            """

    cpp += "\n\n"

    for subcommand in command.get("subcommands", []):
        cpp = generate_cpp_code_recursive(command_name, parents.copy(), subcommand, cpp)

    callback_name = command.get("callbackName", None)
    if callback_name is not None:

        callback_body = f"callbacks.{callback_name}({params_var_name});"
        if command_name == "root":
            callback_body = f"""
                // only run root callback if none of the commands ran
                if(!*hasRanSubcommand) {{
                    {callback_body}
                }}
            """
        else:
            callback_body = f"""
                {callback_body}
                // only run root callback if none of the commands ran
                *hasRanSubcommand = true;
            """

        cpp += f"""
        {command_name}->callback([{params_var_name}, &callbacks, hasRanSubcommand]() {{
          {callback_body}
        }});
        """

    cpp += "\n\n"

    return cpp


def generate_code(command):
    cpp = ""
    h = ""

    parent = None
    h = generate_header_file_types_recursive(parent, command, h)

    parent = None
    h = generate_header_file_callbacks_recursive(parent, command, h)

    parent = None
    h = generate_header_file_main_type_recursive(parent, command, h)

    parent = None
    parents = []
    cpp = generate_cpp_code_recursive(parent, parents, command, cpp)
    return cpp, h


def generate_comment(input_json):
    desc_json = os.path.relpath(input_json, PROJECT_ROOT_DIR)

    return \
        f"""
/*
 * !!! AUTOMATICALLY GENERATED CODE !!!
 *
 * This file is autogenerated during build by
 *   {THIS_SCRIPT_REL}
 * using description in
 *   {desc_json}
 *
 * Do not edit this file. All manual edits will be overwritten!
 * Instead, edit {desc_json} and rebuild
 * (which will run {THIS_SCRIPT_REL}
 * and will generate this file)
 */
"""


def main():
    args = parse_args()

    with open(args.input_json, "r") as f:
        command = json.load(f)

    comment = generate_comment(args.input_json)
    cpp, h = generate_code(command)

    os.makedirs(os.path.dirname(args.output_cpp), exist_ok=True)
    with open(args.output_cpp, "w") as f:
        f.write(f"{comment}\n\n{CPP_HEADING}\n{cpp}\n{CPP_FOOTER}")

    os.makedirs(os.path.dirname(args.output_h), exist_ok=True)
    with open(args.output_h, "w") as f:
        f.write(f"{comment}\n\n{H_HEADING}\n{h}\n{H_FOOTER}")


if __name__ == '__main__':
    main()
