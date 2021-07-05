#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

set -x

# Directory where this script resides
THIS_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") pwd)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

#source "${THIS_DIR}/lib/set_locales.sh"
#source "${THIS_DIR}/lib/is_ci.sh"

#source "${PROJECT_ROOT_DIR}/.env.example"
#if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
#  source "${PROJECT_ROOT_DIR}/.env"
#fi

function is_docker() {
    if [ -f /.dockerenv ]; then
      echo "1"
    else
      echo "0"
    fi
}

IS_DOCKER="$(is_docker)"

# Vercel seems to be currently using VMs provisioned with Amazon Linux, which is a derivative of RHEL,
# so we assume that `yum` package manager and `docker` package are available.
# If something breaks here, perhaps they've changed things.

export PATH="/usr/sbin/:$PATH"

#which modprobe
#find / -iname "modprobe" 2>/dev/null

yum update -y -q >/dev/null
#yum install -y -q yum-utils iptables iptables-services sysctl sudo >/dev/nul

yum list docker --showduplicates | sort -r
#yum list containerd.io --showduplicates | sort -r

yum install -y -q yum-utils sudo >/dev/nul
amazon-linux-extras install -q docker >/dev/null
#yum install -y -q docker
usermod -a -G docker $(id -un)
#sudo service iptables start || true
#sudo systemctl start iptables || true


#ip link del docker0 || true
#rm -rf /var/docker/network/*
#mkdir -p /var/docker/network/files  || true

#sudo service docker start || true
#sudo systemctl start docker || true

#sysctl net.ipv4.ip_forward=1
#nohup dockerd --host=unix:///var/run/docker.sock

#
nohup dockerd --host=unix:///var/run/docker.sock \
  --max-concurrent-downloads=1 \
  --max-concurrent-uploads=1 \
  --ip-forward=false \
  --iptables=false \
  --bridge=none \
  --storage-driver=overlay \
&

# --iptables=false
#--host=tcp://127.0.0.1:2375 --storage-driver=devicemapper &

sleep 3

service docker status || true
systemctl status docker || true

sleep 3

docker --version
docker info
sudo docker run --privileged=true --cap-add=SYS_ADMIN hello-world

#yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
#yum list docker-ce --showduplicates | sort -r
#yum list containerd.io --showduplicates | sort -r
#yum install docker-ce docker-ce-cli containerd.io
##sudo yum install docker-ce-<VERSION_STRING> docker-ce-cli-<VERSION_STRING> containerd.io


#systemctl start docker




#yum install \
#  curl \
#  xz
#
#curl -fsSL https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh
#bash Miniconda3-latest-Linux-x86_64.sh -b -p "${HOME}/miniconda"
#
#export PATH="${HOME}/miniconda/bin:${PATH}"
#source "${HOME}/miniconda/bin/activate"
#
#conda config --add channels conda-forge
#conda config --set channel_priority strict
#
#conda install --yes \
#  conan \
#  cpplint
#
#make prod-wasm-nowatch
#make prod-web-nowatch
