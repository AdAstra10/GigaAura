import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import PusherStatus from '../../components/PusherStatus';

// Dynamically import components to avoid SSR issues
const PusherDebugger = dynamic(
  () => import('../../components/PusherStatus'),
  { ssr: false }
);

const PusherDebugPage: NextPage = () => {
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cspStatus, setCspStatus] = useState<any>({
    checked: false,
    valid: false,
    connectSrc: null,
    scriptSrc: null,
  });

  // Load server info on mount
  useEffect(() => {
    async function loadServerInfo() {
      try {
        const response = await fetch('/api/pusher/test');
        if (response.ok) {
          const data = await response.json();
          setServerInfo(data);
        } else {
          toast.error('Failed to load Pusher server information');
        }
      } catch (error) {
        console.error('Error loading Pusher info:', error);
        toast.error('Error connecting to server');
      } finally {
        setIsLoading(false);
      }
    }

    // Check CSP configuration
    function checkCSP() {
      try {
        // Get CSP meta tag if it exists
        const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (!cspMeta) {
          setCspStatus({
            checked: true,
            valid: false,
            error: 'No CSP meta tag found',
          });
          return;
        }

        const cspContent = cspMeta.getAttribute('content');
        if (!cspContent) {
          setCspStatus({
            checked: true,
            valid: false,
            error: 'Empty CSP content',
          });
          return;
        }

        // Parse CSP directives
        const directives: Record<string, string> = {};
        cspContent.split(';').forEach(directive => {
          const trimmed = directive.trim();
          if (trimmed) {
            const [name, ...values] = trimmed.split(' ');
            directives[name] = values.join(' ');
          }
        });

        // Check for Pusher domains in connect-src
        const connectSrc = directives['connect-src'] || '';
        const scriptSrc = directives['script-src'] || '';
        
        const hasWSPusher = connectSrc.includes('wss://*.pusher.com') || 
                           connectSrc.includes('wss://ws-us2.pusher.com');
        const hasHTTPSPusher = connectSrc.includes('https://*.pusher.com');
        
        setCspStatus({
          checked: true,
          valid: hasWSPusher && hasHTTPSPusher,
          connectSrc,
          scriptSrc,
          hasWSPusher,
          hasHTTPSPusher,
        });
      } catch (error) {
        console.error('Error checking CSP:', error);
        setCspStatus({
          checked: true,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    loadServerInfo();
    checkCSP();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Pusher Debug - GigaAura</title>
      </Head>

      <h1 className="text-2xl font-bold mb-6">Pusher Connection Diagnostics</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <PusherDebugger />

          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">CSP Configuration</h3>
            {cspStatus.checked ? (
              <div>
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${cspStatus.valid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">
                    {cspStatus.valid ? 'CSP allows Pusher domains' : 'CSP may block Pusher connections'}
                  </span>
                </div>

                {cspStatus.error && (
                  <div className="text-red-500 text-sm mb-2">{cspStatus.error}</div>
                )}

                {cspStatus.connectSrc && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">connect-src:</h4>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 overflow-x-auto">
                      {cspStatus.connectSrc}
                    </pre>
                    
                    <div className="mt-2 text-xs">
                      <div className={`flex items-center ${cspStatus.hasWSPusher ? 'text-green-600' : 'text-red-500'}`}>
                        <span className="mr-1">{cspStatus.hasWSPusher ? '✓' : '✗'}</span>
                        WebSocket endpoints (wss://*.pusher.com)
                      </div>
                      <div className={`flex items-center ${cspStatus.hasHTTPSPusher ? 'text-green-600' : 'text-red-500'}`}>
                        <span className="mr-1">{cspStatus.hasHTTPSPusher ? '✓' : '✗'}</span>
                        HTTPS endpoints (https://*.pusher.com)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">Checking CSP configuration...</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Server Information</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            {isLoading ? (
              <div className="py-4 text-center text-gray-500">Loading server information...</div>
            ) : serverInfo ? (
              <div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="font-medium">Server status:</div>
                  <div className={serverInfo.success ? 'text-green-600' : 'text-red-500'}>
                    {serverInfo.success ? 'Online' : 'Error'}
                  </div>
                  
                  <div className="font-medium">Message:</div>
                  <div>{serverInfo.message}</div>
                  
                  <div className="font-medium">App ID:</div>
                  <div>{serverInfo.pusherServerInfo?.pusherServer?.appId || 'Not configured'}</div>
                  
                  <div className="font-medium">App Key:</div>
                  <div>{serverInfo.pusherServerInfo?.pusherServer?.appKey || 'Not configured'}</div>
                  
                  <div className="font-medium">Cluster:</div>
                  <div>{serverInfo.pusherServerInfo?.pusherServer?.cluster || 'Not configured'}</div>
                </div>
                
                {serverInfo.testDetails && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Last Test Details:</h4>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                      {JSON.stringify(serverInfo.testDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-red-500">Failed to load server information</div>
            )}
          </div>
          
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">Troubleshooting Tips</h3>
            <ul className="text-sm space-y-2">
              <li>
                <span className="font-medium">WebSocket Connection Issues:</span> Ensure your Content Security Policy (CSP) allows connections to Pusher domains. Your CSP should include <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">wss://*.pusher.com</code> in the <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">connect-src</code> directive.
              </li>
              <li>
                <span className="font-medium">Stats Script Blocked:</span> If you're seeing CSP errors for <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">stats.pusher.com</code>, the Pusher client has been configured to disable stats collection. This is normal and won't affect functionality.
              </li>
              <li>
                <span className="font-medium">Server Configuration:</span> Make sure your server environment variables for Pusher are correctly set: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">PUSHER_APP_ID</code>, <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">PUSHER_APP_SECRET</code>, <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">NEXT_PUBLIC_PUSHER_APP_KEY</code>, and <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">NEXT_PUBLIC_PUSHER_CLUSTER</code>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PusherDebugPage; 