import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '../../lib/graphql'
import type { Atom } from '../../lib/graphql'

const ATOMS_QUERY = `
  query GetAtoms($first: Int!) {
    atoms(first: $first) {
      id
      uri
      totalShares
      totalAssets
    }
  }
`

export interface AtomsResponse {
  atoms: Atom[]
}

export function useAtoms(first: number = 10) {
  return useQuery<AtomsResponse>(['atoms', first], 
    async (): Promise<AtomsResponse> => {
      const response = await graphqlClient.request<AtomsResponse>(ATOMS_QUERY, { first })
      return response
    }
  )
}