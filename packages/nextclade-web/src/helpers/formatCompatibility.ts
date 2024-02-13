export function formatCompatibility(min?: string, max?: string) {
  if (!min && max) {
    return `up to ${max}`
  }

  if (min && !max) {
    return `from ${min}`
  }

  if (min && max) {
    return `from ${min} to ${max}`
  }

  return `unknown`
}
