import { edenFetch, edenTreaty } from "@elysiajs/eden"
import { join } from "path";
// import Fragment from "./src/jsx/Fragement"
// import h from "./src/jsx/h"
// import { createElement } from './src/jsx/jsx-runtime' 
export { jsx, jsxs, jsxDEV, type JSX } from 'jsx-to-html-runtime'

// export { Fragment, createElement }
const configPath = join(process.cwd(), 'app.config.ts');
const config = await import(configPath);

const Armature = {
    // h,
    // Fragment
}

export const server = edenTreaty(config.default.server.url)
export const serverFetch = edenFetch(config.default.server.url)

export { onMount } from './src/lifecycle/mount'

export default Armature
