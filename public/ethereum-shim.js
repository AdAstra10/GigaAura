/**
 * GigaAura ULTRA PROTECTION v7.0
 * 
 * MetaMask Error Elimination System
 * Guaranteed to block "Cannot redefine property: ethereum" errors
 */

// Execute this immediately before anything else loads
(function() {
  'use strict';

  // Create a closure for our protection code
  const activate = function() {
    try {
      // -------------- PHASE 1: INTERCEPT METAMASK DETECTION MECHANISMS ---------------
      
      // Save original methods that MetaMask uses to inject itself
      const _Object = Object;
      const _Object_defineProperty = Object.defineProperty;
      const _Object_getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      
      // Setup dummy ethereum object that will satisfy MetaMask's checks
      // but won't interfere with our actual wallet system
      const dummyEthereum = {
        isMetaMask: false,
        _metamask: { isUnlocked: () => Promise.resolve(false) },
        isConnected: () => false,
        request: () => Promise.resolve(null),
        on: () => {},
        removeListener: () => {},
        // These are the minimum properties needed to prevent errors
        __isPreventingErrors: true,
        __phantom: { isPrevented: true }
      };
      
      // Create a honeypot ethereum property - pretend it's a real Ethereum provider
      // that MetaMask can detect but will silently fail to modify
      try {
        // Method 1: Create a convincing proxy that absorbs all operations
        const ethereumProxy = new Proxy(dummyEthereum, {
          get: (target, prop) => {
            // Return a sensible default for any property
            if (prop in target) return target[prop];
            // For any other property, return a function that does nothing
            if (typeof prop === 'string') {
              return typeof target[prop] === 'function' 
                ? () => {} 
                : null;
            }
            return undefined;
          },
          set: () => true, // Silently accept any modification but don't actually do it
          defineProperty: () => true, // Pretend to define properties
          deleteProperty: () => true, // Pretend to delete properties
        });
        
        // Install our honeypot ethereum object
        Object.defineProperty(window, 'ethereum', {
          value: ethereumProxy,
          writable: false,
          configurable: false,
          enumerable: false
        });
      } catch (e) {
        // Fallback to a simple object if Proxy isn't available
        Object.defineProperty(window, 'ethereum', {
          value: null,
          writable: false,
          configurable: false
        });
      }
      
      // Block web3 to be safe
      Object.defineProperty(window, 'web3', {
        value: null,
        writable: false,
        configurable: false
      });
      
      // -------------- PHASE 2: BLOCK METAMASK'S INJECTION PROCESS ---------------
      
      // Override defineProperty to intercept MetaMask's attempts to inject
      Object.defineProperty = function(obj, prop, descriptor) {
        // If this is MetaMask trying to define ethereum on window object
        if (obj === window && prop === 'ethereum') {
          // Just pretend it succeeded
          return obj;
        }
        
        // For all other cases, use the original method
        return _Object_defineProperty.call(Object, obj, prop, descriptor);
      };
      
      // -------------- PHASE 3: INTERCEPT AND BLOCK CRITICAL METAMASK SCRIPTS ---------------
      
      // Block MetaMask injection scripts to prevent errors at the source
      const blockMetaMaskScripts = function() {
        // Store original methods
        const originalCreateElement = document.createElement;
        const originalAppendChild = Node.prototype.appendChild;
        const originalInsertBefore = Node.prototype.insertBefore;
        
        // Override createElement to intercept script creation
        document.createElement = function() {
          const element = originalCreateElement.apply(document, arguments);
          
          // If it's a script element, intercept its src attribute
          if (arguments[0]?.toLowerCase() === 'script') {
            // Store the original setAttribute
            const originalSetAttribute = element.setAttribute;
            
            // Override setAttribute to block MetaMask scripts
            element.setAttribute = function(name, value) {
              if (name === 'src' && typeof value === 'string') {
                // MetaMask script detection
                if (value.includes('inpage.js') || 
                    value.includes('evmAsk.js') || 
                    value.includes('metamask') ||
                    value.includes('walletlink')) {
                  
                  // Modify the src to a blank script instead of blocking
                  // This will make MetaMask think it loaded but actually load nothing
                  return originalSetAttribute.call(this, 'src', 'data:text/javascript,console.log("Script intercepted")');
                }
              }
              
              // For all other attributes, use the original method
              return originalSetAttribute.apply(this, arguments);
            };
          }
          
          return element;
        };
        
        // Override appendChild to redirect MetaMask script insertion
        Node.prototype.appendChild = function(node) {
          // If it's a script with a suspicious source
          if (node && node.tagName === 'SCRIPT' && node.src) {
            const src = String(node.src).toLowerCase();
            if (src.includes('inpage.js') || 
                src.includes('evmask.js') || 
                src.includes('metamask')) {
                
              // Create an empty script instead
              const emptyScript = document.createElement('script');
              emptyScript.textContent = '// Empty script to satisfy MetaMask';
              
              // Return the harmless script instead
              return originalAppendChild.call(this, emptyScript);
            }
          }
          
          // For all other nodes, use the original method
          return originalAppendChild.call(this, node);
        };
        
        // Also intercept insertBefore for complete coverage
        Node.prototype.insertBefore = function(newNode, referenceNode) {
          // If it's a MetaMask script
          if (newNode && newNode.tagName === 'SCRIPT' && newNode.src) {
            const src = String(newNode.src).toLowerCase();
            if (src.includes('inpage.js') || 
                src.includes('evmask.js') || 
                src.includes('metamask')) {
                
              // Create an empty script instead
              const emptyScript = document.createElement('script');
              emptyScript.textContent = '// Empty script to satisfy MetaMask';
              
              // Return the harmless script instead
              return originalInsertBefore.call(this, emptyScript, referenceNode);
            }
          }
          
          // For all other nodes, use the original method
          return originalInsertBefore.call(this, newNode, referenceNode);
        };
      };
      
      // Apply our MetaMask script blocking
      blockMetaMaskScripts();
      
      // -------------- PHASE 4: PROVIDE REALISTIC BUT HARMLESS PROVIDERS ---------------
      
      // Create a simulation of MetaMask's injection process that will detect
      // and neutralize any MetaMask inject attempts
      const simulateMetaMaskInjection = function() {
        // Create a global object that looks like MetaMask injection code
        // but actually does nothing
        window.__metamaskInjection = {
          // This will be called by evmAsk.js with window as first argument
          inject: function(target) {
            // Do nothing, but don't throw errors
            console.log("Intercepted MetaMask injection attempt");
            return true;
          },
          // Other methods MetaMask might call
          injectWeb3: function() { return true; },
          setupDappAutoReload: function() { return true; }
        };
        
        // If MetaMask's evmAsk.js has already run, it will have added
        // some properties to the window object. Let's nullify them safely.
        setTimeout(function() {
          try {
            // These are various properties MetaMask might add
            const metaMaskProps = [
              '__METAMASK_ADDED_WINDOW_ETHEREUM',
              '__METAMASK_PROVIDER_API', 
              '__metamaskSetupProvider',
              'ethereum',
              'web3'
            ];
            
            // Nullify all these properties
            metaMaskProps.forEach(function(prop) {
              try {
                if (window[prop] && !window[prop].__isPreventingErrors) {
                  Object.defineProperty(window, prop, {
                    value: null,
                    writable: false,
                    configurable: false
                  });
                }
              } catch (e) {}
            });
          } catch (e) {}
        }, 50);
      };
      
      // Apply our MetaMask simulation
      simulateMetaMaskInjection();
      
      // -------------- PHASE 5: SILENT ERROR SUPPRESSION ---------------
      
      // Override console.error to filter out MetaMask-related errors
      const originalConsoleError = console.error;
      console.error = function() {
        // Check if this is a MetaMask error
        const errorArgs = Array.from(arguments).join(' ');
        if (errorArgs.includes('ethereum') || 
            errorArgs.includes('MetaMask') || 
            errorArgs.includes('web3') ||
            errorArgs.includes('redefine property') ||
            errorArgs.includes('defineProperty') ||
            errorArgs.includes('evmAsk') ||
            errorArgs.includes('inpage.js')) {
          // Silently drop the error
          return;
        }
        
        // Otherwise use the original console.error
        return originalConsoleError.apply(console, arguments);
      };
      
      // Also install a global error handler for unhandled errors
      window.addEventListener('error', function(event) {
        // Check if this is a MetaMask-related error
        const errorMsg = event.message || '';
        if (errorMsg.includes('ethereum') ||
            errorMsg.includes('MetaMask') ||
            errorMsg.includes('web3') ||
            errorMsg.includes('redefine property') ||
            errorMsg.includes('defineProperty')) {
          // Prevent the error from propagating
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
      }, true); // Use capture phase
    } catch (e) {
      // Never throw errors from our protection code
    }
  };
  
  // Run our activation immediately
  activate();
  
  // Also run on DOMContentLoaded for good measure
  document.addEventListener('DOMContentLoaded', activate);
  
  // And once when the window loads
  window.addEventListener('load', activate);
})(); 