type RouteParams = string | number;

type RouteNodeFunction = {
  (): string;
  (param: RouteParams): RouteNode;
};

type RouteNode = RouteNodeFunction & {
  [key: string]: RouteNode;
};

export type RouteMapping = {
  [key: string]: string;
};

const buildClientRouteTree = (serverRouteTree: any, routeMapping: RouteMapping = {}): RouteNode => {
  const buildNode = (node: any, path: string[] = []): RouteNode => {
    const nodeFunction = ((param?: RouteParams): any => {
      if (param === undefined) {
        const mappedPath = path.map(segment => routeMapping[segment] || segment);
        return '/' + mappedPath.join('/');
      }
      const nextPath = [...path];
      const dynamicSegment = Object.keys(node).find(key => key.startsWith('[') && key.endsWith(']'));
      if (dynamicSegment) {
        nextPath.push(String(param));
        return buildNode(node[dynamicSegment], nextPath);
      }
      return buildNode(node, nextPath);
    }) as RouteNode;

    for (const [key, value] of Object.entries(node)) {
      if (key !== '()') {
        nodeFunction[key] = buildNode(value, [...path, key]);
      }
    }

    return nodeFunction;
  }

  return buildNode(serverRouteTree);
}

let routeTree: RouteNode;
let routeMapping: RouteMapping = {};

export const initializeHref = (serverRouteTree: any, mapping: RouteMapping = {}) => {
  routeTree = buildClientRouteTree(serverRouteTree, mapping);
  routeMapping = mapping;
}

export const useHref = (): RouteNode => {
  initializeHref(window.__ROUTE_TREE__, window.__ROUTE_MAPPING__);
  if (!routeTree) {
    throw new Error('Route tree not initialized. Make sure to call initializeHref first.');
  }
  return routeTree;
}
