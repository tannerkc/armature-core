export * from 'bun:sqlite'
import { edenFetch, edenTreaty, treaty } from "@elysiajs/eden"
import type { App } from "../server"
// import { config } from "../../index";

export const server = treaty<App>('http://localhost:3000/api')
export const socket = treaty<App>('http://localhost:3000/ws')
export const serverFetch = edenFetch<App>('http://localhost:3000/api')

export * from '../state'
export * from '../client'
export * from '../lifecycle'
