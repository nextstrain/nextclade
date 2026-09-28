import React from 'react'
import type { MutationPatternEventMatch } from 'src/gen/_SchemaRoot'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'

export function MutationPatternEventBadge({ event }: { event: MutationPatternEventMatch }) {
  switch (event.type) {
    case 'nucSubstitution':
      return <NucleotideMutationBadge mutation={event} />
  }
}

export function mutationPatternEventKey(event: MutationPatternEventMatch): string {
  switch (event.type) {
    case 'nucSubstitution':
      return `${event.type}:${event.pos}:${event.refNuc}:${event.qryNuc}`
  }
  // Events come from WASM output, which the compile-time exhaustiveness check does not cover
  throw new Error(`Unknown mutation pattern event: ${JSON.stringify(event)}`)
}
