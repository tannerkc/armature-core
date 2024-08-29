import { dirname, join, normalize } from "path";
import debug from "../../utils/debug";
import { existsSync } from "fs";
import { readdir } from 'node:fs/promises';

import { CONFIG } from '../../config';
import { type RouteInfo } from '../../types';

const routeCache = new Map<string, { filePath: string | null; params: Record<string, string>; layout: string | null } | null>();

export const findMatchingRoute = async (urlPath: string): Promise<{ filePath: string | null, params: Record<string, string>, layout: string | null }> => {
    debug(`Finding matching Route for path: ${urlPath}`)
    
    if (routeCache.has(urlPath)) {
      return routeCache.get(urlPath)!;
    }
  
    const parts = urlPath.split('/').filter(Boolean);
    let currentPath = CONFIG.ROUTES_DIR;
    let params: Record<string, string> = {};
    let layout: string | null = null;

    const rootLayout = existsSync(join(process.cwd(), 'src', 'routes', 'layout.tsx')) 
    ? join(process.cwd(), 'src', 'routes', 'layout.tsx') 
    : null;
  
    if (parts.length === 0) {
      const indexPath = join(currentPath, 'index.tsx');
      if (existsSync(indexPath)) {
        const result = { filePath: indexPath, params, layout: rootLayout };
        routeCache.set(urlPath, result);
        return result;
      }
      const result = { filePath: null, params, layout: null };
      routeCache.set(urlPath, result);
      return result;
    }
  
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const segment = parts[i];
  
      let possiblePath = normalize(join(currentPath, segment));
      if (isLast) {
        if (existsSync(`${possiblePath}.tsx`)) {
          const hasLocalLayout = await existsSync(join(dirname(possiblePath), 'layout.tsx'));
          const result = { filePath: `${possiblePath}.tsx`, params, layout: hasLocalLayout ? join(dirname(possiblePath), 'layout.tsx') : rootLayout };
          routeCache.set(urlPath, result);
          return result;
        }
        if (existsSync(join(possiblePath, 'index.tsx'))) {
          const hasLocalLayout = await existsSync(join(possiblePath, 'layout.tsx'));
          const result = { filePath: join(possiblePath, 'index.tsx'), params, layout: hasLocalLayout ? join(possiblePath, 'layout.tsx') : rootLayout };
          routeCache.set(urlPath, result);
          return result;
        }
      }
      
      const files = await readdir(currentPath);
      const directories = files.filter(file => !file.includes('.'));
      const dynamicSegment = directories.find(file => file.startsWith('[') && file.endsWith(']'));
      
      if (dynamicSegment && !segment.includes('.')) {
        const paramName = dynamicSegment.slice(1, -1); 
        params[paramName] = segment;
        possiblePath = normalize(join(currentPath, dynamicSegment));
        if (isLast) {
          if (existsSync(`${possiblePath}.tsx`)) {
            const hasLocalLayout = await existsSync(join(dirname(possiblePath), 'layout.tsx'));
            const result = { filePath: `${possiblePath}.tsx`, params, layout: hasLocalLayout ? join(dirname(possiblePath), 'layout.tsx') : rootLayout };
            routeCache.set(urlPath, result);
            return result;
          }
          if (existsSync(join(possiblePath, 'index.tsx'))) {
            const hasLocalLayout = await existsSync(join(possiblePath, 'layout.tsx'));
            const result = { filePath: join(possiblePath, 'index.tsx'), params, layout: hasLocalLayout ? join(possiblePath, 'layout.tsx') : rootLayout };
            routeCache.set(urlPath, result);
            return result;
          }
        }
        currentPath = possiblePath;
      } else if (existsSync(possiblePath)) {
        currentPath = possiblePath;
      } else {
        const result = { filePath: null, params, layout: null };
        routeCache.set(urlPath, result);
        return result;
      }
    }
    
    const result = { filePath: null, params, layout: null };
    routeCache.set(urlPath, result);
    return result;
};
