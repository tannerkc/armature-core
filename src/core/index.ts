import { edenFetch, edenTreaty, treaty } from "@elysiajs/eden"
import type { App } from "../server"
import type { RouteMapping } from "../client/hooks/useHref"

export const server = treaty<App>('http://localhost:3000/api')
export const socket = treaty<App>('http://localhost:3000/ws')
export const serverFetch = edenFetch<App>('http://localhost:3000/api')

// const config = window.__CONFIG__
// export const server = treaty<App>(`${config.server.url}/api`)
// export const socket = treaty<App>(`${config.server.url}/ws`)
// export const serverFetch = edenFetch<App>(`${config.server.url}/api`)

export * from '../state'
export * from '../state/store'
export * from '../client'
export * from '../lifecycle'

declare global {
    interface Window {
      __ROUTE_TREE__: any;
      __CONFIG__: any;
      __ROUTE_MAPPING__: RouteMapping;
    }
}
