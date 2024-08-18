// import swcPlugin from "../plugins/vite-swc-plugin";
import Logger from "./lib/logger";
import { createServer as createViteServer } from 'vite';

export const log = new Logger({
    prefix: '[armature]',
    usePrefix: true,
    colors: {
      base: 'white',
      info: 'cyan',
      warn: 'yellow',
      error: 'red',
      debug: 'magenta',
    },
});

export const isProduction = process.env.NODE_ENV === 'production'

// export const vite = await createViteServer({
//     server: { middlewareMode: true },
//     appType: 'custom',
//     plugins: [swcPlugin()]
// })
