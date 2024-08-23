import { edenFetch, edenTreaty, treaty } from "@elysiajs/eden"
import type { App } from "../server"
// import { config } from "../index";

export const server = treaty<App>('http://localhost:3000/api')
export const serverFetch = edenFetch<App>('http://localhost:3000/api')

export * from '../state/useState'
export { usePersistentState } from '../state/usePersistentState'
export { onMount } from '../lifecycle/mount'
