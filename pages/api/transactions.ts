import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/db-init';
import { AuraTransaction } from '../../lib/slices/auraPointsSlice';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Add cache control headers to prevent caching issues
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
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
      
      try {
        const auraPoints = await db.getAuraPoints(walletAddress);
        if (!auraPoints) {
          // Return default values if no aura points found
          return res.status(200).json({ totalPoints: 100, transactions: [] });
        }
        
        return res.status(200).json(auraPoints);
      } catch (dbError) {
        console.error('Database error in GET /api/transactions:', dbError);
        // Return default values
        return res.status(200).json({ 
          totalPoints: 100, 
          transactions: [],
          source: 'default'
        });
      }
    }
    
    // POST request to add a transaction
    if (req.method === 'POST') {
      const { walletAddress, transaction }: { walletAddress: string, transaction: AuraTransaction } = req.body;
      
      if (!walletAddress || !transaction) {
        return res.status(400).json({ error: 'Wallet address and transaction are required' });
      }
      
      try {
        // Add the transaction
        const success = await db.addTransaction(walletAddress, transaction);
        
        if (success) {
          return res.status(201).json({ success: true });
        } else {
          // Still return 200 with a warning to allow client to continue
          return res.status(200).json({ 
            success: false, 
            warning: 'Failed to add transaction to database, but client can proceed',
            transaction: transaction 
          });
        }
      } catch (transactionError) {
        console.error('Transaction error in POST /api/transactions:', transactionError);
        // Return 200 with the transaction to allow client to handle it
        return res.status(200).json({ 
          success: false,
          warning: 'Error occurred while saving transaction, but client can proceed',
          transaction: transaction 
        });
      }
    }
    
    // If the method is not supported
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(200).json({ 
      success: false, 
      warning: 'Internal server error, but client can proceed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 