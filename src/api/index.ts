export * from 'bun:sqlite'
import type { JWTOption } from '@elysiajs/jwt'
export { t } from 'elysia'

let jwtConfig = {}
export const configureJWT = (config: { name: string, secret: string }) => {
    jwtConfig = config
}

export const getJWTconfig = (): JWTOption<"jwt", undefined>  => jwtConfig as JWTOption<"jwt", undefined> 

// export { getSubscriberCount } from '../server'
