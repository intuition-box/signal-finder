declare module '@0xintuition/graphql' {
  export interface Atom {
    id: string
    uri: string
    createdAt: string
    totalShares: string
    totalAssets: string
  }

  export function configureClient(config: { apiUrl: string }): void
  export const API_URL_DEV: string
  export const API_URL_PROD: string
  export const API_URL_LOCAL: string
}