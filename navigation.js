document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.querySelectorAll('.main-image ul li a');
  
  function setActiveLink() {
    const currentPath = window.location.pathname;
    const filename = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === filename || 
         (filename === '' && link.getAttribute('href') === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  setActiveLink();
  
  // Track if we're in the middle of a page transition
  let isNavigating = false;
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      if (!this.getAttribute('data-external')) {
        e.preventDefault();
        
        // Prevent double navigation
        if (isNavigating) return;
        isNavigating = true;
        
        const page = this.getAttribute('href');
        console.log(`Navigating to ${page}`);
        
        fetch(page)
          .then(response => response.text())
          .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.querySelector('.main-body');
            const container = document.querySelector('.main-body');
            container.replaceWith(newContent);
          
            // Update page title - just once
            document.title = doc.title;
          
            // Remove any previously added dynamic scripts
            document.querySelectorAll('script[data-dynamic]').forEach(s => s.remove());
          
            // Get all scripts from the new page - include both inline and src scripts
            const scripts = Array.from(doc.querySelectorAll('script')).filter(script => {
              // Skip navigation.js - we already have it loaded
              if (script.src && script.src.includes('navigation.js')) {
                return false;
              }
              return !script.type || script.type === 'text/javascript';
            });
          
            // Execute scripts sequentially to maintain order
            const loadScripts = (index) => {
              if (index >= scripts.length) {
                // Once all scripts are loaded, dispatch a custom event instead of DOMContentLoaded
                console.log('All scripts loaded, triggering custom pageScriptsLoaded event');
                const customEvent = new CustomEvent('pageScriptsLoaded', { 
                  detail: { page } 
                });
                document.dispatchEvent(customEvent);
                
                // Navigation complete
                isNavigating = false;
                return;
              }
              
              const script = scripts[index];
              const newScript = document.createElement('script');
              newScript.setAttribute('data-dynamic', 'true');
              
              // Handle both inline and external scripts
              if (script.src) {
                newScript.onload = () => loadScripts(index + 1);
                newScript.onerror = () => {
                  console.error(`Failed to load script: ${script.src}`);
                  loadScripts(index + 1);
                };
                newScript.src = script.src;
                document.body.appendChild(newScript);
              } else {
                // For inline scripts, wrap in try/catch to prevent one error from blocking other scripts
                try {
                  newScript.textContent = script.textContent;
                  document.body.appendChild(newScript);
                } catch (err) {
                  console.error('Error executing inline script:', err);
                }
                loadScripts(index + 1);
              }
            };
            
            // Start loading scripts
            loadScripts(0);
          
            // Update browser URL
            history.pushState({}, '', page);
          
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          
            // Dispatch custom event for page load
            const event = new CustomEvent('pageLoaded', { detail: { page } });
            document.dispatchEvent(event);
          })
          .catch(err => {
            console.error('Error loading page:', err);
            isNavigating = false;
          });
      }
    });
  });
  
  window.addEventListener('popstate', function() {
    setActiveLink();

    // Prevent double navigation
    if (isNavigating) return;
    isNavigating = true;

    const currentPage = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1) || 'index.html';
    console.log(`Handling popstate, loading: ${currentPage}`);
    
    fetch(currentPage)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.querySelector('.main-body');
        const container = document.querySelector('.main-body');
        container.replaceWith(newContent);
      
        // Update page title
        document.title = doc.title;
      
        // Remove any previously added dynamic scripts
        document.querySelectorAll('script[data-dynamic]').forEach(s => s.remove());
      
        // Get all scripts from the new page, excluding navigation.js
        const scripts = Array.from(doc.querySelectorAll('script')).filter(script => {
          if (script.src && script.src.includes('navigation.js')) {
            return false;
          }
          return !script.type || script.type === 'text/javascript';
        });
      
        // Execute scripts sequentially to maintain order
        const loadScripts = (index) => {
          if (index >= scripts.length) {
            // Once all scripts are loaded, trigger custom event
            console.log('All scripts loaded, triggering custom pageScriptsLoaded event');
            const customEvent = new CustomEvent('pageScriptsLoaded', { 
              detail: { page: currentPage } 
            });
            document.dispatchEvent(customEvent);
            
            // Navigation complete
            isNavigating = false;
            return;
          }
          
          const script = scripts[index];
          const newScript = document.createElement('script');
          newScript.setAttribute('data-dynamic', 'true');
          
          // Handle both inline and external scripts
          if (script.src) {
            newScript.onload = () => loadScripts(index + 1);
            newScript.onerror = () => {
              console.error(`Failed to load script: ${script.src}`);
              loadScripts(index + 1);
            };
            newScript.src = script.src;
            document.body.appendChild(newScript);
          } else {
            // For inline scripts, wrap in try/catch
            try {
              newScript.textContent = script.textContent;
              document.body.appendChild(newScript);
            } catch (err) {
              console.error('Error executing inline script:', err);
            }
            loadScripts(index + 1);
          }
        };
        
        // Start loading scripts
        loadScripts(0);
      
        // Dispatch custom event
        const event = new CustomEvent('pageLoaded', { detail: { page: currentPage } });
        document.dispatchEvent(event);
      })
      .catch(() => {
        console.error('Failed to load page, reloading');
        isNavigating = false;
        location.reload();
      });
  });
});