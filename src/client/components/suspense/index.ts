export function Suspense({ fallback, children }: { fallback: string, children: () => Promise<string> }) {
    const id = `suspense-${Math.random().toString(36).substr(2, 9)}`;
    return {
      initialHTML: `<div id="${id}">${fallback}</div>`,
      promise: children().then(content => ({ id, content })),
    };
}
