import React, { useState, useEffect } from 'react';
import pusherClient, { getPusherStatus, PUSHER_CHANNELS, PUSHER_EVENTS } from '../lib/pusher';
import { toast } from 'react-hot-toast';

const PusherStatus: React.FC = () => {
  const [status, setStatus] = useState({
    connected: false,
    state: 'disconnected',
    socketId: null as string | null,
    transport: 'none',
    receivedEvents: [] as string[],
  });
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Update status on mount and when Pusher connection state changes
  useEffect(() => {
    function updateStatus() {
      const currentStatus = getPusherStatus();
      setStatus(s => ({
        ...s,
        connected: currentStatus.connected,
        state: currentStatus.state,
        socketId: currentStatus.socketId || null,
        transport: currentStatus.transport || 'none',
      }));
    }
    
    // Update initial status
    updateStatus();
    
    // Listen for connection state changes
    pusherClient.connection.bind('state_change', () => {
      updateStatus();
    });
    
    // Subscribe to test channel
    const channel = pusherClient.subscribe('test-channel');
    
    // Listen for test events
    channel.bind('test-event', (data: any) => {
      toast.success(`Received test event: ${data.message || 'Test message'}`);
      setStatus(s => ({
        ...s,
        receivedEvents: [
          ...s.receivedEvents, 
          `${new Date().toLocaleTimeString()}: ${data.message || 'Test message'}`
        ].slice(-5)
      }));
    });
    
    // Cleanup
    return () => {
      pusherClient.connection.unbind('state_change');
      channel.unbind_all();
      pusherClient.unsubscribe('test-channel');
    };
  }, []);
  
  // Function to test connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      const response = await fetch('/api/pusher/test', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Pusher test successful! Check for incoming events.');
      } else {
        toast.error(`Pusher test failed: ${data.message}`);
      }
    } catch (error) {
      toast.error('Error testing Pusher connection');
      console.error(error);
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Status indicator color
  const statusColor = status.connected ? 'bg-green-500' : 'bg-red-500';
  
  return (
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <div className={`w-3 h-3 rounded-full ${statusColor} mr-2`}></div>
        Pusher Status
      </h3>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div>Status:</div>
        <div className="font-medium">{status.state}</div>
        
        <div>Transport:</div>
        <div className="font-medium">{status.transport}</div>
        
        <div>Socket ID:</div>
        <div className="font-medium truncate">{status.socketId || 'N/A'}</div>
      </div>
      
      {status.receivedEvents.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-1">Recent Events:</h4>
          <ul className="text-xs bg-gray-100 dark:bg-gray-700 rounded p-2">
            {status.receivedEvents.map((event, index) => (
              <li key={index} className="mb-1">{event}</li>
            ))}
          </ul>
        </div>
      )}
      
      <button 
        onClick={testConnection}
        disabled={isTestingConnection}
        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded text-sm font-medium"
      >
        {isTestingConnection ? 'Testing...' : 'Test Connection'}
      </button>
    </div>
  );
};

export default PusherStatus; 