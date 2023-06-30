#!/usr/bin/env bash

set -euxo pipefail
trap "exit" INT

# Directory where this script resides
THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Where the source code is
PROJECT_ROOT_DIR="$(realpath "${THIS_DIR}/..")"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

export PROD_ENABLE_TYPE_CHECKS=0
export PROD_ENABLE_ESLINT=0
export PROD_ENABLE_STYLELINT=0

# Vercel seems to be currently using VMs provisioned with Amazon Linux 2, which is a derivative of RHEL 7,
# If something breaks, perhaps they've changed things.
cat /etc/os-release
cat /etc/image-id
cat /etc/system-release
echo "RHEL version: $(rpm -E '%{rhel}' || echo 'unknown')"

nproc
cat /proc/cpuinfo

# Remove some dead symlinks which cause log pollution
rm -f /lib64/libvips-cpp.so.42
rm -f /lib64/libvips.so.42

# Disable yum fastestmirror plugin. It only makes things slower.
printf "[main]\nenabled=0\n" >"/etc/yum/pluginconf.d/fastestmirror.conf"

yum install -y -q \
  gzip \
  tar \
  xz

# Remove some dead symlinks which cause log pollution
rm -f /lib64/libvips-cpp.so.42
rm -f /lib64/libvips.so.42

# Vercel caches `node_modules/`, so let's put our caches there
export CACHE_DIR="${PROJECT_ROOT_DIR}/node_modules/.cache"

function symlink_to_cache() {
  target_dir_rel="${1}"
  if [ -e "${CACHE_DIR}/${target_dir_rel}" ]; then
    mkdir -p "${CACHE_DIR}/${target_dir_rel}"
    ln -sf "${CACHE_DIR}/${target_dir_rel}" "${target_dir_rel}"
  fi
}

export CARGO_HOME="${CACHE_DIR}/.cargo"
export RUSTUP_HOME="${CACHE_DIR}/.rustup"
export CARGO_INSTALL_ROOT="${CARGO_HOME}/install"
export PATH=/usr/lib/llvm-13/bin:${HOME}/.local/bin:${CARGO_HOME}/bin:${CARGO_HOME}/install/bin:/usr/sbin${PATH:+":$PATH"}

symlink_to_cache ".build"
symlink_to_cache ".cache"
symlink_to_cache "packages_rs/nextclade-web/.build/production/tmp"
symlink_to_cache "packages_rs/nextclade-web/.cache"
symlink_to_cache "packages_rs/nextclade-web/node_modules"

# Install rustup and toolchain from rust-toolchain.toml, if not already in the cache
if ! command cargo &>/dev/null; then
  # Install dasel
  DASEL_VERSION="1.22.1"
  curl -fsSL "https://github.com/TomWright/dasel/releases/download/v${DASEL_VERSION}/dasel_linux_amd64" -o "/usr/bin/dasel"
  chmod +x "/usr/bin/dasel"

  RUST_TOOLCHAIN=$(dasel select -p toml -s ".toolchain.channel" -f "rust-toolchain.toml")
  curl -sSf https://sh.rustup.rs >rustup-init
  chmod +x rustup-init
  ./rustup-init -y --no-modify-path --default-toolchain="${RUST_TOOLCHAIN}"
  rustup toolchain install "${HOME}"
  rustup default "${RUST_TOOLCHAIN}"
  rustup target add wasm32-unknown-unknown

  which rustup
  ls -al "$(which rustup)"

  which cargo
  ls -al "$(which cargo)"

  which rustc
  ls -al "$(which rustc)"

  # Install cargo-quickinstall
  export CARGO_QUICKINSTALL_VERSION="0.2.6"
  curl -sSL "https://github.com/alsuren/cargo-quickinstall/releases/download/cargo-quickinstall-${CARGO_QUICKINSTALL_VERSION}-x86_64-unknown-linux-musl/cargo-quickinstall-${CARGO_QUICKINSTALL_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" -xz "cargo-quickinstall"
  chmod +x "${CARGO_HOME}/bin/cargo-quickinstall"

  # Install wasm-bindgen
  export WASM_BINDGEN_CLI_VERSION="0.2.80"
  curl -sSL "https://github.com/rustwasm/wasm-bindgen/releases/download/${WASM_BINDGEN_CLI_VERSION}/wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl/wasm-bindgen"
  chmod +x "${CARGO_HOME}/bin/wasm-bindgen"

  which wasm-bindgen

  # Install wasm-pack
  export WASM_PACK_VERSION="0.10.2"
  curl -sSL "https://github.com/rustwasm/wasm-pack/releases/download/v${WASM_PACK_VERSION}/wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl/wasm-pack"
  chmod +x "${CARGO_HOME}/bin/wasm-pack"

  which wasm-pack
fi

cp ".env.example" ".env"

sed -i'' "s|PROD_ENABLE_TYPE_CHECKS=1|PROD_ENABLE_TYPE_CHECKS=0|g" .env
sed -i'' "s|PROD_ENABLE_ESLINT=1|PROD_ENABLE_ESLINT=0|g" .env
sed -i'' "s|PROD_ENABLE_STYLELINT=1|PROD_ENABLE_STYLELINT=0|g" .env

cd packages_rs/nextclade-web

yarn install --frozen-lockfile

yarn wasm-prod

yarn prod:build

mkdir -p "../../packages/web/.build/production/web"
cp -r ".build/production/web" "../../packages/web/.build/production/"
