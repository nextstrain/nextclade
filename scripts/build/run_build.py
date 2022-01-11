def run_build(config, shell):
  """
  Runs the build. Compiles and links the binaries.
  In release mode it also installs the binaries into the install dir.
  """
  shell(f"""
    conan build --build \
      --source-folder={config.PROJECT_ROOT_DIR} \
      --build-folder={config.BUILD_DIR} \
      {config.CONANFILE} \
  """, cwd=config.BUILD_DIR)
