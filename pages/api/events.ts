import { NextApiRequest, NextApiResponse } from 'next';

// Global map of connected clients
let clients = new Map<string, NextApiResponse>();

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
    }
  });
};

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
  
  // Generate a unique client ID
  const clientId = Date.now().toString();
  
  // Store the client's response object
  clients.set(clientId, res);
  console.log(`Client connected: ${clientId}, total clients: ${clients.size}`);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', id: clientId })}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}, remaining clients: ${clients.size}`);
    res.end();
  });
} 