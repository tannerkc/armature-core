export function createElement(tag: string | Function, props: any) {
    const { children } = props 
    if (typeof tag === 'function') {
      return tag(props, ...props.children);
    }
  
    const element = document.createElement(tag);

    Object.entries(props || {}).forEach(([name, value]) => {
      if (name.startsWith('on') && name.toLowerCase() in window) {
        element.addEventListener(name.toLowerCase().substr(2), value as EventListener);
      } else {
        element.setAttribute(name, value as string);
      }
    });
  
    if (Array.isArray(children)) {
        children.forEach(child => {
        if (Array.isArray(child)) {
            child.forEach(nestedChild => appendChild(element, nestedChild));
        } else {
            appendChild(element, child);
        }
        });
    } else {
        appendChild(element, children);
    }
  
    return element;
}
  
export function appendChild(parent: Node, child: any) {
    if (child == null) {
      return;
    }
    
    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(child.toString()));
    } else if (child instanceof Node || child instanceof HTMLElement) {
      parent.appendChild(child);
    } else {
      console.warn('Invalid child', child);
    }
}

export function Fragment(props: any, ...children: any) {
    return children;
}
