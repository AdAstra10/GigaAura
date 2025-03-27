# GigaAura - Social Media with Crypto Wallet Integration

GigaAura is a modern social media platform with cryptocurrency wallet integration, specifically designed for use with Phantom Wallet. The platform rewards user engagement with "Aura Points" based on interactions.

## Features

- **Wallet-Based Authentication**: Secure login via Phantom Wallet integration
- **User Profiles**: Unique profiles tied to wallet addresses
- **Social Interactions**: Post, like, comment, and share content
- **Aura Points System**: Earn points through platform engagement
  - Post Creation: +5 Aura Points
  - Likes Received: +1 Aura Point
  - Comments Made: +1 Aura Point
  - New Followers: +1 Aura Point
  - Shares: +1 Aura Point for both creator and sharer
- **Real-time Feed**: View posts from followed users and trending content
- **Notifications**: Instant notifications for likes, comments, shares, and new followers

## Technology Stack

- **Frontend**:
  - React with Next.js
  - TypeScript
  - Redux for state management
  - Tailwind CSS for styling
  - Socket.IO for real-time updates

- **Blockchain Integration**:
  - Phantom Wallet SDK
  - Solana Web3.js

## Getting Started

### Prerequisites

- Node.js 14+ installed
- Phantom Wallet browser extension

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/AdAstra10/GigaAura.git
   cd GigaAura
   ```

2. Install dependencies:
   ```
   cd giga-aura
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

### Deployment

This project is configured for deployment on Render.com using the `render.yaml` configuration file.

## Project Structure

```
giga-aura/
├── components/        # Reusable UI components
├── contexts/          # React contexts (Wallet context, etc.)
├── lib/               # Core logic
│   └── slices/        # Redux state slices
├── pages/             # Next.js pages
│   └── api/           # API routes
├── public/            # Static assets
├── styles/            # Global styles
├── utils/             # Utility functions
└── README.md          # Project documentation
```

## License

ISC 