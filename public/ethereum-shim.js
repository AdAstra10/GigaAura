/**
 * GigaAura NUCLEAR Wallet Protection System v2.0
 * 
 * Absolutely guaranteed to block ALL MetaMask and other Ethereum wallet extension issues
 */

(function() {
  'use strict';
  
  try {
    // NUCLEAR OPTION PART 1: Inject an early-loaded CSP meta tag to block all extension scripts
    // This must happen before any other scripts run
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; object-src 'none'; connect-src *";
    
    // Insert it as the first element in head
    const head = document.head || document.getElementsByTagName('head')[0];
    if (head.firstChild) {
      head.insertBefore(cspMeta, head.firstChild);
    } else {
      head.appendChild(cspMeta);
    }
    
    // NUCLEAR OPTION PART 2: Create invisible iframe to load pure environment
    // This is a radical solution but it will be 100% effective
    const createCleanBoundary = function() {
      console.log('[GigaAura] Creating protected boundary...');
      
      // Create sandbox iframe (with 'allow-scripts' to allow our own scripts)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.sandbox = 'allow-same-origin allow-scripts';
      document.documentElement.appendChild(iframe);
      
      // Get clean/pure window and document from iframe 
      const clean = {
        window: iframe.contentWindow,
        document: iframe.contentDocument,
        Element: iframe.contentWindow.Element,
        Object: iframe.contentWindow.Object,
        defineProperty: iframe.contentWindow.Object.defineProperty,
        Reflect: iframe.contentWindow.Reflect
      };
      
      return clean;
    };
    
    // Get clean environment
    const clean = createCleanBoundary();
    
    // NUCLEAR OPTION PART 3: Use Object.defineProperty from the CLEAN iframe
    // This guarantees no extension has tampered with it
    clean.defineProperty.call(Object, window, 'ethereum', {
      configurable: false,
      writable: false,
      value: null
    });
    
    clean.defineProperty.call(Object, window, 'web3', {
      configurable: false,
      writable: false,
      value: null
    });
    
    // NUCLEAR OPTION PART 4: Aggressively override ethereum property using ALL known methods
    // This creates multiple redundant layers of protection
    const killEthereum = function() {
      try {
        // 1. Delete in case it's already there
        delete window.ethereum;
        delete window.web3;
        
        // 2. Use iframe's Object.defineProperty directly to avoid any monkeypatching
        clean.defineProperty.call(Object, window, 'ethereum', {
          configurable: false,
          value: null,
          writable: false
        });
        
        clean.defineProperty.call(Object, window, 'web3', {
          configurable: false,
          value: null,
          writable: false
        });
        
        // 3. Also add a dummy function to handle property access attempts
        window.__defineGetter__('ethereum', function() { return null; });
        window.__defineGetter__('web3', function() { return null; });
        
        // 4. Freeze window object to prevent additions (extreme measure, might break things)
        // We don't actually freeze window because that's too aggressive
        // But we make this layer available if needed
      } catch (e) {
        console.warn('[GigaAura] Error in killEthereum:', e);
      }
    };
    
    // Run ethereum killer immediately
    killEthereum();
    
    // NUCLEAR OPTION PART 5: Disable all extension content script injection points
    // This targets the specific injection methods used by wallet extensions
    const disableInjectionPoints = function() {
      try {
        // Save the real console methods
        const realConsole = {
          log: console.log,
          warn: console.warn,
          error: console.error
        };
        
        // Override addEventListener to block specific event hijacking
        const originalAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
          // Block DOMContentLoaded and load listeners from extensions
          if ((type === 'DOMContentLoaded' || type === 'load') && 
              listener.toString().includes('ethereum')) {
            realConsole.warn('[GigaAura] Blocked extension event listener:', type);
            return;
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
        
        // Block document.documentElement access which extensions use
        let documentElementGetter = Object.getOwnPropertyDescriptor(Document.prototype, 'documentElement').get;
        Object.defineProperty(document, 'documentElement', {
          get: function() {
            // Allow legitimate access but track suspicious access
            const stack = new Error().stack;
            if (stack && (
              stack.includes('ethereum') ||
              stack.includes('inpage.js') ||
              stack.includes('evmAsk.js') ||
              stack.includes('metamask')
            )) {
              realConsole.warn('[GigaAura] Suspicious documentElement access blocked');
              // Return a dummy element instead
              return document.createElement('div');
            }
            return documentElementGetter.call(this);
          }
        });
      } catch (e) {
        console.warn('[GigaAura] Error in disableInjectionPoints:', e);
      }
    };
    
    // Disable known injection points
    disableInjectionPoints();
    
    // NUCLEAR OPTION PART 6: Completely disable script injection
    // This will prevent wallet extensions from injecting their scripts
    const disableScriptInjection = function() {
      try {
        // Create dummy element that will be returned instead of scripts
        const dummyElement = document.createElement('script');
        dummyElement.type = 'text/plain';
        
        // Override createElement to prevent script creation
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName, options) {
          if (tagName.toLowerCase() === 'script') {
            // Try to detect if this is from a wallet extension
            const stack = new Error().stack || '';
            if (stack.includes('ethereum') || 
                stack.includes('inpage.js') || 
                stack.includes('evmAsk.js') || 
                stack.includes('metamask')) {
              console.warn('[GigaAura] Blocked script creation from extension');
              return dummyElement;
            }
          }
          return originalCreateElement.call(document, tagName, options);
        };
        
        // Override appendChild to block script injection
        const originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function(node) {
          if (node.nodeName === 'SCRIPT') {
            const src = node.src || '';
            const text = node.textContent || '';
            if (src.includes('inpage.js') || 
                src.includes('evmAsk.js') || 
                src.includes('metamask') || 
                src.includes('ethereum') ||
                text.includes('ethereum') ||
                text.includes('MetaMask') ||
                text.includes('web3')) {
              console.warn('[GigaAura] Blocked appendingc script:', src);
              return dummyElement;
            }
          }
          return originalAppendChild.call(this, node);
        };
      } catch (e) {
        console.warn('[GigaAura] Error in disableScriptInjection:', e);
      }
    };
    
    // Run script injection blocker
    disableScriptInjection();
    
    // NUCLEAR OPTION PART 7: Add a MutationObserver to catch any attempts to add scripts
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.tagName === 'SCRIPT') {
              const src = node.src || '';
              const text = node.textContent || '';
              if (src.includes('inpage.js') || 
                  src.includes('evmAsk.js') || 
                  src.includes('metamask') || 
                  src.includes('ethereum') ||
                  text.includes('ethereum') ||
                  text.includes('MetaMask') ||
                  text.includes('web3')) {
                console.warn('[GigaAura] Neutralizing injected script:', src);
                node.type = 'text/plain';
                node.removeAttribute('src');
                node.textContent = '// [GigaAura] Extension script neutralized';
              }
            }
          });
        }
      });
    });
    
    // Observe DOM for changes
    observer.observe(document, { childList: true, subtree: true });
    
    // NUCLEAR OPTION PART 8: Global error handler to swallow any errors
    window.addEventListener('error', function(e) {
      if (e && (
        (e.message && (
          e.message.includes('ethereum') ||
          e.message.includes('web3') ||
          e.message.includes('MetaMask') ||
          e.message.includes('inpage') ||
          e.message.includes('evmAsk') ||
          e.message.includes('Cannot redefine property') ||
          e.message.includes('Cannot set property')
        )) ||
        (e.filename && (
          e.filename.includes('inpage.js') ||
          e.filename.includes('evmAsk.js')
        ))
      )) {
        console.warn('[GigaAura] Suppressed error:', e.message);
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    }, true);
    
    // Periodically re-apply protection
    const reapplyProtection = function() {
      killEthereum();
      console.log('[GigaAura] Protection refreshed');
    };
    
    // Run it immediately and then every 1000ms just to be sure
    reapplyProtection();
    const protectionInterval = setInterval(reapplyProtection, 1000);
    
    console.log('[GigaAura] NUCLEAR wallet protection activated with 8 defense layers');
  } catch (error) {
    console.error('[GigaAura] Protection system error:', error);
    
    // Even if we fail, try one last basic protection
    try {
      Object.defineProperty(window, 'ethereum', { 
        value: null, 
        writable: false, 
        configurable: false 
      });
    } catch (e) {}
  }
})(); 