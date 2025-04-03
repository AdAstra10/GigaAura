import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/db-init';
import { AuraTransaction } from '../../lib/slices/auraPointsSlice';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // GET request to fetch aura points for a wallet
    if (req.method === 'GET') {
      const { walletAddress } = req.query;
      
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: 'Wallet address is required' });
      }
      
      const auraPoints = await db.getAuraPoints(walletAddress);
      if (!auraPoints) {
        return res.status(404).json({ error: 'Aura points not found' });
      }
      
      return res.status(200).json(auraPoints);
    }
    
    // POST request to add a transaction
    if (req.method === 'POST') {
      const { walletAddress, transaction }: { walletAddress: string, transaction: AuraTransaction } = req.body;
      
      if (!walletAddress || !transaction) {
        return res.status(400).json({ error: 'Wallet address and transaction are required' });
      }
      
      // Add the transaction
      const success = await db.addTransaction(walletAddress, transaction);
      
      if (success) {
        return res.status(201).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Failed to add transaction' });
      }
    }
    
    // If the method is not supported
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 