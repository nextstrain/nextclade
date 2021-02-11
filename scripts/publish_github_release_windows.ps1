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

$GHR_VERSION="0.13.0"

$THIS_DIR="$PSScriptRoot"

$PROJECT_ROOT_DIR="$THIS_DIR/.."
$BUILD_DIR="$PROJECT_ROOT_DIR/.build/Release"
$INSTALL_DIR="$PROJECT_ROOT_DIR/.out"


Start-BitsTransfer `
-Source "https://github.com/tcnksm/ghr/releases/download/v${GHR_VERSION}/ghr_v${GHR_VERSION}_windows_amd64.zip" `
-Destination "ghr_v${GHR_VERSION}_windows_amd64.zip"

Expand-Archive "ghr_v${GHR_VERSION}_windows_amd64.zip"

Get-ChildItem .

Get-ChildItem "ghr_v${GHR_VERSION}_windows_amd64"

Move-Item -Path "ghr_v${GHR_VERSION}_windows_amd64\ghr.exe" -Destination . -Force

Get-ChildItem $INSTALL_DIR/bin


$VERSION=Get-Content -Path "packages/nextalign_cli/VERSION"

ghr.exe -t $GITHUB_TOKEN `
-u $CIRCLE_PROJECT_USERNAME `
-r $CIRCLE_PROJECT_REPONAME `
-c $CIRCLE_SHA1 `
-replace "nextalign-${VERSION}" `
"${INSTALL_DIR}/bin"
ThrowOnNativeFailure
