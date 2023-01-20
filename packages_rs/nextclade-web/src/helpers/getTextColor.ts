import type { Theme } from 'src/theme'
import { getContrast } from 'polished'

export function getTextColor(theme: Theme, backgroundColor: string) {
  const contrast = getContrast(backgroundColor, theme.gray100)
  if (contrast > 2.7) {
    return theme.gray100
  }
  return theme.gray800
}
