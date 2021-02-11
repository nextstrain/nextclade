Set-PSDebug -Trace 1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PSDefaultParameterValues['*:ErrorAction']='Stop'
function ThrowOnNativeFailure {
    if (-not $?)
    {
        throw 'Native Failure'
    }
}

$THIS_DIR="$PSScriptRoot" -replace "\\", "/"

$PROJECT_ROOT_DIR="$THIS_DIR/.."
$BUILD_DIR="$PROJECT_ROOT_DIR/.build/Release"
$INSTALL_DIR="$PROJECT_ROOT_DIR/.out"

$env:CONAN_USER_HOME="$PROJECT_ROOT_DIR/.cache"

$CMAKE_BUILD_TYPE="Release"
$NEXTALIGN_STATIC_BUILD=1

conan profile new default --detect --force
ThrowOnNativeFailure

conan remote add bincrafters https://api.bintray.com/conan/bincrafters/public-conan --force
ThrowOnNativeFailure

pushd "$PROJECT_ROOT_DIR/3rdparty/tbb"
conan create . local/stable -s build_type="$CMAKE_BUILD_TYPE" -o shared=False --profile "$PROJECT_ROOT_DIR/config/conan/clang-cl.txt"
ThrowOnNativeFailure
popd

mkdir "$BUILD_DIR" -ea 0
pushd "$BUILD_DIR"

conan install "$PROJECT_ROOT_DIR" -s build_type="$CMAKE_BUILD_TYPE" -o tbb:shared=False -o boost:header_only=True --build missing  --profile "$PROJECT_ROOT_DIR/config/conan/clang-cl.txt"
ThrowOnNativeFailure

cmake $PROJECT_ROOT_DIR `
-G "Visual Studio 16 2019" -A "x64" -T "ClangCl" `
-DCMAKE_MODULE_PATH="$BUILD_DIR" `
-DCMAKE_INSTALL_PREFIX="$INSTALL_DIR" `
-DCMAKE_EXPORT_COMPILE_COMMANDS=1 `
-DCMAKE_BUILD_TYPE="$CMAKE_BUILD_TYPE" `
-DNEXTALIGN_STATIC_BUILD="$NEXTALIGN_STATIC_BUILD" `
-DNEXTALIGN_BUILD_BENCHMARKS=0 `
-DNEXTALIGN_BUILD_TESTS=0
ThrowOnNativeFailure

cmake --build "$BUILD_DIR" --config "$CMAKE_BUILD_TYPE" --parallel
ThrowOnNativeFailure

Get-ChildItem "$BUILD_DIR"
ThrowOnNativeFailure

cmake --install "$BUILD_DIR" --config "$CMAKE_BUILD_TYPE" --strip
ThrowOnNativeFailure

Get-ChildItem "$INSTALL_DIR/bin"
ThrowOnNativeFailure

popd
