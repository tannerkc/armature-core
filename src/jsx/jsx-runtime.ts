export function createElement(tag: string | Function, props: any, ...children: any[]) {
    if (typeof tag === 'function') {
      return tag(props, ...children);
    }
  
    const element = document.createElement(tag);
  
    Object.entries(props || {}).forEach(([name, value]) => {
      if (name.startsWith('on') && name.toLowerCase() in window) {
        element.addEventListener(name.toLowerCase().substr(2), value as EventListener);
      } else {
        element.setAttribute(name, value as string);
      }
    });
  
    children.forEach(child => {
      if (Array.isArray(child)) {
        child.forEach(nestedChild => appendChild(element, nestedChild));
      } else {
        appendChild(element, child);
      }
    });
  
    return element;
}
  
function appendChild(parent: Node, child: any) {
    if (child == null) {
      return;
    }
    
    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(child.toString()));
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      console.warn('Invalid child', child);
    }
}

export function Fragment(props: any, ...children: any[]) {
    return children;
}
