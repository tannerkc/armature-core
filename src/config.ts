import { join, normalize } from "path";

export const CONFIG = {
    ROUTES_DIR: normalize(join(process.cwd(), 'src', 'routes')),
    BUILD_DIR: normalize(join(process.cwd(), '.armature', 'routes')),
  };
