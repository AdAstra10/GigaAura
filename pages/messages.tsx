import { useState, useEffect, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../lib/store';
// Import User type from slice and rename it
import { User as ReduxUser } from '../lib/slices/userSlice'; 
import Layout from '../components/Layout'; // Import Layout
import { PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Local interface for mock data structure - name kept as User
interface User {
  id: string;
  username: string;
  avatar: string;
  walletAddress: string;
}

interface Message {
  id: string;
  senderId: string; // Use walletAddress here now
  senderWalletAddress: string;
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  participants: User[]; // Uses local User interface
  messages: Message[];
  lastMessage?: Message;
}

// Mock data - replace with Redux state and fetch logic
const mockConversations: Conversation[] = [
  {
    id: 'conv1', 
    participants: [{ id: 'user1', username: 'Alice', avatar: '/avatars/avatar1.png', walletAddress: '0xabc123' }, { id: 'user0', username: 'You', avatar: '/avatars/myavatar.png', walletAddress: '0x123def' }], // Example distinct addresses
    messages: [{id: 'm1', senderId: '0xabc123', senderWalletAddress: '0xabc123', text: 'Hey there!', timestamp: new Date(Date.now() - 60000 * 5).toISOString()}],
    lastMessage: {id: 'm1', senderId: '0xabc123', senderWalletAddress: '0xabc123', text: 'Hey there!', timestamp: new Date(Date.now() - 60000 * 5).toISOString()}
  },
   {
    id: 'conv2', 
    participants: [{ id: 'user2', username: 'Bob Blockchain', avatar: '/avatars/avatar2.png', walletAddress: '0xdef456' }, { id: 'user0', username: 'You', avatar: '/avatars/myavatar.png', walletAddress: '0x123def' }],
    messages: [{id: 'm2', senderId: '0xdef456', senderWalletAddress: '0xdef456', text: 'Did you see the latest NFT drop?', timestamp: new Date(Date.now() - 60000 * 60 * 2).toISOString()}],
    lastMessage: {id: 'm2', senderId: '0xdef456', senderWalletAddress: '0xdef456', text: 'Did you see the latest NFT drop?', timestamp: new Date(Date.now() - 60000 * 60 * 2).toISOString()}
  },
];

const MessagesPage: NextPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { connected, walletAddress } = useWallet(); 
  // Use the renamed ReduxUser type here if needed, but currentUser state structure is defined by the slice
  const currentUser = useSelector((state: RootState) => state.user);

  // const conversations = useSelector((state: RootState) => state.messages.conversations);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations); // Using mock data
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false); // For potential async operations

  // Find the selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  // Find the other participant based on walletAddress comparison
  const otherParticipant = selectedConversation?.participants.find(p => p.walletAddress !== walletAddress);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Fetch conversations on mount (replace with actual fetch)
  useEffect(() => {
    if (connected) {
      // dispatch(fetchConversations());
      console.log("Fetching conversations (mocked)...");
      setIsLoading(false); 
    }
  }, [dispatch, connected]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId || !walletAddress) return;
    
    const messageData: Message = {
      id: `msg-${Date.now()}`,
      // Use walletAddress directly as senderId
      senderId: walletAddress, 
      senderWalletAddress: walletAddress,
      text: newMessage,
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI update
    setConversations(prevConvs => 
      prevConvs.map(conv => 
        conv.id === selectedConversationId 
          ? { ...conv, messages: [...conv.messages, messageData], lastMessage: messageData } 
          : conv
      )
    );
    setNewMessage('');
    
    // Mock send
    console.log("Sending message (mocked):", messageData);
    toast.success("Message sent (mocked).");

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  // Mobile: Function to go back to conversation list
  const handleBackToList = () => {
    setSelectedConversationId(null);
  };

  // Determine if the message sender is the current user by comparing wallet addresses
  const isCurrentUserSender = (message: Message): boolean => {
    return message.senderWalletAddress === walletAddress;
  };

  return (
    // Use Layout, potentially hide right sidebar if needed by passing null or omitting prop
    <Layout>
      <Head>
        <title>Messages | GigaAura</title>
        <meta name="description" content="Direct messages on GigaAura" />
      </Head>

      <div className="flex h-[calc(100vh)]"> {/* Full height chat interface */} 
        {/* Conversation List (Hidden on mobile when a chat is open) */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-bold text-black dark:text-white">Messages</h1>
            {/* TODO: Add New Message button */} 
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              // Find the other user for display
              const otherUser = conv.participants.find(p => p.walletAddress !== walletAddress);
              return (
                <div
                  key={conv.id}
                  className={`flex items-center p-3 space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 ${selectedConversationId === conv.id ? 'bg-gray-100 dark:bg-gray-900' : ''}`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                   {/* Use Next Image */}
                   <Image 
                      src={otherUser?.avatar || '/default-avatar.png'} 
                      alt={otherUser?.username || 'User'} 
                      width={40} 
                      height={40} 
                      className="rounded-full object-cover" // Added object-cover
                    />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm text-black dark:text-white truncate">{otherUser?.username || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.lastMessage?.text}</p>
                  </div>
                </div>
              );
            })}
            {conversations.length === 0 && (
              <p className="p-4 text-center text-gray-500">No conversations yet.</p>
            )}
          </div>
        </div>

        {/* Message View (Hidden on mobile if no chat is open) */}
        <div className={`w-full md:w-2/3 flex flex-col ${selectedConversationId ? 'flex' : 'hidden md:flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-3">
                {/* Back button for mobile */} 
                <button onClick={handleBackToList} className="md:hidden text-black dark:text-white mr-2">
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                {otherParticipant && (
                  <Link href={`/profile/${otherParticipant.walletAddress}`} passHref>
                    <div className="flex items-center space-x-2 cursor-pointer">
                       <Image 
                         src={otherParticipant.avatar || '/default-avatar.png'} 
                         alt={otherParticipant.username || 'User'} 
                         width={32} 
                         height={32} 
                         className="rounded-full object-cover" // Added object-cover
                        />
                       <span className="font-medium text-black dark:text-white">{otherParticipant.username}</span>
                    </div>
                  </Link>
                )}
                 {/* TODO: Add options button (info, etc.) */} 
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
                {selectedConversation.messages.map((message) => (
                  <div key={message.id} className={`flex ${isCurrentUserSender(message) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2 px-3 rounded-lg max-w-xs lg:max-w-md ${isCurrentUserSender(message) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'}`}>
                      {message.text}
                       {/* Optional: Timestamp */} 
                       {/* <span className="text-xs opacity-70 block mt-1">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span> */}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} /> {/* Anchor for scrolling */} 
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                <div className="flex items-center space-x-2">
                  {/* TODO: Add attachment button */} 
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} // Prevent sending on Shift+Enter
                    placeholder="Start a new message..."
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-full bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-primary text-sm text-black dark:text-white"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 rounded-full bg-primary text-white disabled:opacity-50 hover:bg-primary-hover transition-colors flex-shrink-0" // Added flex-shrink-0
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start messaging.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MessagesPage; 