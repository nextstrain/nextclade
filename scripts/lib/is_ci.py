import os

from is_truthy import is_truthy

# Borrowed from
# https://github.com/watson/ci-info/blob/1f890078805447ed39b17a6ad136356a7d5cd68b/vendors.json
CI_VARS = [
  "APPCENTER",
  "APPCIRCLE",
  "APPVEYOR",
  "AZURE_PIPELINES",
  "BAMBOO",
  "BITBUCKET",
  "BITRISE",
  "BUDDY",
  "BUILDKITE",
  "BUILD_ID",
  "CI",
  "CIRCLE",
  "CIRCLECI",
  "CIRRUS",
  "CIRRUS_CI",
  "CODEBUILD",
  "CODEBUILD_BUILD_ID",
  "CODEFRESH",
  "CODESHIP",
  "DRONE",
  "DSARI",
  "EAS",
  "GITHUB_ACTIONS",
  "GITLAB",
  "GITLAB_CI",
  "GOCD",
  "HEROKU_TEST_RUN_ID",
  "HUDSON",
  "JENKINS",
  "LAYERCI",
  "MAGNUM",
  "NETLIFY",
  "NEVERCODE",
  "RENDER",
  "SAIL",
  "SCREWDRIVER",
  "SEMAPHORE",
  "SHIPPABLE",
  "SOLANO",
  "STRIDER",
  "TASKCLUSTER",
  "TEAMCITY",
  "TEAMCITY_VERSION",
  "TF_BUILD",
  "TRAVIS",
  "VERCEL",
]


def check_is_ci():
  return any([is_truthy(os.environ.get(ci_var)) for ci_var in CI_VARS])
