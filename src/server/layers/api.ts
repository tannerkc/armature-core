import { join } from "path";
import fs, { readdir, stat } from 'node:fs/promises';

async function traverseDirectory(dir: any, apiMap: any) {
    const files = await readdir(dir);
  
    for (const file of files) {
        const filePath = join(dir, file);
        const fileStat = await stat(filePath);
  
        if (fileStat.isDirectory()) {
            await traverseDirectory(filePath, apiMap);
        } else if (file.endsWith('.ts')) {
            const routePath = filePath
              .replace(process.cwd(), '')
              .replace('/src/api', '')
              .replace(/index\.ts$/, '')
              .replace(/\.ts$/, '')
              .replace(/\[([^\]]+)\]/g, ':$1');
            const apiModule = await import(filePath);
  
            apiMap.set(routePath, apiModule);
        }
    }
}

export async function loadApiModules() {
    const apiDir = join(process.cwd(), 'src', 'api');
    const apiMap = new Map();
  
    await traverseDirectory(apiDir, apiMap);
  
    return apiMap;
}
