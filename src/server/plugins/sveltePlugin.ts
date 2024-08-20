import type { PluginBuilder } from "bun";

export const sveltePlugin = () => ({
  name: "svelte loader",
  // async setup(build: PluginBuilder) {
  //   const { compile } = await import("svelte/compiler");

  //   build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
  //     console.log(`svelte path: ${path}`)
  //     const file = await Bun.file(path).text();
  //     const contents = compile(file, {
  //       filename: path,
  //       generate: "ssr",
  //     }).js.code;

  //     return {
  //       contents,
  //       loader: "js",
  //     };
  //   });
  // },
})

// TODO: finish svelte rendering in client.ts
