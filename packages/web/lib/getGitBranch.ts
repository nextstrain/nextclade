import { execSync } from 'child_process'

import { getenv } from './getenv'

export function getGitBranch() {
  console.log({ VERCEL_GITHUB_COMMIT_REF: process.env.VERCEL_GITHUB_COMMIT_REF })

  return (
    getenv('TRAVIS_BRANCH', null) ??
    getenv('NOW_GITHUB_COMMIT_REF', null) ??
    getenv('VERCEL_GITHUB_COMMIT_REF', null) ??
    execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  )
}
