import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { useWallet } from '../contexts/WalletContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Contact {
  walletAddress: string;
  username: string | null;
  avatar: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

const MessagesPage = () => {
  const { connected, walletAddress } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from local storage
  useEffect(() => {
    const storedMessages = localStorage.getItem('messages');
    const parsedMessages = storedMessages ? JSON.parse(storedMessages) : [];
    setMessages(parsedMessages);
    
    // Demo contacts - in a real app, these would come from a database
    // Use following list as contacts for this demo
    const demoContacts: Contact[] = [
      {
        walletAddress: '8zJ9Sze6ocMMJ7tG74DB9qLGBvxsKNwP6X9x5KY1U2XB',
        username: 'Alice',
        avatar: 'https://i.pravatar.cc/300?img=1',
        lastMessage: 'Hey, how are you doing?',
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 2
      },
      {
        walletAddress: '4tQ5PJsAz3qXbphrdUUGHokGQJpKE8YRZ2L6qySQa4w2',
        username: 'Bob',
        avatar: 'https://i.pravatar.cc/300?img=4',
        lastMessage: 'Did you see the latest NFT drop?',
        lastMessageTime: new Date(Date.now() - 86400000).toISOString(),
        unreadCount: 0
      },
      {
        walletAddress: '9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo6bEpwLKvCcPY',
        username: 'Charlie',
        avatar: 'https://i.pravatar.cc/300?img=5',
        lastMessage: 'Let\'s catch up soon',
        lastMessageTime: new Date(Date.now() - 259200000).toISOString(),
        unreadCount: 0
      }
    ];
    
    setContacts(demoContacts);
    setIsLoading(false);
  }, []);

  // Save messages to local storage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedContact]);

  // Filter messages for selected contact
  const currentMessages = selectedContact 
    ? messages.filter(
        msg => 
          (msg.sender === walletAddress && msg.recipient === selectedContact.walletAddress) ||
          (msg.sender === selectedContact.walletAddress && msg.recipient === walletAddress)
      )
    : [];

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    
    // Mark messages from this contact as read
    setMessages(prev => 
      prev.map(msg => 
        msg.sender === contact.walletAddress && msg.recipient === walletAddress && !msg.read
          ? { ...msg, read: true }
          : msg
      )
    );
    
    // Update unread count for this contact
    setContacts(prev => 
      prev.map(c => 
        c.walletAddress === contact.walletAddress
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact || !walletAddress) return;
    
    const newMsg: Message = {
      id: uuidv4(),
      sender: walletAddress,
      recipient: selectedContact.walletAddress,
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setMessages(prev => [...prev, newMsg]);
    
    // Update the last message for this contact
    setContacts(prev => 
      prev.map(c => 
        c.walletAddress === selectedContact.walletAddress
          ? { 
              ...c, 
              lastMessage: newMessage, 
              lastMessageTime: new Date().toISOString()
            }
          : c
      )
    );
    
    setNewMessage('');
  };

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If it's today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If it's yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  // Show wallet address in user-friendly format
  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  // Generate mock reply for demo
  const generateMockReply = (contactName: string | null) => {
    const replies = [
      `Hey there! This is a demo message from ${contactName || 'Contact'}.`,
      `Thanks for your message! The messaging system is working.`,
      `I'll respond to your real message soon!`,
      `This is just a mock reply for demonstration purposes.`,
      `In a real app, this would be connected to a blockchain messaging protocol.`
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  // Simulate receiving a reply from the selected contact after sending a message
  useEffect(() => {
    if (selectedContact && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // If the last message was sent by the user to the selected contact
      if (lastMessage.sender === walletAddress && lastMessage.recipient === selectedContact.walletAddress) {
        // Simulate a delay before the contact "replies"
        const replyTimer = setTimeout(() => {
          const mockReply: Message = {
            id: uuidv4(),
            sender: selectedContact.walletAddress,
            recipient: walletAddress || '',
            content: generateMockReply(selectedContact.username),
            timestamp: new Date().toISOString(),
            read: true // Mark as read since conversation is open
          };
          
          setMessages(prev => [...prev, mockReply]);
          
          // Update contact's last message
          setContacts(prev => 
            prev.map(c => 
              c.walletAddress === selectedContact.walletAddress
                ? { 
                    ...c, 
                    lastMessage: mockReply.content, 
                    lastMessageTime: mockReply.timestamp
                  }
                : c
            )
          );
        }, 2000 + Math.random() * 3000); // Random delay between 2-5 seconds
        
        return () => clearTimeout(replyTimer);
      }
    }
  }, [messages, selectedContact, walletAddress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary text-2xl">Loading messages...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Messages | GigaAura</title>
        <meta name="description" content="Send and receive messages on GigaAura" />
      </Head>

      <div className="min-h-screen bg-light dark:bg-gray-900">
        <Header />
        
        <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-3">
            <Sidebar />
          </div>
          
          <div className="col-span-1 md:col-span-9">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex h-[70vh]">
                {/* Contacts list */}
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold">Messages</h2>
                  </div>
                  
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {contacts.map(contact => (
                      <div 
                        key={contact.walletAddress}
                        className={`p-3 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedContact?.walletAddress === contact.walletAddress ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        onClick={() => handleContactSelect(contact)}
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                            {contact.avatar ? (
                              <img src={contact.avatar} alt={contact.username || 'Contact'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-lg font-medium">
                                {(contact.username?.charAt(0) || contact.walletAddress.charAt(0))}
                              </div>
                            )}
                          </div>
                          {contact.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              {contact.unreadCount}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <h3 className="font-medium truncate">
                              {contact.username || formatWalletAddress(contact.walletAddress)}
                            </h3>
                            {contact.lastMessageTime && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTime(contact.lastMessageTime)}
                              </span>
                            )}
                          </div>
                          {contact.lastMessage && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {contact.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Messages */}
                <div className="w-2/3 flex flex-col">
                  {selectedContact ? (
                    <>
                      {/* Contact header */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                          {selectedContact.avatar ? (
                            <img src={selectedContact.avatar} alt={selectedContact.username || 'Contact'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-lg font-medium">
                              {(selectedContact.username?.charAt(0) || selectedContact.walletAddress.charAt(0))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {selectedContact.username || formatWalletAddress(selectedContact.walletAddress)}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatWalletAddress(selectedContact.walletAddress)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Messages list */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {currentMessages.map(msg => (
                          <div 
                            key={msg.id}
                            className={`flex ${msg.sender === walletAddress ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-3/4 p-3 rounded-lg ${
                                msg.sender === walletAddress 
                                  ? 'bg-primary text-white rounded-br-none' 
                                  : 'bg-gray-100 dark:bg-gray-700 rounded-bl-none'
                              }`}
                            >
                              <p>{msg.content}</p>
                              <p className={`text-xs mt-1 ${
                                msg.sender === walletAddress 
                                  ? 'text-primary-50' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {formatTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                      
                      {/* Message input */}
                      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || !connected}
                            className="bg-primary text-white rounded-full p-2 disabled:opacity-50"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <p>Select a contact to start messaging</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default MessagesPage; 