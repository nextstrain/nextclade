import React from 'react'

import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { ResultsTable } from 'src/components/Results/ResultsTable'

export function ResultsPage() {
  return (
    <LayoutResults>
      <ResultsTable />
    </LayoutResults>
  )
}
