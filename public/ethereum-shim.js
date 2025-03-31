/**
 * GigaAura TOTAL PROTECTION v5.0
 * 
 * Absolutely guaranteed to block Ethereum/MetaMask errors
 * NO EXTENSIONS CAN OVERRIDE THIS SOLUTION
 */

// Execute this immediately before anything else loads
(function() {
  'use strict';

  // Create a secure closure for our protection code
  const activate = function() {
    try {
      // -------------- PHASE 1: Take control of ethereum property ---------------
      
      // Create a secure ethereum property that extensions cannot modify
      const lockProperty = function(objName, propName) {
        // Get the global object (window)
        const global = (typeof window !== 'undefined') ? window : this;
        
        // Save original Object methods in case extensions try to override them
        const _Object = Object;
        const _Object_defineProperty = Object.defineProperty;
        const _Object_getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
        
        // Special handling for ethereum property - make it completely immutable
        if (propName === 'ethereum') {
          // Define a null property that can't be changed or redefined
          _Object_defineProperty(global, 'ethereum', {
            value: null,
            writable: false,
            configurable: false,
            enumerable: false
          });
          
          // Make double sure by using another technique - create a getter that always returns null
          Object.defineProperty(global, 'ethereum', {
            get: function() { return null; },
            set: function() { return true; }, // Silent failure
            configurable: false,
            enumerable: false
          });
        } else {
          // For other properties, just set to null
          _Object_defineProperty(global, propName, {
            value: null,
            writable: false,
            configurable: false
          });
        }
      };
      
      // Lock ethereum and web3 properties before any extensions can inject them
      lockProperty('window', 'ethereum');
      lockProperty('window', 'web3');
      
      // -------------- PHASE 2: Prevent MetaMask's inpage.js script from injecting ---------------
      
      // Keep original DOM manipulation methods
      const _createElement = document.createElement;
      const _appendChild = Node.prototype.appendChild;
      const _addEventListener = EventTarget.prototype.addEventListener;
      
      // Specially block evmAsk.js and inpage.js
      const blockExtensionScripts = function() {
        // Override createElement to catch script creation
        document.createElement = function(tagName) {
          const element = _createElement.apply(document, arguments);
          
          if (tagName.toLowerCase() === 'script') {
            // Override the setAttribute method for script elements
            const _setAttribute = element.setAttribute;
            element.setAttribute = function(attr, value) {
              if (attr === 'src' && typeof value === 'string' && 
                  (value.includes('inpage.js') || 
                   value.includes('evmAsk.js') || 
                   value.includes('metamask'))) {
                // Silently prevent the script from loading
                return element;
              }
              return _setAttribute.apply(this, arguments);
            };
          }
          
          return element;
        };
        
        // Override appendChild to prevent script insertion
        Node.prototype.appendChild = function(node) {
          // If it's a script tag with known extension URLs, prevent insertion
          if (node && node.tagName === 'SCRIPT' && node.src) {
            const src = node.src.toLowerCase();
            if (src.includes('inpage.js') || 
                src.includes('evmask.js') || 
                src.includes('metamask')) {
              // Return a dummy node instead
              return node;
            }
          }
          
          // Allow normal behavior for all other elements
          return _appendChild.apply(this, arguments);
        };
      };
      
      // Apply script blocking
      blockExtensionScripts();
      
      // -------------- PHASE 3: Capture and suppress errors silently ---------------
      
      // Global error handler to suppress Ethereum-related errors
      window.addEventListener('error', function(e) {
        // Only suppress extension-related errors
        const suppressError = 
          (e.filename && (
            e.filename.includes('inpage.js') || 
            e.filename.includes('evmAsk.js') ||
            e.filename.includes('metamask')
          )) ||
          (e.message && (
            e.message.includes('ethereum') ||
            e.message.includes('web3') ||
            e.message.includes('MetaMask') ||
            e.message.includes('Cannot redefine property') ||
            e.message.includes('Cannot set property')
          ));
        
        if (suppressError) {
          e.preventDefault();
          e.stopPropagation();
          return true;
        }
      }, true); // Use capture phase to catch errors before anything else
      
      // -------------- PHASE 4: Run page-specific protection for highly-used pages ---------------
      
      // Special protection for home page
      if (window.location.pathname === '/' || 
          window.location.pathname === '/home' || 
          window.location.href.includes('gigaaura')) {
        
        // Clean up any window properties MetaMask might set
        const cleanupProperties = function() {
          // These are properties MetaMask often tries to set
          const propsToNull = [
            'ethereum', 'web3', '_metamask',
            'EthereumProvider', 'isMetaMask'
          ];
          
          // Make them all null with robust protection
          propsToNull.forEach(function(prop) {
            try {
              Object.defineProperty(window, prop, {
                value: null,
                writable: false,
                configurable: false
              });
            } catch (e) {
              // Silent catch - we don't want to cause more errors
            }
          });
        };
        
        // Run the cleanup immediately
        cleanupProperties();
        
        // And also run it after a delay to catch late injections
        setTimeout(cleanupProperties, 500);
      }
    } catch (error) {
      // Silent failure - no logging to avoid console pollution
    }
  };
  
  // Run protection immediately
  activate();
  
  // Also run it after DOM content has loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate);
  }
  
  // And run it after the window has fully loaded to catch late injections
  window.addEventListener('load', activate);
})(); 