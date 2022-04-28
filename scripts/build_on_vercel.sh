#!/usr/bin/env bash

set -euxo pipefail
trap "exit" INT

# Directory where this script resides
THIS_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  pwd
)"

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

# Vercel seems to be currently using VMs provisioned with Amazon Linux 2, which is a derivative of RHEL 7,
# If something breaks, perhaps they've changed things.
cat /etc/os-release
cat /etc/image-id
cat /etc/system-release
echo "RHEL version: $(rpm -E '%{rhel}' || echo 'unknown')"

# Disable yum fastestmirror plugin. It only makes things slower.
printf "[main]\nenabled=0\n" >"/etc/yum/pluginconf.d/fastestmirror.conf"

#yum clean all
#rm -rf /var/cache/yum/*
#yum makecache
#yum update -y -q
yum install -y -q \
  gzip \
  tar \
  xz

# Remove some dead symlinks which cause log pollution
rm -f /lib64/libvips-cpp.so.42
rm -f /lib64/libvips.so.42

# Vercel caches `node_modules/`, so let's put our caches there
export CACHE_DIR="${PROJECT_ROOT_DIR}/node_modules/.cache"

mkdir -p "${CACHE_DIR}"

export CARGO_HOME="${HOME}/.cargo"
export CARGO_INSTALL_ROOT="${HOME}/.cargo/install"
export RUSTUP_HOME="${HOME}/.rustup"
export PATH=/usr/lib/llvm-13/bin:${HOME}/.local/bin:${HOME}/.cargo/bin:${HOME}/.cargo/install/bin:/usr/sbin${PATH:+":$PATH"}


mkdir -p "${CACHE_DIR}/.cargo"
ln -s "${CACHE_DIR}/.cargo" "${HOME}/.cargo"

mkdir -p "${CACHE_DIR}/.build"
ln -s "${CACHE_DIR}/.build" "target"

# Install dasel
DASEL_VERSION="1.22.1"
curl -fsSL "https://github.com/TomWright/dasel/releases/download/v${DASEL_VERSION}/dasel_linux_amd64" -o "/usr/bin/dasel"
chmod +x "/usr/bin/dasel"

# Install rustup and toolchain from rust-toolchain.toml
RUST_TOOLCHAIN=$(dasel select -p toml -s ".toolchain.channel" -f "rust-toolchain.toml")
curl -sSf https://sh.rustup.rs >rustup-init
chmod +x rustup-init
./rustup-init -y --no-modify-path --default-toolchain="${RUST_TOOLCHAIN}"
rustup toolchain install "${HOME}"
rustup default "${RUST_TOOLCHAIN}"
rustup target add wasm32-unknown-unknown

# Install cargo-quickinstall
export CARGO_QUICKINSTALL_VERSION="0.2.6"
curl -sSL "https://github.com/alsuren/cargo-quickinstall/releases/download/cargo-quickinstall-${CARGO_QUICKINSTALL_VERSION}-x86_64-unknown-linux-musl/cargo-quickinstall-${CARGO_QUICKINSTALL_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" -xz "cargo-quickinstall"
chmod +x "${CARGO_HOME}/bin/cargo-quickinstall"

# Install wasm-bindgen
export WASM_BINDGEN_CLI_VERSION="0.2.80"
curl -sSL "https://github.com/rustwasm/wasm-bindgen/releases/download/${WASM_BINDGEN_CLI_VERSION}/wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl/wasm-bindgen"
chmod +x "${CARGO_HOME}/bin/wasm-bindgen"

# Install wasm-pack
export WASM_PACK_VERSION="0.10.2"
curl -sSL "https://github.com/rustwasm/wasm-pack/releases/download/v${WASM_PACK_VERSION}/wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl/wasm-pack"
chmod +x "${CARGO_HOME}/bin/wasm-pack"

cp ".env.example" ".env"

cd packages_rs/nextclade-web

yarn wasm-prod

yarn install --frozen-lockfile

yarn prod:build

mkdir -p "../../packages/web/.build/production/web"
cp -r ".build/production/web" "../../packages/web/.build/production/"
