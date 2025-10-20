import { GraphQLClient } from 'graphql-request'
import { configureClient, API_URL_DEV, GetAtomsQuery } from '@0xintuition/graphql'

// Resolve API URL from env or fall back to dev
const API_URL = API_URL_DEV

// Configure the shared client used by helper functions in the package
configureClient({
  apiUrl: API_URL
})

// Export an app-scoped GraphQLClient instance for direct .request() usage
export const graphqlClient = new GraphQLClient(API_URL)

// Re-export package helpers and types for convenience
export * from '@0xintuition/graphql'
export type { GetAtomsQuery }