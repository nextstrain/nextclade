function ruleTotalMutations() {
  const totalNumberOfMutations =
    Object.keys(mutations).length + Object.keys(insertions).length + Object.keys(deletions).length

  if (totalNumberOfMutations > QCParams.divergenceThreshold) {
    flags.push(TooHighDivergence)
  }
}
