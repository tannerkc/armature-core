type RouteParams = string | number;

type RouteNodeFunction = {
  (): string;
  (param: RouteParams): RouteNode;
};

type RouteNode = RouteNodeFunction & {
  [key: string]: RouteNode;
};

const buildClientRouteTree = (serverRouteTree: any): RouteNode => {
  function buildNode(node: any, path: string[] = []): RouteNode {
    const nodeFunction = ((param?: RouteParams): any => {
      if (param === undefined) {
        return '/' + path.join('/');
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

export const useHref = (): RouteNode => {
    if (typeof window === 'undefined' || !window.__ROUTE_TREE__) {
      throw new Error('Route tree not initialized. Make sure __ROUTE_TREE__ is injected into the page.');
    }
    return buildClientRouteTree(window.__ROUTE_TREE__);
}
