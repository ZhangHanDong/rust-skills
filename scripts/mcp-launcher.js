#!/usr/bin/env node
// Cross-platform MCP server launcher
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const [serverName, ...serverArgs] = args;

const servers = {
  actionbook: {
    package: '@actionbookdev/mcp@latest',
    args: []
  }
};

const server = servers[serverName];
if (!server) {
  console.error(`Unknown server: ${serverName}`);
  process.exit(1);
}

const npxArgs = ['-y', server.package, ...server.args, ...serverArgs];

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(cmd, npxArgs, {
  stdio: 'inherit',
  shell: isWindows
});

child.on('error', (err) => {
  console.error(`Failed to start ${serverName}:`, err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
