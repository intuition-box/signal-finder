// src/components/AtomsList.tsx
import React from 'react'
import { useAtoms } from '../graphql/queries/atoms'
import type { Atom } from '../lib/graphql'
import type { AtomsResponse } from '../graphql/queries/atoms'

export function AtomsList(): React.ReactElement {
  const { data, isLoading, error } = useAtoms(10)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading atoms</div>
  if (!data) return <div>No data</div>

  return (
    <div>
      {data.atoms.map((atom: Atom) => (
        <div key={atom.id}>
          <h3>{atom.uri}</h3>
          <p>Total Shares: {atom.totalShares}</p>
        </div>
      ))}
    </div>
  )
}