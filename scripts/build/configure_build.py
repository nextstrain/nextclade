def configure_build(config, shell):
  """
  Configures the build system to prepare for running the build.
  This includes running Cmake and generating the actual build makefiles
  """
  shell(f"""
    conan build --configure \
      --source-folder={config.PROJECT_ROOT_DIR} \
      --build-folder={config.BUILD_DIR} \
      {config.CONANFILE} \
  """, cwd=config.BUILD_DIR)
