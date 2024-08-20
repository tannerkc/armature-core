import { edenFetch, edenTreaty } from "@elysiajs/eden"
import Logger from "./lib/logger";
import { config } from "../index";

export const server = edenTreaty(config.server.url)
export const serverFetch = edenFetch(config.server.url)

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

export { onMount } from './lifecycle/mount'

import debug from "./utils/debug"
export { debug }

export const isProduction = process.env.NODE_ENV === 'production'

const Armature = {

}

export default Armature
