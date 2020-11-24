import { QCRulesConfig } from 'src/algorithms/QC/types'
import { sanitizeError } from 'src/helpers/sanitizeError'

export class ErrorQcRulesConfigIo extends Error {}

export function qcRulesConfigDeserialize(content: string) {
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch (error_: unknown) {
    const error = sanitizeError(error_)
    throw new ErrorQcRulesConfigIo(`QC rules config format not recognized. JSON parsing error: ${error.message}`)
  }
}

export function qcRulesConfigValidate(config: unknown) {
  // TODO
  return config as QCRulesConfig
}
