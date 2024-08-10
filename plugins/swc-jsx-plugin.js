module.exports = function(api) {
    return {
      visitor: {
        JSXElement(path) {
          const openingElement = path.node.openingElement;
          const tagName = openingElement.name.name;
          const attributes = openingElement.attributes;
  
          // Convert JSX element to createElement function call
          const createElement = api.template.expression(`
            (function() {
              const el = document.createElement("${tagName}");
              ${attributes.map(attr => {
                if (attr.type === "JSXAttribute") {
                  const name = attr.name.name;
                  const value = attr.value;
                  if (value.type === "StringLiteral") {
                    return `el.setAttribute("${name}", ${value.extra.raw});`;
                  } else {
                    return `el.setAttribute("${name}", ${api.types.expressionStatement(value).expression.toString()});`;
                  }
                }
                return '';
              }).join('\n')}
              ${path.node.children.map(child => {
                if (child.type === "JSXText") {
                  return `el.appendChild(document.createTextNode(${JSON.stringify(child.value)}));`;
                } else if (child.type === "JSXElement") {
                  return `el.appendChild(${api.types.expressionStatement(child).expression.toString()});`;
                }
                return '';
              }).join('\n')}
              return el;
            })()
          `);
  
          path.replaceWith(createElement);
        }
      }
    };
};
