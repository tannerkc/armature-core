#!/usr/bin/env bun

import { startServer, watchFiles } from './dev';

const [,, command] = process.argv;

if (command === 'dev') {
    startServer();
    watchFiles();
} else {
  console.log('Unknown command. Available commands: dev');
}
