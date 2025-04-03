import { NextApiRequest, NextApiResponse } from 'next';

// Global map of connected clients
let clients = new Map<string, NextApiResponse>();

// Keep track of connection counts
let totalConnections = 0;
let activeConnections = 0;

// Define interface for response with flush method
interface ResponseWithFlush extends NextApiResponse {
  flush?: () => void;
}

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

// Set up a keep-alive interval (every 15 seconds instead of 30)
let keepAliveInterval: NodeJS.Timeout | null = null;
if (typeof setInterval !== 'undefined') {
  keepAliveInterval = setInterval(sendKeepAlive, 15000);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cast response to our extended interface
  const response = res as ResponseWithFlush;
  
  // Enhanced CORS headers to fix cross-origin issues
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return response.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }
  
  // Set headers for SSE - enhanced for cross-browser compatibility
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
  
  // Add more headers to prevent caching/buffering
  response.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx
  response.setHeader('Content-Encoding', 'identity'); // No compression for SSE
  
  // Generate a unique client ID
  totalConnections++;
  const clientId = `${Date.now()}-${totalConnections}`;
  activeConnections++;
  
  // Store the client's response object
  clients.set(clientId, response);
  console.log(`Client connected: ${clientId}, total clients: ${clients.size}, all-time: ${totalConnections}`);
  
  // Send initial connection message
  response.write(`data: ${JSON.stringify({ type: 'connected', id: clientId, timestamp: new Date().toISOString() })}\n\n`);
  
  // Send an immediate keep-alive
  response.write(`: keep-alive ${new Date().toISOString()}\n\n`);
  
  // Force flush any buffered data
  if (response.flush) {
    response.flush();
  }
  
  // Handle client disconnect
  const closeHandler = () => {
    clients.delete(clientId);
    activeConnections--;
    console.log(`Client disconnected: ${clientId}, remaining clients: ${clients.size}, active: ${activeConnections}`);
    response.end();
  };
  
  req.on('close', closeHandler);
  req.on('end', closeHandler);
  
  // Add a watchdog with a 2-minute timeout
  req.socket.setTimeout(120000, () => {
    console.log(`Connection timeout for client ${clientId}`);
    clients.delete(clientId);
    activeConnections--;
    response.end();
  });
  
  // Keep connection alive for mobile browsers
  req.socket.setKeepAlive(true);
  
  // Send all current posts as an initial event
  try {
    const db = require('../../giga-aura/services/db-init').default;
    const posts = await db.getPosts();
    if (posts && posts.length > 0) {
      response.write(`data: ${JSON.stringify({ 
        type: 'initial-posts',
        count: posts.length,
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      // Force flush
      if (response.flush) {
        response.flush();
      }
    }
  } catch (error) {
    console.error('Error sending initial posts data:', error);
  }
} 