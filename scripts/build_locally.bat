@echo on

pushd 3rdparty\tbb
  conan create . local/stable -s build_type=Release -o shared=False
  if %errorlevel% neq 0 exit /b %errorlevel%
popd

mkdir .build\Release

pushd .build\Release

  set BUILD_DIR=%cd%
  set "BUILD_DIR=%BUILD_DIR:\=/%"

  conan install ..\.. ^
  -s build_type=Release ^
  -o tbb:shared=False ^
  -o boost:header_only=True ^
  --build missing

  rem -G "Visual Studio 15 2017" ^
  rem -DCMAKE_SYSTEM_VERSION=6.1 ^
  rem -DCMAKE_GENERATOR_TOOLSET=v141 ^

  cmake ..\.. ^
  -G "Visual Studio 15 2017" -A "x64" -T "ClangCl" ^
  -DCMAKE_GENERATOR_TOOLSET=v141 ^
  -DCMAKE_MODULE_PATH="%BUILD_DIR%" ^
  -DCMAKE_INSTALL_PREFIX=.out ^
  -DCMAKE_EXPORT_COMPILE_COMMANDS=1 ^
  -DCMAKE_BUILD_TYPE=Release ^
  -DNEXTALIGN_STATIC_BUILD=1 ^
  -DNEXTALIGN_BUILD_BENCHMARKS=0 ^
  -DNEXTALIGN_BUILD_TESTS=0

  cmake --build . --config Release --target ALL_BUILD

  cmake --install . --config Release --strip

popd
