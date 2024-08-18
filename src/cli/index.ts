#!/usr/bin/env bun

import debug from '../utils/debug';
import { log } from '..';
import { startServer, watchFiles } from './dev';
import { dirname, join } from 'path';

const [,, command] = process.argv;

const __dirname = dirname(Bun.fileURLToPath(import.meta.url));

// Construct the path to the server script
const serverScriptPath = join(__dirname, "../server/index.js");

if (command === 'dev') {
  const runBunServer = () => {
    const process = Bun.spawn({
      cmd: ["bun", "--hot", serverScriptPath],
      stdout: "inherit",
      stderr: "inherit"
    });

    process.exited.then(() => {
      log.gen("Server process exited.");
    });
  }

  // runBunServer();
  startServer();
  // watchFiles();
} else {
  console.log('Unknown command. Available commands: dev');
}
