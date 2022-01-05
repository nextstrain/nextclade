def run_build(config, shell):
  """
  Runs the build. Compiles and links the binaries.
  In release mode it also installs the binaries into the install dir.
  """
  shell(f"""
    conan build --build {config.PROJECT_ROOT_DIR} \
      --source-folder={config.PROJECT_ROOT_DIR} \
      --build-folder={config.BUILD_DIR} \
  """, cwd=config.BUILD_DIR)
