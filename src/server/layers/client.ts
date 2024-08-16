/* INJECT_COMPONENT */

function hydrate(element: any, container: HTMLElement) {
  if (container) {
    container.innerHTML = element().string;
  }
}

try {
    /* INJECT_RENDER */
} catch (error) {
    console.log(error)
}


