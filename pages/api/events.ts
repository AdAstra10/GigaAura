import { NextApiRequest, NextApiResponse } from 'next';

// Global map of connected clients
let clients = new Map<string, NextApiResponse>();

// Keep track of connection counts
let totalConnections = 0;
let activeConnections = 0;

// Function to send event to all connected clients
export const sendEventToAll = (event: any) => {
  const eventData = `data: ${JSON.stringify(event)}\n\n`;
  
  clients.forEach((res, clientId) => {
    try {
      res.write(eventData);
    } catch (error) {
      console.error(`Error sending event to client ${clientId}:`, error);
      // Remove client on error
      clients.delete(clientId);
      activeConnections--;
    }
  });
};

// Function to send keep-alive pings
const sendKeepAlive = () => {
  console.log(`Sending keep-alive to ${clients.size} clients`);
  clients.forEach((res, clientId) => {
    try {
      // Send a comment as keep-alive (won't trigger event handlers on client)
      res.write(`: keep-alive ${new Date().toISOString()}\n\n`);
    } catch (error) {
      console.error(`Error sending keep-alive to client ${clientId}:`, error);
      // Remove client on error
      clients.delete(clientId);
      activeConnections--;
    }
  });
};

// Set up a keep-alive interval (every 30 seconds)
let keepAliveInterval: NodeJS.Timeout | null = null;
if (typeof setInterval !== 'undefined') {
  keepAliveInterval = setInterval(sendKeepAlive, 30000);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Add more headers to prevent caching
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx
  res.setHeader('Content-Encoding', 'none');
  
  // Generate a unique client ID
  totalConnections++;
  const clientId = `${Date.now()}-${totalConnections}`;
  activeConnections++;
  
  // Store the client's response object
  clients.set(clientId, res);
  console.log(`Client connected: ${clientId}, total clients: ${clients.size}, all-time: ${totalConnections}`);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', id: clientId, timestamp: new Date().toISOString() })}\n\n`);
  
  // Send an immediate keep-alive
  res.write(`: keep-alive ${new Date().toISOString()}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    clients.delete(clientId);
    activeConnections--;
    console.log(`Client disconnected: ${clientId}, remaining clients: ${clients.size}, active: ${activeConnections}`);
    res.end();
  });
  
  // Add a watchdog with a 2-minute timeout
  req.socket.setTimeout(120000, () => {
    console.log(`Connection timeout for client ${clientId}`);
    clients.delete(clientId);
    activeConnections--;
    res.end();
  });
} 