import { join } from "path";
import fs, { readdir, stat } from 'node:fs/promises';
import { existsSync } from "fs";

async function traverseDirectory(baseDir: string, dir: string, handlerMap: Map<string, string>) {
    const files = await readdir(dir);
  
    for (const file of files) {
        const filePath = join(dir, file);
        const fileStat = await stat(filePath);
  
        if (fileStat.isDirectory()) {
            await traverseDirectory(baseDir, filePath, handlerMap);
        } else if (file.endsWith('.ts')) {
            const routePath = filePath
              .replace(process.cwd(), '')
              .replace(baseDir, '')
              .replace(/index\.ts$/, '')
              .replace(/\.ts$/, '')
              .replace(/\[([^\]]+)\]/g, ':$1');
            const module = await import(filePath);
  
            handlerMap.set(routePath, module);
        }
    }
}

export const loadModules = async (subDir: string) => {
    const handlerMap = new Map();

    if (!existsSync(join(process.cwd(), 'src', subDir))) {
        // console.warn(`${subDir} directory does not exist. Skipping.`);
        return handlerMap;
    }
    const dir = join(process.cwd(), 'src', subDir);
    await traverseDirectory(`/${join('src', subDir)}`, dir, handlerMap);
    return handlerMap;
}
