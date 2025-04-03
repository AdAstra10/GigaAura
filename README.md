# GigaAura

GigaAura is a decentralized social platform that allows users to connect their Phantom wallets, create posts, earn Aura Points, and engage with other users.

## 🚀 Key Features

- Connect your Phantom wallet for authentication
- Create and share posts
- Earn Aura Points through engagement
- Like, comment, and share posts
- Follow other users
- Dark mode support

## 📦 Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL (primary), with Cloudflare KV fallback
- **Authentication**: Phantom Wallet (Solana)
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS

## 🏗️ Project Structure

- `/components` - React components
- `/lib/slices` - Redux slices
- `/pages` - Next.js pages
- `/public` - Static assets
- `/services` - Database services (PostgreSQL, Cloudflare KV)
- `/styles` - Global styles

## 🔧 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- PostgreSQL database instance (or use the provided Render.com instance)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/AdAstra10/GigaAura.git
   cd GigaAura
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following environment variables:
   ```
   # PostgreSQL Database Configuration (Primary)
   PG_HOST=dpg-cvmv93k9c44c73blmoag-a.oregon-postgres.render.com
   PG_DATABASE=gigaaura_storage
   PG_USER=gigaaura_storage_user
   PG_PASSWORD=Va7MYYSwuwJCKtJQui7DuYlIv7ZUCMRl
   PG_PORT=5432
   
   # Legacy Cloudflare KV Configuration (Optional)
   CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
   CLOUDFLARE_NAMESPACE_ID=your_cloudflare_namespace_id
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
   CLOUDFLARE_API_URL=https://api.cloudflare.com/client/v4
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 💾 Database Migration

GigaAura has recently migrated from Firebase to PostgreSQL as its primary database. The migration includes:

1. New PostgreSQL database service in `services/postgresql-db.ts`
2. Database switching utility in `services/db-switch.ts` for backwards compatibility
3. Updated environment variables in `.env.local`

All Firebase references have been removed from the codebase. The application now uses PostgreSQL exclusively.

### Database Schema

The PostgreSQL database includes the following tables:

- **posts** - Stores all posts with their content, author information, likes, and comments
- **aura_points** - Stores Aura Points for each wallet address with transaction history
- **users** - Stores user profiles, including username, avatar, bio, and following/followers

## 🌐 Local Storage and Offline Support

GigaAura includes robust offline support through local storage:

- Posts are stored locally for immediate display
- User data and preferences are cached
- Aura points are backed up to prevent loss

When the app regains database connectivity, local changes are synchronized automatically.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details. 