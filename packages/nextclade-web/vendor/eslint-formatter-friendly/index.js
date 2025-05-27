/**
 * Based on
 * - https://github.com/eslint-community/eslint-formatter-codeframe
 * - https://github.com/royriojas/eslint-friendly-formatter
 */

import path from 'node:path'
import chalk from 'chalk'
import { codeFrameColumns } from '@babel/code-frame'

export default function (results) {
  let errors = 0
  let warnings = 0
  let fixableErrors = 0
  let fixableWarnings = 0
  let rules = []

  const resultsWithMessages = results.filter((result) => result.messages.length > 0)

  let output = resultsWithMessages
    .reduce((resultsOutput, result) => {
      const messages = result.messages.map((message) => `${formatMessage(message, result)}\n\n`)

      rules = [...rules, ...result.messages.map((message) => message.ruleId)]

      errors += result.errorCount
      warnings += result.warningCount
      fixableErrors += result.fixableErrorCount
      fixableWarnings += result.fixableWarningCount

      return resultsOutput.concat(messages)
    }, [])
    .join('\n')

  output += '\n'
  output += formatSummary(rules, errors, warnings, fixableErrors, fixableWarnings)

  return errors + warnings > 0 ? output : ''
}

function formatMessage(message, parentResult) {
  const type = message.fatal || message.severity === 2 ? chalk.red('error') : chalk.yellow('warning')
  const msg = `${chalk.bold(message.message.replace(/([^ ])\.$/u, '$1'))}`
  const ruleId = message.fatal ? '' : chalk.dim(`(${message.ruleId})`)
  const filePath = formatFilePath(parentResult.filePath, message.line, message.column)
  const sourceCode = parentResult.output ? parentResult.output : parentResult.source
  const firstLine = `${filePath}: ${type}: ${msg} ${ruleId}`
  const result = [firstLine]
  if (sourceCode) {
    result.push(
      codeFrameColumns(
        sourceCode,
        {
          start: {
            line: message.line,
            column: message.column,
          },
        },
        { highlightCode: true },
      ),
    )
  }
  return result.join('\n')
}

function formatFilePath(filePath, line, column) {
  let relPath = path.relative(process.cwd(), filePath)
  if (line && column) {
    relPath += `:${line}:${column}`
  }
  return chalk.bold(relPath)
}

function formatSummary(rules, nErrors, nWarnings, nFixableErrors, nFixableWarnings) {
  const summaryColor = nErrors > 0 ? 'red' : 'yellow'
  const summary = []
  const fixablesSummary = []

  if (nErrors > 0) {
    summary.push(`${nErrors} error(s)`)
  }

  if (nWarnings > 0) {
    summary.push(`${nWarnings} warning(s)`)
  }

  if (nFixableErrors > 0) {
    fixablesSummary.push(`${nFixableErrors} error(s)`)
  }

  if (nFixableWarnings > 0) {
    fixablesSummary.push(`${nFixableWarnings} warning(s)`)
  }

  let output = chalk[summaryColor](`${summary.join(' and ')} found.`)

  if (nFixableErrors || nFixableWarnings) {
    output += chalk[summaryColor](`\n${fixablesSummary.join(' and ')} potentially fixable with the \`--fix\` option.`)
  }

  const ruleUrls = [...new Set(rules)]
    .map((rule) => getRuleUrl(rule))
    .filter((url) => url !== undefined && url !== null)
    .map((url) => `  * ${url}`)
    .join('\n')

  return `${output}\n\n${ruleUrls}`
}

function getRuleUrl(ruleId) {
  if (typeof ruleId !== 'string') {
    return undefined
  }

  let url = `https://google.com/search?q=${ruleId}`
  if (ruleId.startsWith('@typescript-eslint/')) {
    const path = ruleId.split('/')[1]
    url = `https://typescript-eslint.io/rules/${path}`
  }
  if (ruleId.startsWith('react/')) {
    const path = ruleId.split('/')[1]
    url = `https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/${path}.md`
  }
  if (ruleId.startsWith('unicorn/')) {
    const path = ruleId.split('/')[1]
    url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/${path}.md`
  }
  if (!ruleId.includes('/')) {
    url = `https://eslint.org/docs/rules/${ruleId}`
  }
  return chalk.underline(url)
}
