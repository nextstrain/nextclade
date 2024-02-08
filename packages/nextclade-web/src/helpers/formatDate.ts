import { DateTime } from 'luxon'

export function formatDateIsoUtcSimple(dateTimeStr: string) {
  const utc = DateTime.fromISO(dateTimeStr, { zone: 'UTC' })

  const date = utc.toISODate()

  const time = utc.toISOTime({
    suppressMilliseconds: true,
    suppressSeconds: true,
    includeOffset: false,
  })

  return [date, time, `(${utc.zoneName})`].join(' ')
}
