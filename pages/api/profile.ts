import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/postgresql-db';
import { getSession } from 'next-auth/react'; // Assuming you use next-auth for session management
import { User } from '@lib/slices/userSlice'; // Import the User type

// Helper function for CORS headers (optional, copy from posts.ts if needed)
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS'); // Adjust allowed methods
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- Authentication Check --- 
  // IMPORTANT: Add proper authentication/authorization check here.
  // Use the method appropriate for your app (e.g., next-auth, custom tokens).
  // This example assumes next-auth. Adjust as needed.
  // const session = await getSession({ req });
  // if (!session || !session.user?.walletAddress) { 
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }
  // const authenticatedUserWallet = session.user.walletAddress;
  // --- End Authentication Check --- 

  // Placeholder for wallet address - REPLACE with actual authenticated user wallet
  // For now, we might need to pass it in the body for testing, but this is insecure.
  const { walletAddress, ...profileData } = req.body as Partial<User> & { walletAddress: string };
  
  // Validate that the wallet address is provided (either from session or body for now)
  if (!walletAddress) {
     return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Add validation: Ensure the authenticated user can only update their own profile
  // if (authenticatedUserWallet !== walletAddress) {
  //    return res.status(403).json({ error: 'Forbidden' });
  // }

  if (req.method === 'PUT') {
    // Update user profile
    try {
      // Construct the user object for the database function
      const userUpdateData: Partial<User> & { walletAddress: string } = {
        walletAddress: walletAddress, // Use the validated wallet address
        ...profileData // Include fields like username, avatar, bio, bannerImage
      };

      // Validate specific fields if necessary (e.g., username uniqueness - requires db check)
      // if (profileData.username) { ... check uniqueness ... }

      const success = await db.updateUser(userUpdateData);

      if (success) {
        // Optionally return the updated user data (fetch it if needed)
        // const updatedUser = await db.getUser(walletAddress);
        return res.status(200).json({ success: true, message: 'Profile updated successfully' /*, user: updatedUser */ });
      } else {
        return res.status(500).json({ error: 'Failed to update profile in database' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Internal server error while updating profile' });
    }
  } else if (req.method === 'GET') {
    // Get user profile (optional - implement if needed)
     try {
        // Fetch user profile data using walletAddress (ensure it's the authenticated user's)
        const userProfile = await db.getUser(walletAddress);
        if (userProfile) {
          return res.status(200).json(userProfile);
        } else {
          return res.status(404).json({ error: 'User profile not found' });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({ error: 'Internal server error while fetching profile' });
      }
  } else {
    // Method not allowed
    res.setHeader('Allow', ['PUT', 'GET', 'OPTIONS']);
    res.status(405).json({ warning: `Method ${req.method} Not Allowed` });
  }
} 