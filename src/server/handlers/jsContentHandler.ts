import { relative } from "path";
import { hashFilePath } from "src/utils";

export const handleBuildOutputs = async (outputs: any[]) => {
    const result = {
        cssContent: '',
        jsContent: '',
        componentName: '',
        componentId: '',
        jsPath: '',
        buildPath: ''
    }

    if (!outputs) return result

    for (const output of outputs) {
        if (output.kind === "entry-point") {
            result.jsContent = await output.text();

            const regex = /export\s*[\{\(\[]\s*([a-zA-Z0-9_$&]+)\s+as\s+default\s*[\}\)\]]\s*;?/;
            const match = result.jsContent.match(regex);
            result.componentName = match?.[1] || '';

            result.componentId = hashFilePath(relative(process.cwd(), output.path))
            result.jsPath = '/' + relative(process.cwd(), output.path);
            result.buildPath = output.path
        } else if (output.path.endsWith('.css')) {
            result.cssContent += await output.text();
        }
    }

    return result
}
