import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'buffer';
import { spawn } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Connect } from 'vite';

// MCP server process handler
let mcpProcess: ReturnType<typeof spawn> | null = null;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mcp-middleware',
      configureServer(server) {
        server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          console.log('[MCP Middleware] Request URL:', req.url);
          console.log('[MCP Middleware] Request method:', req.method);
          
          if (req.url?.startsWith('/api/mcp')) {
            console.log('[MCP Middleware] Handling MCP request');
            // Start MCP server if not running
            if (!mcpProcess) {
              console.log('[MCP Middleware] Starting MCP server process');
              mcpProcess = spawn('node', ['/Users/cheshir/Documents/Cline/MCP/solana-explorer-server/build/index.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
              });

              mcpProcess.stdout?.on('data', (data) => {
                console.log(`MCP stdout: ${data}`);
              });

              mcpProcess.stderr?.on('data', (data) => {
                console.error(`MCP stderr: ${data}`);
              });

              // Wait for server to start
              await new Promise((resolve) => setTimeout(resolve, 1000));
              console.log('[MCP Middleware] MCP server process started');
            } else {
              console.log('[MCP Middleware] Using existing MCP server process');
            }

            // Handle MCP request/response
            try {
              console.log('[MCP Middleware] Processing request');
              const chunks: Buffer[] = [];
              await new Promise<void>((resolve, reject) => {
                req.on('data', (chunk: Buffer) => chunks.push(chunk));
                req.on('end', resolve);
                req.on('error', reject);
              });

              const requestData = Buffer.concat(chunks);
              const requestStr = requestData.toString();
              console.log('[MCP Middleware] Request data:', requestStr);
              
              try {
                // Validate request JSON
                JSON.parse(requestStr);
              } catch (e) {
                console.error('[MCP Middleware] Invalid JSON in request:', e);
                throw new Error('Invalid JSON in request body');
              }

              if (!mcpProcess?.stdin || !mcpProcess?.stdout) {
                console.error('[MCP Middleware] MCP server process not properly initialized');
                throw new Error('MCP server process not properly initialized');
              }

              console.log('[MCP Middleware] MCP server process ready');

              // Set up response handling before sending request
              const responsePromise = new Promise<Buffer>((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error('MCP server response timeout'));
                }, 5000);

                const chunks: Buffer[] = [];
                let responseReceived = false;

                const handleData = (data: Buffer) => {
                  console.log('Raw MCP response chunk:', data.toString());
                  chunks.push(data);
                };

                const handleError = (data: Buffer) => {
                  console.error('MCP server error:', data.toString());
                  clearTimeout(timeout);
                  reject(new Error(`MCP server error: ${data.toString()}`));
                };

                const cleanup = () => {
                  mcpProcess?.stdout?.removeListener('data', handleData);
                  mcpProcess?.stderr?.removeListener('data', handleError);
                };

                mcpProcess?.stdout?.on('data', handleData);
                mcpProcess?.stderr?.on('data', handleError);

                // Check for complete response every 100ms
                const checkInterval = setInterval(() => {
                  if (chunks.length > 0) {
                    const completeResponse = Buffer.concat(chunks).toString();
                    try {
                      JSON.parse(completeResponse);
                      // If we can parse it as JSON, it's a complete response
                      clearInterval(checkInterval);
                      clearTimeout(timeout);
                      cleanup();
                      resolve(Buffer.from(completeResponse));
                      responseReceived = true;
                    } catch (_) {
                      // Not a complete JSON response yet, keep waiting
                    }
                  }
                }, 100);

                // Clean up interval if timeout occurs
                timeout.unref(); // Don't let timeout prevent process exit
                timeout.ref(); // But do let it trigger if time expires
                setTimeout(() => {
                  if (!responseReceived) {
                    clearInterval(checkInterval);
                    cleanup();
                  }
                }, 5000);
              });

              // Send the request
              console.log('[MCP Middleware] Writing to MCP server stdin');
              mcpProcess.stdin.write(requestData + '\n');
              console.log('[MCP Middleware] Request sent to MCP server');

              // Wait for response
              console.log('[MCP Middleware] Waiting for MCP server response');
              const responseData = await responsePromise;
              const responseStr = responseData.toString();
              console.log('[MCP Middleware] Raw MCP response:', responseStr);
              
              try {
                // Validate response JSON
                JSON.parse(responseStr);
              } catch (e) {
                console.error('[MCP Middleware] Invalid JSON in response:', e);
                throw new Error('Invalid JSON in server response');
              }

              // Send response to client with CORS headers
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Content-Type', 'application/json');

              if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
              }

              // Parse and validate response before sending
              try {
                const jsonResponse = JSON.parse(responseData.toString());
                res.end(JSON.stringify(jsonResponse));
              } catch (error) {
                console.error('Invalid JSON response:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Invalid server response' }));
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('MCP middleware error:', errorMessage);
              
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                error: 'Internal server error',
                details: errorMessage
              }));
            }

            return;
          }
          next();
        });
      }
    }
  ],
  server: {},
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@solana/web3.js', 'buffer'],
  },
  resolve: {
    alias: {
      'stream': 'stream-browserify',
      'buffer': 'buffer',
    },
  },
  define: {
    'process.env': {},
    'global': {
      Buffer: Buffer
    },
  },
  build: {
    rollupOptions: {
      plugins: [],
    },
  },
});
