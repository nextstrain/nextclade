import { DateTime } from 'luxon'

export function formatDateIsoUtcSimple(dateTimeStr: string) {
  const utc = DateTime.fromISO(dateTimeStr, { zone: 'UTC' })

  const date = utc.toISODate()

  let time = utc.toISOTime({
    suppressMilliseconds: true,
    suppressSeconds: true,
    includeOffset: false,
  })

  if (time === '00:00') {
    time = ''
  }

  return [date, time].join(' ')
}
