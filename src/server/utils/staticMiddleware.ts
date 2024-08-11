import { Elysia } from 'elysia';
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

export function createStaticMiddleware(publicDir: string) {
    return async ({ request }: any) => {
        const url = new URL(request.url);
        const filePath = path.join(publicDir, url.pathname);

        try {
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = mimeTypes[ext] || 'text/plain';
                const content = await fs.readFile(filePath);

                return new Response(content, {
                    headers: { 'Content-Type': contentType },
                });
            }
        } catch (error) {
            // File not found, continue to next middleware
        }

        // Continue to the next middleware or route handler
        // return next();
    };
}
