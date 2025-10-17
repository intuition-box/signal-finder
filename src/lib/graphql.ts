import { configureClient, API_URL_DEV, AtomsQuery } from '@0xintuition/graphql'

// Configure the client
configureClient({
  apiUrl: API_URL_DEV
})

// Export configured client and types
export * from '@0xintuition/graphql'
export type { AtomsQuery }