export function getTestName(): string {
  return expect.getState().currentTestName.split(' ')[1]
}
