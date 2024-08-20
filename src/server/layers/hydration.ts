import { log } from "../../index";
import { existsSync } from "fs";
import { join } from "path";
import { minifySync } from "@swc/core";
import debug from "../../utils/debug";

export const handleHydrationRequest = async (c: any) => {
    try {
      const url = new URL(c.request.url);
      debug(`Attempting to serve route: ${url.pathname}`);
      let filePath = url.pathname
  
      if (!filePath) {
        debug(`Route file not found for: ${url.pathname}`);
        return new Response('Not Found', { status: 404 });
      }

      const file = join(process.cwd(), filePath)

      if(!existsSync(file)) return new Response('Not Found', { status: 404 });
      
      debug(`File found: ${file}`)
      
      let jsFile = Bun.file(file);
      let jsContent = await jsFile.text();
    
      return new Response(jsContent, {
        headers: { 'Content-Type': 'application/javascript' }
      })
    } catch (error: any) {
      log.error('Unhandled hydration error:' + error);
      return new Response('Internal Server Error', { status: 500 });
    }
};
