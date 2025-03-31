/**
 * GigaAura Total Wallet Protection System
 * 
 * This is a comprehensive solution that implements multiple layers of protection:
 * 1. Pre-emptive hooking of Object.defineProperty and related methods
 * 2. MutationObserver to detect and remove problematic script tags
 * 3. Browser API interception for script loading and execution
 * 4. Error trapping and suppression
 * 5. Native property descriptors with proper getter/setter pairs
 * 
 * IMPORTANT: This MUST be the first script executed on the page
 */

(function() {
  'use strict';
  
  // Skip if not in a browser context
  if (typeof window === 'undefined') return;
  
  try {
    console.log('[GigaAura] Activating ultimate wallet protection');
    
    // --- LAYER 1: Save original methods before anyone can modify them ---
    const originalDefineProperty = Object.defineProperty;
    const originalReflectDefineProperty = Reflect.defineProperty;
    const originalObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    const originalObjectSetPrototypeOf = Object.setPrototypeOf;
    const originalDefineProperties = Object.defineProperties;
    const originalCreateElement = document.createElement;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    const originalCreateScriptElement = document.createElement.bind(document, 'script');
    const originalEval = window.eval;
    const originalFunction = Function;
    
    // --- LAYER 2: Stub objects and protection flags ---
    // Create placeholder stubs
    const ethereumStub = {
      isMetaMask: false,
      _metamask: { isUnlocked: () => false },
      request: async () => { throw new Error('Ethereum not supported in GigaAura'); },
      on: () => {},
      removeListener: () => {},
      isConnected: () => false,
      // Add additional MetaMask-specific properties that scripts might look for
      selectedAddress: null,
      chainId: null,
      networkVersion: null,
      _state: { accounts: [], isConnected: false, isUnlocked: false },
      // Prevent JSON serialization attacks
      toJSON: () => ({ isDisabled: true })
    };
    
    // Freeze the stub to prevent modification
    Object.freeze(ethereumStub);
    
    // --- LAYER 3: Override Object.defineProperty to guard against property redefinition ---
    Object.defineProperty = function customDefineProperty(obj, prop, descriptor) {
      // Block attempts to define ethereum-related properties on window
      if (obj === window && (prop === 'ethereum' || prop === 'web3')) {
        console.warn(`[GigaAura] Blocked attempt to define ${prop} on window`);
        return obj;
      }
      
      // Intercept any attempts to redefine Object.defineProperty itself
      if (obj === Object && prop === 'defineProperty') {
        console.warn('[GigaAura] Blocked attempt to redefine Object.defineProperty');
        return Object;
      }
      
      // Allow any other property definitions to proceed normally
      return originalDefineProperty.call(Object, obj, prop, descriptor);
    };
    
    // --- LAYER 4: Override Reflect.defineProperty for similar protection ---
    Reflect.defineProperty = function customReflectDefineProperty(obj, prop, descriptor) {
      // Block attempts to define ethereum-related properties
      if (obj === window && (prop === 'ethereum' || prop === 'web3')) {
        console.warn(`[GigaAura] Blocked Reflect.defineProperty attempt on ${prop}`);
        return false;
      }
      return originalReflectDefineProperty.call(Reflect, obj, prop, descriptor);
    };
    
    // --- LAYER 5: Define protected ethereum and web3 properties on window ---
    // Setup window.ethereum with both getter and setter
    originalDefineProperty.call(Object, window, 'ethereum', {
      configurable: false,
      enumerable: true,
      get: function() {
        return ethereumStub;
      },
      set: function() {
        console.warn('[GigaAura] Blocked attempt to set window.ethereum');
        // The setter does nothing - property remains unchanged
        return true;
      }
    });
    
    // Setup window.web3 with both getter and setter
    originalDefineProperty.call(Object, window, 'web3', {
      configurable: false,
      enumerable: true,
      get: function() {
        return null;
      },
      set: function() {
        console.warn('[GigaAura] Blocked attempt to set window.web3');
        // The setter does nothing - property remains unchanged
        return true;
      }
    });
    
    // --- LAYER 6: Script tag interception ---
    // Create a MutationObserver to detect and neutralize script tags
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.tagName === 'SCRIPT') {
              const src = node.src || '';
              if (src.includes('inpage.js') || 
                  src.includes('evmAsk.js') ||
                  src.includes('metamask') ||
                  src.includes('web3modal') ||
                  src.includes('ethereum')) {
                console.warn('[GigaAura] Neutralizing script:', src);
                node.type = 'javascript/blocked';
                node.src = '';
                node.innerHTML = '// Script blocked by GigaAura';
              }
            }
          });
        }
      });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document, { childList: true, subtree: true });
    
    // --- LAYER 7: Script element creation interception ---
    // Override document.createElement to intercept script creation
    document.createElement = function(tagName, options) {
      const element = originalCreateElement.call(document, tagName, options);
      
      if (tagName.toLowerCase() === 'script') {
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
          if (name === 'src' && typeof value === 'string' && (
            value.includes('inpage.js') || 
            value.includes('evmAsk.js') ||
            value.includes('metamask') ||
            value.includes('web3modal') ||
            value.includes('ethereum')
          )) {
            console.warn('[GigaAura] Blocked script src attribute:', value);
            return element;
          }
          return originalSetAttribute.call(this, name, value);
        };
      }
      
      return element;
    };
    
    // --- LAYER 8: Script execution and insertion interception ---
    // Override appendChild and insertBefore to prevent script execution
    Node.prototype.appendChild = function(node) {
      if (node.tagName === 'SCRIPT' && node.src && (
        node.src.includes('inpage.js') || 
        node.src.includes('evmAsk.js') ||
        node.src.includes('metamask') ||
        node.src.includes('web3modal') ||
        node.src.includes('ethereum')
      )) {
        console.warn('[GigaAura] Blocked script append:', node.src);
        return node; // Return node without appending
      }
      return originalAppendChild.call(this, node);
    };
    
    Node.prototype.insertBefore = function(node, referenceNode) {
      if (node.tagName === 'SCRIPT' && node.src && (
        node.src.includes('inpage.js') || 
        node.src.includes('evmAsk.js') ||
        node.src.includes('metamask') ||
        node.src.includes('web3modal') ||
        node.src.includes('ethereum')
      )) {
        console.warn('[GigaAura] Blocked script insertion:', node.src);
        return node; // Return node without inserting
      }
      return originalInsertBefore.call(this, node, referenceNode);
    };
    
    // --- LAYER 9: Global error handler for any remaining errors ---
    window.addEventListener('error', function(e) {
      // Suppress ethereum-related errors
      if (e && e.error && (
        (e.error.message && (
          e.error.message.includes('ethereum') ||
          e.error.message.includes('web3') ||
          e.error.message.includes('MetaMask') ||
          e.error.message.includes('inpage') ||
          e.error.message.includes('evmAsk')
        )) ||
        (e.filename && (
          e.filename.includes('inpage.js') ||
          e.filename.includes('evmAsk.js')
        ))
      )) {
        console.warn('[GigaAura] Suppressed Ethereum-related error:', e.error ? e.error.message : e.message);
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    }, true);
    
    // --- LAYER 10: Clean up any existing problematic scripts ---
    document.querySelectorAll('script').forEach(script => {
      const src = script.src || '';
      if (src.includes('inpage.js') || 
          src.includes('evmAsk.js') ||
          src.includes('metamask') ||
          src.includes('web3modal') ||
          src.includes('ethereum')) {
        console.warn('[GigaAura] Neutralizing existing script:', src);
        script.type = 'javascript/blocked';
        script.src = '';
        script.innerHTML = '// Script blocked by GigaAura';
      }
    });
    
    console.log('[GigaAura] Wallet protection system fully activated with 10 defense layers');
  } catch (error) {
    console.error('[GigaAura] Protection system error:', error);
  }
})(); 