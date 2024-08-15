import path from "path";
import { createElement, Fragment } from "../../jsx/jsx-runtime";


const transpiler = new Bun.Transpiler({
    loader: 'tsx',
    tsconfig: {
        compilerOptions: {
            jsx: 'preserve',
            jsxFactory: 'createElement',
            jsxFragmentFactory: 'Fragment',
            jsxImportSource: '../../jsx/jsx-runtime'
        }
    }
});

// Cache for loaded modules
const moduleCache = new Map();

// Function to resolve import paths
function resolvePath(importPath: string, currentPath: string): string {
    if (importPath.startsWith('.')) {
        return path.resolve(path.dirname(currentPath), importPath);
    }
    // For non-relative imports, you might want to implement a resolution strategy
    // based on your project structure or use a package manager's resolution
    return importPath;
}

// Function to handle imports
async function handleImports(imports: string[], currentPath: string): Promise<Record<string, any>> {
    const importedModules: Record<string, any> = {};

    for (const importPath of imports) {
        if (importPath.kind !== "import-path") continue;
        const resolvedPath = resolvePath(importPath.path, currentPath);
        
        if (moduleCache.has(resolvedPath)) {
            importedModules[importPath] = moduleCache.get(resolvedPath);
            continue;
        }

        try {
            const module = await import(resolvedPath);
            moduleCache.set(resolvedPath, module);
            importedModules[importPath] = module;
        } catch (error) {
            console.error(`Error importing ${importPath}:`, error);
            throw error;
        }
    }

    return importedModules;
}

// Function to load and render a component
async function loadComponent(componentPath: string, props: any = {}): Promise<any> {
    const componentCode = await Bun.file(componentPath + '/index.tsx').text();
    const transpiledCode = transpiler.transformSync(componentCode);
    const imports = transpiler.scanImports(componentCode);
    
    // Handle imports
    const importedModules = await handleImports(imports, componentPath);

    // Create a module-like environment for the component
    const module = { exports: {} };
    const require = (path: string) => importedModules[path];

    // Execute the transpiled code
    const execute = new Function('module', 'exports', 'require', 'createElement', 'Fragment', transpiledCode);
    execute(module, module.exports, require, createElement, Fragment);

    // Render the component
    const Component = module.exports.default || module.exports;
    return createElement(Component, props);
}


// Server-side rendering function
async function renderToString(element: any): Promise<string> {
    if (typeof element === 'string') return element;
    if (typeof element === 'number') return element.toString();
    if (Array.isArray(element)) return (await Promise.all(element.map(renderToString))).join('');
    if (element instanceof Node) {
        const wrapper = document.createElement('div');
        wrapper.appendChild(element);
        return wrapper.innerHTML;
    }
    return '';
}

// Example usage
export async function renderPage(componentPath: string, props: any = {}) {
    const component = await loadComponent(componentPath, props);
    return renderToString(component);
}
