export const ignoreCssPlugin = () => {
    return {
      name: 'ignore-css',
      setup(build: any) {
        // Filter out CSS files
        build.onLoad({ filter: /\.css$/ }, (args: any) => {
          // Return an empty result for CSS files, effectively ignoring them
          return { contents: '', loader: 'css' };
        });
      },
    };
}
