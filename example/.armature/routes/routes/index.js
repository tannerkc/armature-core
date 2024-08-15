// node_modules/jsx-to-html-runtime/dist/index.js
var escapeProp = (value) => {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "&#10;").trim();
};
var escapeHTML = (value) => {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br/>").trim();
};

class RenderedNode {
  string;
  constructor(string) {
    this.string = string;
  }
}

class SerializationError extends Error {
  invalidValue;
  constructor(invalidValue) {
    super("Invalid value");
    this.invalidValue = invalidValue;
  }
}
var serialize = (value, escaper) => {
  if (value === null || value === undefined)
    return "";
  if (typeof value === "string")
    return escaper(value);
  if (typeof value === "number" || typeof value === "bigint")
    return value.toString();
  if (typeof value === "boolean")
    return value ? "true" : "false";
  if (typeof value === "function")
    return serialize(value(), escaper);
  if (value instanceof RenderedNode)
    return value.string;
  if (typeof value === "object" && "htmlContent" in value && typeof value.htmlContent === "string") {
    return value.htmlContent;
  }
  throw new SerializationError(value);
};
var memoizedRenderAttributes = new WeakMap;
var renderAttributes = (attributes) => {
  if (memoizedRenderAttributes.has(attributes)) {
    return memoizedRenderAttributes.get(attributes);
  }
  const result = Object.entries(attributes).filter(([key]) => key !== "children").map(([key, value]) => `${key}="${serialize(value, escapeProp)}"`).join(" ");
  memoizedRenderAttributes.set(attributes, result);
  return result;
};
var renderChildren = (attributes) => {
  const { children } = attributes;
  if (!children)
    return "";
  return (Array.isArray(children) ? children : [children]).map((child) => serialize(child, escapeHTML)).join("");
};
var renderTag = (tag, attributes, children) => {
  const tagWithAttributes = `${tag} ${attributes}`.trim();
  return children ? `<${tagWithAttributes}>${children}</${tag}>` : `<${tagWithAttributes}/>`;
};
var memoizedComponents = new WeakMap;
var renderJSX = (tag, props, _key) => {
  if (typeof tag === "function") {
    let componentCache = memoizedComponents.get(tag);
    if (!componentCache) {
      componentCache = new WeakMap;
      memoizedComponents.set(tag, componentCache);
    }
    if (componentCache.has(props)) {
      return componentCache.get(props);
    }
    const result = tag(props);
    componentCache.set(props, result);
    return result;
  }
  if (tag === undefined) {
    return new RenderedNode(renderChildren(props));
  }
  const attributes = renderAttributes(props);
  const children = renderChildren(props);
  return new RenderedNode(renderTag(tag, attributes, children));
};
var jsxDEV = renderJSX;
var css = String.raw;
var html = String.raw;
var sql = String.raw;
// example/src/routes/index.tsx
var routes_default = () => {
  let name = "Tanner";
  let num = 9;
  console.log(num);
  const result = fetch("/api").then(async (data) => {
    let r = await data.json();
    console.log(r);
  });
  return jsxDEV("div", {
    style: "display: flex; flex-direction: column; height: 100vh; justify-content: space-between;",
    children: [
      jsxDEV("header", {
        id: "id",
        children: jsxDEV("h1", {
          children: [
            "Welcome, ",
            name,
            ", to Reactive"
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this),
      jsxDEV("main", {
        children: [
          jsxDEV("p", {
            children: [
              "This app was generated using ",
              jsxDEV("code", {
                children: "generate-reactive-app"
              }, undefined, false, undefined, this),
              "."
            ]
          }, undefined, true, undefined, this),
          jsxDEV("button", {
            children: "Get Started"
          }, undefined, false, undefined, this),
          jsxDEV("section", {
            className: "mt-2",
            children: [
              jsxDEV("h3", {
                children: "Features"
              }, undefined, false, undefined, this),
              jsxDEV("p", {
                children: "Explore our features and see what makes us stand out."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      jsxDEV("footer", {
        children: jsxDEV("p", {
          children: "\xA9 2024 Tanner Cottle. All rights reserved."
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
};
export {
  routes_default as default
};
