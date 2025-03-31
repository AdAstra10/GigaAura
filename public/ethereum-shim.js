/**
 * GigaAura Ethereum Protection System v3.0
 * 
 * Compatible with React and prevents wallet injection errors
 * without breaking application functionality
 */

(function() {
  'use strict';

  // Only proceed if we have a window object
  if (typeof window === 'undefined') return;

  try {
    console.log('[GigaAura] Activating wallet protection system v3.0');

    // Save original methods before they can be tampered with
    const originalDefineProperty = Object.defineProperty;
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    const originalPreventExtensions = Object.preventExtensions;
    const originalReflectDefineProperty = Reflect.defineProperty;

    // Create a stub ethereum object that returns safe values
    // Instead of null, we provide harmless implementations
    const createSafeEthereumStub = () => {
      return {
        isMetaMask: false,
        chainId: null,
        networkVersion: null,
        selectedAddress: null,
        _metamask: {
          isUnlocked: () => false,
          isEnabled: () => false,
          isApproved: () => false
        },
        request: async (req) => {
          console.warn('[GigaAura] Blocked ethereum request:', req);
          throw new Error('Ethereum functionality is disabled');
        },
        enable: async () => {
          console.warn('[GigaAura] Blocked ethereum.enable()');
          throw new Error('Ethereum functionality is disabled');
        },
        on: (eventName, callback) => {
          console.warn('[GigaAura] Blocked ethereum.on():', eventName);
          return false;
        },
        removeListener: () => false,
        isConnected: () => false,
        sendAsync: (payload, callback) => {
          if (callback) callback(new Error('Ethereum functionality is disabled'), null);
        },
        send: (payload, callback) => {
          if (callback) callback(new Error('Ethereum functionality is disabled'), null);
          return null;
        }
      };
    };

    // Create our ethereum stub
    const ethereumStub = createSafeEthereumStub();

    // Create empty web3 stub
    const web3Stub = {};

    // Function to safely create property that can't be altered
    const defineProtectedProperty = (obj, prop, value, writable = false) => {
      try {
        // First try to delete the property if it exists
        // This may fail if the property is non-configurable, which is fine
        delete obj[prop];

        // Check existing property
        const existingDescriptor = originalGetOwnPropertyDescriptor(obj, prop);
        
        // If the property already exists and can't be configured, we're done
        if (existingDescriptor && !existingDescriptor.configurable) {
          return false;
        }

        // Otherwise, make a new descriptor
        originalDefineProperty(obj, prop, {
          value: value,
          writable: writable,
          enumerable: true, 
          configurable: false
        });
        
        return true;
      } catch (e) {
        console.warn(`[GigaAura] Failed to define ${prop}:`, e);
        return false;
      }
    };

    // Global error handler to catch and suppress wallet-related errors
    // Placed early in code so it catches errors during initialization
    window.addEventListener('error', function(e) {
      if (e && e.error && (
        (e.error.message && (
          e.error.message.includes('ethereum') ||
          e.error.message.includes('web3') ||
          e.error.message.includes('MetaMask') ||
          e.error.message.includes('Cannot redefine property') ||
          e.error.message.includes('Cannot set property')
        )) ||
        (e.filename && (
          e.filename.includes('inpage.js') ||
          e.filename.includes('evmAsk.js')
        ))
      )) {
        console.warn('[GigaAura] Suppressed wallet-related error:', e.error ? e.error.message : e.message);
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    }, true);

    // Define ethereum and web3 with immediate protection
    if (!window.hasOwnProperty('ethereum') || window.ethereum === undefined) {
      defineProtectedProperty(window, 'ethereum', ethereumStub);
    }
    
    if (!window.hasOwnProperty('web3') || window.web3 === undefined) {
      defineProtectedProperty(window, 'web3', web3Stub);
    }

    // Setup script blocking
    const blockEthereumScripts = () => {
      try {
        // Keep track of original document functions
        const originalCreateElement = document.createElement;
        const originalAppendChild = Node.prototype.appendChild;
        const originalInsertBefore = Node.prototype.insertBefore;

        // Create a noop script element for returning
        const createNoopScript = () => {
          const script = originalCreateElement.call(document, 'script');
          script.type = 'text/plain'; // Prevents execution
          script.setAttribute('data-blocked-by', 'gigaaura');
          return script;
        };

        // Block suspicious scripts
        const isEthereumScript = (src, content) => {
          src = (src || '').toLowerCase();
          content = (content || '').toLowerCase();
          
          return (
            src.includes('inpage.js') ||
            src.includes('evmask.js') ||
            src.includes('metamask') ||
            src.includes('web3modal') ||
            content.includes('window.ethereum') ||
            (content.includes('ethereum') && content.includes('inject'))
          );
        };

        // Override script tag creation but don't break React
        document.createElement = function(tagName, options) {
          const element = originalCreateElement.call(document, tagName, options);
          
          if (tagName.toLowerCase() === 'script') {
            // Save original setAttribute
            const originalSetAttribute = element.setAttribute;
            
            // Override setAttribute
            element.setAttribute = function(name, value) {
              if (name === 'src' && isEthereumScript(value, '')) {
                console.warn('[GigaAura] Blocked script src:', value);
                return element;
              }
              return originalSetAttribute.call(this, name, value);
            };
          }
          
          return element;
        };

        // Override appendChild to prevent injected scripts
        Node.prototype.appendChild = function(node) {
          if (node.nodeName === 'SCRIPT') {
            const src = node.src || '';
            const content = node.textContent || node.innerText || '';
            
            if (isEthereumScript(src, content)) {
              console.warn('[GigaAura] Blocked appending script:', src);
              return createNoopScript();
            }
          }
          return originalAppendChild.call(this, node);
        };

        // Override insertBefore to prevent injected scripts
        Node.prototype.insertBefore = function(node, referenceNode) {
          if (node.nodeName === 'SCRIPT') {
            const src = node.src || '';
            const content = node.textContent || node.innerText || '';
            
            if (isEthereumScript(src, content)) {
              console.warn('[GigaAura] Blocked inserting script:', src);
              return createNoopScript();
            }
          }
          return originalInsertBefore.call(this, node, referenceNode);
        };
      } catch (e) {
        console.error('[GigaAura] Error in script blocking:', e);
      }
    };

    // Apply script blocking
    blockEthereumScripts();

    // Monitor for late property definition attempts
    const monitorEthereumProperties = () => {
      try {
        // Override Object.defineProperty to prevent ethereum redefinition
        Object.defineProperty = function(obj, prop, descriptor) {
          if (obj === window && (prop === 'ethereum' || prop === 'web3')) {
            console.warn(`[GigaAura] Blocked attempt to redefine ${prop}`);
            return obj;
          }
          
          // Enforce our override protection
          if (obj === Object && prop === 'defineProperty') {
            console.warn('[GigaAura] Blocked attempt to redefine Object.defineProperty');
            return Object;
          }
          
          return originalDefineProperty.call(Object, obj, prop, descriptor);
        };
        
        // Also override Reflect.defineProperty for the same reason
        Reflect.defineProperty = function(obj, prop, descriptor) {
          if (obj === window && (prop === 'ethereum' || prop === 'web3')) {
            console.warn(`[GigaAura] Blocked Reflect.defineProperty attempt on ${prop}`);
            return false;
          }
          return originalReflectDefineProperty.call(Reflect, obj, prop, descriptor);
        };
      } catch (e) {
        console.error('[GigaAura] Error in property monitoring:', e);
      }
    };

    // Apply property monitoring
    monitorEthereumProperties();

    // Keep applying protection periodically at a lower interval
    // Only protect when needed and less aggressively to avoid React issues
    const protectionInterval = setInterval(() => {
      try {
        // Check if protection still applied
        const ethDesc = Object.getOwnPropertyDescriptor(window, 'ethereum');
        const web3Desc = Object.getOwnPropertyDescriptor(window, 'web3');
        
        // Only reapply if values are missing or have been changed to something dangerous
        if (!ethDesc || (
          ethDesc.value !== ethereumStub && 
          ethDesc.configurable === true
        )) {
          console.log('[GigaAura] Reapplying ethereum protection');
          defineProtectedProperty(window, 'ethereum', ethereumStub);
        }
        
        if (!web3Desc || (
          web3Desc.value !== web3Stub && 
          web3Desc.configurable === true
        )) {
          console.log('[GigaAura] Reapplying web3 protection');
          defineProtectedProperty(window, 'web3', web3Stub);
        }
      } catch (e) {
        console.warn('[GigaAura] Error in protection interval:', e);
      }
    }, 5000); // Check every 5 seconds instead of 1 second

    console.log('[GigaAura] Protection system activated successfully');
  } catch (e) {
    console.error('[GigaAura] Failed to initialize protection system:', e);
    
    // Emergency fallback - try simpler protection
    try {
      const emergencyStub = {
        isMetaMask: false,
        request: () => Promise.reject(new Error('Ethereum disabled')),
        on: () => {},
        removeListener: () => {},
        isConnected: () => false
      };
      
      Object.defineProperty(window, 'ethereum', {
        value: emergencyStub,
        writable: false,
        configurable: false
      });
      
      console.log('[GigaAura] Emergency protection applied');
    } catch (fallbackError) {
      console.error('[GigaAura] Emergency protection failed:', fallbackError);
    }
  }
})(); 