def run_unit_tests(config, shell):
  if config.NEXTALIGN_BUILD_TESTS:
    shell(f""" \
      {config.GTPP} {config.GDB} \
        "{config.BUILD_DIR}/packages/nextalign/tests/nextalign_tests" \
        --gtest_output=xml:{config.PROJECT_ROOT_DIR}/.reports/nextalign_tests.xml \
    """, cwd=f"{config.BUILD_DIR}/packages/nextalign")

  if config.NEXTCLADE_BUILD_TESTS:
    shell(f""" \
      {config.GTPP} {config.GDB} \
        "{config.BUILD_DIR}/packages/nextclade/src/__tests__/nextclade_tests" \
        --gtest_output=xml:{config.PROJECT_ROOT_DIR}/.reports/nextclade_tests.xml \
    """, cwd=f"{config.BUILD_DIR}/packages/nextclade/src/__tests__/")

  if config.NEXTCLADE_CLI_BUILD_TESTS:
    shell(f""" \
      {config.GTPP} {config.GDB} \
        "{config.BUILD_DIR}/packages/nextclade_cli/src/__tests__/nextclade_cli_tests" \
        --gtest_output=xml:{config.PROJECT_ROOT_DIR}/.reports/nextclade_cli_tests.xml \
    """, cwd=f"{config.BUILD_DIR}/packages/nextclade_cli/src/__tests__")
