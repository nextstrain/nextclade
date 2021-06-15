#!/bin/sh
set -e

# This is a modification of the default Circle Ci "Checkout code" step,
# with shallow cloning. We ignore some of the possibilities, such as existing
# git repo, and always clone fresh.


# #################### Default CircleCI boilerplate begin ######################

# Workaround old docker images with incorrect $HOME
# check https://github.com/docker/docker/issues/2968 for details
if [ "${HOME}" = "/" ]
then
  export HOME=$(getent passwd $(id -un) | cut -d: -f6)
fi

echo "Using SSH Config Dir '$SSH_CONFIG_DIR'"
git --version

mkdir -p "$SSH_CONFIG_DIR"
chmod 0700 "$SSH_CONFIG_DIR"

printf "%s" 'github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==
bitbucket.org ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAubiN81eDcafrgMeLzaFPsw2kNvEcqTKl/VqLat/MaB33pZy0y3rJZtnqwR2qOOvbwKZYKiEO1O6VqNEBxKvJJelCq0dTXWT5pbO2gDXC6h6QDXCaHo6pOHGPUy+YBaGQRGuSusMEASYiWunYN0vCAI8QaXnWMXNMdFP3jHAJH0eDsoiGnLPBlBp4TNm6rYI74nMzgz3B9IikW4WVK+dc8KZJZWYjAuORU3jc1c/NPskD2ASinf8v3xnfXeukU0sJ5N6m5E8VLjObPEO+mN2t/FZTMZLiFqPWc/ALSqnMnnhwrNi2rbfg/rd/IpL8Le3pSBne8+seeFVBoGqzHM9yXw==
' >> "$SSH_CONFIG_DIR/known_hosts"
chmod 0600 "$SSH_CONFIG_DIR/known_hosts"

rm -f "$SSH_CONFIG_DIR/id_rsa"
printf "%s" "$CHECKOUT_KEY" > "$SSH_CONFIG_DIR/id_rsa"
chmod 0600 "$SSH_CONFIG_DIR/id_rsa"
if (: "${CHECKOUT_KEY_PUBLIC?}") 2>/dev/null; then
  rm -f "$SSH_CONFIG_DIR/id_rsa.pub"
  printf "%s" "$CHECKOUT_KEY_PUBLIC" > "$SSH_CONFIG_DIR/id_rsa.pub"
fi

export GIT_SSH_COMMAND='ssh -i "$SSH_CONFIG_DIR/id_rsa" -o UserKnownHostsFile="$SSH_CONFIG_DIR/known_hosts"'

# use git+ssh instead of https
git config --global url."ssh://git@github.com".insteadOf "https://github.com" || true
git config --global gc.auto 0 || true

# #################### Default CircleCI boilerplate end ########################


# #################### New things ##############################################

mkdir -p '/home/circleci/project'
cd '/home/circleci/project'
BRANCH_OR_TAG=""
if [ -n "${CIRCLE_TAG}" ]; then
  echo "Checking out tag \"${CIRCLE_TAG}\""
  BRANCH_OR_TAG=CIRCLE_TAG
else
  echo "Checking out branch \"${CIRCLE_BRANCH}\""
  BRANCH_OR_TAG=CIRCLE_TAG
fi

git clone --recursive "${CIRCLE_REPOSITORY_URL}" --branch "${BRANCH_OR_TAG}" --depth 1 .

git --no-pager log --no-color -n 1 --format='HEAD is now at %h %s'

# #############################################################################
