import type { RouteNode } from "../hrefBuilder";

export function useHref(): RouteNode {
    if (typeof window === 'undefined' || !window.__ROUTE_TREE__) {
      throw new Error('Route tree not initialized. Make sure __ROUTE_TREE__ is injected into the page.');
    }
    return window.__ROUTE_TREE__;
}
