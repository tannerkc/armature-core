#!/usr/bin/env bun
import { createServer } from '../../server';
import { spawn } from 'bun';
import path from 'path';

// const server = resolve('../../server/index.ts');
const server = path.join(process.cwd(), 'src', 'server', 'index.ts');

// Function to start the server
export function startServer() {
    // console.log('Starting Elysia development server...');
    // const serverProcess = spawn({
    //     cmd: ['bun', server],
    //     stdout: 'inherit',
    //     stderr: 'inherit',
    // });

    // serverProcess.on('exit', (code: number) => {
    //     if (code !== 0) {
    //         console.error(`Server process exited with code ${code}`);
    //     }
    // });

    // return serverProcess;
    createServer()
}

// Function to watch for file changes
export function watchFiles() {
    // console.log('Watching for file changes...');
    // const watcher = Bun.watch([server], {
    //     persistent: true,
    //     onChange: () => {
    //         console.log('File changed. Restarting server...');
    //         serverProcess.stop();
    //         serverProcess = startServer();
    //     },
    // });

    // return watcher;
}
