export default function h(type: any, props: any, ...children: any[]) {
    return {
      type,
      props: {
        ...props,
      },
      children: children.flat()
    };
}
