import { readdir } from 'fs/promises';
import { join, parse } from 'path';
import { CONFIG } from '../../config';

type RouteParams = Record<string, string>;

export interface RouteNode {
  [key: string]: RouteNode | ((params?: RouteParams) => string);
}

const buildRouteTree = async (dir: string, basePath: string = ''): Promise<RouteNode> => {
  const files = await readdir(dir, { withFileTypes: true });
  const routeNode: RouteNode = {};

  for (const file of files) {
    const fullPath = join(dir, file.name);
    const parsedPath = parse(file.name);
    
    if (file.isDirectory()) {
      const subTree = await buildRouteTree(fullPath, join(basePath, file.name));
      routeNode[file.name] = subTree;
    } else if (parsedPath.ext === '.tsx' && parsedPath.name !== 'layout') {
      const routeName = parsedPath.name === 'index' ? '' : parsedPath.name;
      const fullRoutePath = join(basePath, routeName);
      
      if (file.name.startsWith('[') && file.name.endsWith(']')) {
        const paramName = file.name.slice(1, -1);
        routeNode[paramName] = (params: RouteParams = {}) => {
          return join('/', fullRoutePath.replace(`[${paramName}]`, params[paramName] || ''));
        };
      } else {
        routeNode[routeName] = () => join('/', fullRoutePath);
      }
    }
  }

  return routeNode;
}

let routeTree: RouteNode | null = null;

export const initializeRouteTree = async () => {
  routeTree = await buildRouteTree(CONFIG.ROUTES_DIR);
  return `window.__ROUTE_TREE__ = ${JSON.stringify(routeTree)};`;
}
