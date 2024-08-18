export { jsx, jsxs, jsxDEV } from "jsx-to-html-runtime";
declare module 'armature-core/jsx-runtime' 

export namespace JSX {
    interface Element {
      type: string | Function;
      props: any;
      key: string | null;
    }
    interface ElementClass {
      render(): Element;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
}
