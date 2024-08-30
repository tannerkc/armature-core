type BreadcrumbItem = {
    label: string;
    path: string;
};

type UseBreadcrumbHook = () => BreadcrumbItem[];

export const useBreadcrumb: UseBreadcrumbHook = () => {
    const path = window.location.pathname;
    const segments = path.replace(/^\/|\/$/g, '').split('/');
    const breadcrumb: BreadcrumbItem[] = [];

    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
        currentPath += '/' + segments[i];
        breadcrumb.push({
            label: decodeURIComponent(segments[i]),
            path: currentPath
        });
    }

    return breadcrumb;
};
