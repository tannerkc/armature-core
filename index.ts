import { edenFetch, edenTreaty } from "@elysiajs/eden"
import { existsSync } from "fs";
import { join } from "path";
// import Fragment from "./src/jsx/Fragement"
// import h from "./src/jsx/h"
// import { createElement } from './src/jsx/jsx-runtime' 
export { jsx, jsxs, jsxDEV, type JSX } from 'jsx-to-html-runtime'

// export { Fragment, createElement }
// const configPath = join(process.cwd(), 'app.config.ts');
// const config = await import(configPath);

const loadConfig = async () => {
    const configPath = join(process.cwd(), 'app.config.ts');

    if (existsSync(configPath)) {
      const configImport = await import(configPath);
      return configImport?.default;
    }
    return {};
  };
  
export const config = await loadConfig();

const Armature = {
    // h,
    // Fragment
}

export const server = edenTreaty(config.server.url)
export const serverFetch = edenFetch(config.server.url)

export { onMount } from './src/lifecycle/mount'

import debug from "./src/utils/debug"
export { debug }

export default Armature
