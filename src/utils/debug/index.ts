import { config } from "../../../index"
import { log } from "../../index"

const debug = (logContext: any, enabled?: boolean | undefined) => {
    if (config?.debug?.logs || enabled) log.debug(logContext)
}

export default debug
