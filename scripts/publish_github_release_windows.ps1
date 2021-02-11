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

$THIS_DIR="$PSScriptRoot"

$PROJECT_ROOT_DIR="$THIS_DIR/.."
$BUILD_DIR="$PROJECT_ROOT_DIR/.build/Release"
$INSTALL_DIR="$PROJECT_ROOT_DIR/.out"


Start-BitsTransfer `
-Source https://github.com/tcnksm/ghr/releases/download/v0.13.0/ghr_v0.13.0_windows_amd64.zip `
-Destination ghr_v0.13.0_windows_amd64.zip

ThrowOnNativeFailure


Expand-Archive ghr_v0.13.0_windows_amd64.zip

ThrowOnNativeFailure


Get-ChildItem .

Get-ChildItem $BUILD_DIR

Get-ChildItem $INSTALL_DIR
