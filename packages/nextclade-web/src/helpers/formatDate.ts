import { isEmpty, negate } from 'lodash'
import { DateTime } from 'luxon'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export function formatDateIsoUtcSimple(dateTimeStr: string) {
  const utc = DateTime.fromISO(dateTimeStr, { zone: 'UTC' })

  const date = utc.toISODate()

  if (isEmpty(date)) {
    return undefined
  }

  const time = utc.toISOTime({
    suppressMilliseconds: true,
    includeOffset: false,
  })

  return [date, time, `(${utc.zoneName})`].filter(notUndefinedOrNull).filter(negate(isEmpty)).join(' ')
}
