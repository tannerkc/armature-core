import type { PluginBuilder } from "bun";

export default {
    name: "svelte loader",
    async setup(build: PluginBuilder) {
      const { compile } = await import("svelte/compiler");
  
      build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
  
        const file = await Bun.file(path).text();
        const contents = compile(file, {
          filename: path,
          generate: "ssr",
        }).js.code;
  
        return {
          contents,
          loader: "js",
        };
      });
    },
}
