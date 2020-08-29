export enum QCRuleStatus {
  good = 'good',
  mediocre = 'mediocre',
  bad = 'bad',
}

export function getQCRuleStatus(score: number) {
  let status = QCRuleStatus.good
  if (score >= 30 && score < 100) {
    status = QCRuleStatus.mediocre
  } else if (score >= 100) {
    status = QCRuleStatus.bad
  }
  return status
}
