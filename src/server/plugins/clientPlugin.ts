import type { PluginBuilder } from "bun";

export default {
    name: "inject-hydrate",
    setup(build: PluginBuilder) {
        build.onLoad({ filter: /\.tsx$/ }, async (args) => {
            const { default: RouteComponent } = await import(args.path);

            const pathParts = args.path.split('/')
            const componentName = pathParts[pathParts.length -1].replace(".tsx", "");
            const source = await Bun.file(args.path).text();

            if (componentName !== 'index') return { contents: source, loader: "tsx" } 
            const injectedSource = `
                function hydrate(element: any, container: HTMLElement) {
                    if (container) {
                        container.innerHTML = element().string;
                    }
                }
                ${source}
                hydrate(${RouteComponent}, document.querySelector('div[app]'))
            `;
            return { contents: injectedSource, loader: "tsx" };
        });
    },
}
