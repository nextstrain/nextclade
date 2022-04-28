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

export PATH=/usr/sbin${PATH:+":$PATH"}

# Vercel caches `node_modules/`, so let's put our caches there
export CACHE_DIR="${PROJECT_ROOT_DIR}/node_modules"

# Deps that are not cached
export DEPS_DIR="${PROJECT_ROOT_DIR}/deps"

mkdir -p "${CACHE_DIR}"
mkdir -p "${DEPS_DIR}"

# Vercel seems to be currently using VMs provisioned with Amazon Linux 2, which is a derivative of RHEL 7,
# If something breaks, perhaps they've changed things.
cat /etc/os-release
cat /etc/image-id
cat /etc/system-release
echo "RHEL version: $(rpm -E %{rhel} || echo 'unknown')"

# Disable yum fastestmirror plugin. It only makes things slower.
printf "[main]\nenabled=0\n" >"/etc/yum/pluginconf.d/fastestmirror.conf"

# Remove some dead symlinks which cause log pollution
rm /lib64/libvips-cpp.so.42
rm /lib64/libvips.so.42

# Remove default Python. It does not have SQLite module enabled required for `conan`.
rm -rf /usr/local/bin/python3.6 /usr/local/lib/python3.6
rm -rf /usr/local/lib/python3.9 /usr/local/include/python3.9 /usr/local/bin/python3.9

rm -rf /usr/local/bin/python3

yum clean all

rm -rf /var/cache/yum/*

yum makecache

rpm --rebuilddb

# Add "UIS" repos, with more up-to-date packages (https://ius.io/)
# Python 3.6 from IUS has SQLite enabled.
yum install -y -q \
  "https://repo.ius.io/ius-release-el7.rpm" \
  "https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm"

yum update -y -q

yum update -y -q

yum install -y -q --enablerepo=ius \
  ccache \
  sqlite \
  sqlite-devel \
  python36u python36u-libs python36u-devel python36u-pip \
  xz

# Set Python 3.6 from UIS as  default
alternatives --install /usr/bin/python python /usr/bin/python3.6 60 || true
alternatives --install /usr/bin/python3 python3 /usr/bin/python3.6 60 || true
alternatives --install /usr/local/bin/python3 python3 /usr/bin/python3.6 60 || true
alternatives --install /usr/bin/python3.6 python3.6 /usr/bin/python3.6 60 || true
ln -s /usr/bin/python3.6 /usr/local/bin/python3.6 || true
ln -s /usr/lib/python3.6 /usr/local/lib/python3.6 || true
export PYTHONPATH=/usr/lib/python3.6${PYTHONPATH:+":$PYTHONPATH"}

# Install CMake
curl -fsSL https://github.com/Kitware/CMake/releases/download/v3.16.3/cmake-3.16.3-linux-x86_64.tar.gz | tar xfz - --strip-components=1 -C "${DEPS_DIR}/"
export PATH="${DEPS_DIR}/bin:${PATH}"

DASEL_VERSION="1.22.1"
curl -fsSL "https://github.com/TomWright/dasel/releases/download/v${DASEL_VERSION}/dasel_linux_amd64" -o "/usr/bin/dasel"
chmod +x "/usr/bin/dasel"

export CARGO_HOME="${HOME}/.cargo"
export CARGO_INSTALL_ROOT="${HOME}/.cargo/install"
export RUSTUP_HOME="${HOME}/.rustup"
export PATH="/usr/lib/llvm-13/bin:${HOME}/.local/bin:${HOME}/.cargo/bin:${HOME}/.cargo/install/bin:${PATH}"

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


export WASM_PACK_VERSION="0.10.2"
curl -sSL "https://github.com/rustwasm/wasm-pack/releases/download/v${WASM_PACK_VERSION}/wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl/wasm-pack"
chmod +x "${CARGO_HOME}/bin/wasm-pack"


# Install executable dependencies
cargo quickinstall cargo-generate

cp ".env.example" ".env"

cd packages_rs/nextclade-web

yarn wasm-prod

yarn install --frozen-lockfile

yarn prod:build

mkdir -p "../web/.build/production/web"
cp -r ".build/production/web" "../web/.build/production/web"
