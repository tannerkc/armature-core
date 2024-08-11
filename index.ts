import { edenFetch, edenTreaty } from "@elysiajs/eden"
import Fragment from "./src/jsx/Fragement"
import h from "./src/jsx/h"
import { createElement } from './src/jsx/jsx-runtime' 
import path = require("path")
export { Fragment, createElement }
// TODO: remove example
const configPath = path.join(process.cwd(), 'example', 'app.config.ts');
const config = await import(configPath);

const Reactive = {
    h,
    Fragment
}

export const server = edenTreaty(config.default.server.url)
export const serverFetch = edenFetch(config.default.server.url)

export { onMount } from './src/lifecycle/mount'

export default Reactive
