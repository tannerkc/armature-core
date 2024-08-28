export interface RouteInfo {
    filePath: string | null;
    params: Record<string, string>;
    layout: string | null;
}
