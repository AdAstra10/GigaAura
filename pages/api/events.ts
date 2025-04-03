import { NextApiRequest, NextApiResponse } from 'next';

// Define a custom type that extends NextApiResponse to include the flush method
interface ResponseWithFlush extends NextApiResponse {
  flush?: () => void;
}

// Keep track of connected clients
const connectedClients = new Set<ResponseWithFlush>();

// Ping interval for keeping connections alive (15 seconds)
const KEEP_ALIVE_INTERVAL = 15 * 1000;
// Connection timeout (1 hour)
const CONNECTION_TIMEOUT = 60 * 60 * 1000;

// Function to send event to all connected clients
function sendEventToAll(event: string, data: any) {
  const eventString = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  console.log(`Sending event to ${connectedClients.size} clients:`, event);
  
  connectedClients.forEach((client) => {
    try {
      client.write(eventString);
      // Use flush if it exists (not all platforms support it)
      if (client.flush && typeof client.flush === 'function') {
        client.flush();
      }
    } catch (error) {
      console.error('Error sending event to client:', error);
    }
  });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers to allow cross-origin access to this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
  
  // Cast response to our custom type that includes flush
  const response = res as ResponseWithFlush;
  
  // Set headers for SSE
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform, no-store');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.status(200);
  
  // Send initial connection success message
  response.write('event: connected\ndata: {"status":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
  if (response.flush) response.flush();
  
  // Add current client to the set of connected clients
  connectedClients.add(response);
  console.log(`Client connected. Total connected clients: ${connectedClients.size}`);
  
  // Set up ping interval to keep the connection alive
  const pingInterval = setInterval(() => {
    try {
      response.write(`event: ping\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`);
      if (response.flush) response.flush();
    } catch (error) {
      console.error('Error sending ping, closing connection:', error);
      clearInterval(pingInterval);
      clearTimeout(connectionTimeout);
      connectedClients.delete(response);
      response.end();
    }
  }, KEEP_ALIVE_INTERVAL);
  
  // Set timeout to close inactive connections
  const connectionTimeout = setTimeout(() => {
    clearInterval(pingInterval);
    connectedClients.delete(response);
    response.end();
    console.log(`Connection timeout after ${CONNECTION_TIMEOUT}ms. Clients remaining: ${connectedClients.size}`);
  }, CONNECTION_TIMEOUT);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    clearTimeout(connectionTimeout);
    connectedClients.delete(response);
    console.log(`Client disconnected. Clients remaining: ${connectedClients.size}`);
  });
}

// Expose function to allow other modules to trigger events
export { sendEventToAll }; 