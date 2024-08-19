import { Elysia, type AnyElysia } from 'elysia';
import fs from 'fs/promises';
import path from 'path';

const mimeTypes: Record<string, string> = {
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
};

export const createStaticMiddleware = (publicDir: string, cacheDuration: number = 3600) => {
    return async ({ request }: any) => {
        const url = new URL(request.url);
        const filePath = path.join(publicDir, url.pathname);

        try {
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = mimeTypes[ext] || 'text/plain';
                const file = Bun.file(filePath);
                const content = await file.text();

                return new Response(content, {
                    headers: {
                        'Content-Type': contentType,
                        // 'Cache-Control': `public, max-age=${cacheDuration}`,
                    },
                });
            }
        } catch (error) {
            // File not found, continue to next middleware
        }

        return;
    };
}

export const handleCssRequest = async (c: any, publicFolder: string) => {
    const cssPath = path.join(publicFolder, 'global.css');
    const cssFile = Bun.file(cssPath);
    const cssContent = await cssFile.text();
    
    return new Response(cssContent, {
      headers: { 'Content-Type': 'text/css' }
    });
}
