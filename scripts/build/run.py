import os


def run(config, shell):
  if config.NEXTALIGN_BUILD_CLI:
    shell(f"eval {config.GDB} {config.NEXTALIGN_CLI_EXE} {config.NEXTALIGN_CLI_ARGS}")

  if config.NEXTCLADE_BUILD_CLI:
    if not os.path.exists(os.path.join(config.DATA_DIR, "tree.json")):
      shell(f"""
        eval {config.GDB} \
        {config.NEXTCLADE_CLI_EXE} dataset get --name='sars-cov-2' --output-dir='{config.DATA_DIR}'
      """)

    shell(f"{config.GDB} {config.NEXTCLADE_CLI_EXE} {config.NEXTCLADE_CLI_ARGS}")
