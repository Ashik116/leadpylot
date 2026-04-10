import { useEffect, useRef, useState } from 'react';

// Hook to detect if component is inside a modal
export const useModalDetection = () => {
    const selectRef = useRef<HTMLDivElement>(null);
    const [isInModal, setIsInModal] = useState(false);
  
    useEffect(() => {
      if (!selectRef.current) return;
  
      const detectModal = () => {
        let element = selectRef.current?.parentElement;
        
        while (element && element !== document.body) {
          // Check for common modal class names and attributes
          const classList = element.classList;
          const hasModalClass = 
            classList.contains('modal') ||
            classList.contains('dialog') ||
            classList.contains('overlay') ||
            classList.contains('backdrop') ||
            classList.contains('fixed') ||
            element.hasAttribute('role') && element.getAttribute('role') === 'dialog' ||
            element.hasAttribute('aria-modal') ||
            // Check for common modal container patterns
            (classList.contains('z-50') || classList.contains('z-40')) ||
            // Check for portal containers
            element.id?.includes('portal') ||
            element.id?.includes('modal') ||
            // Check for computed styles indicating modal behavior
            getComputedStyle(element).position === 'fixed';
  
          if (hasModalClass) {
            setIsInModal(true);
            return;
          }
          
          element = element.parentElement;
        }
        
        setIsInModal(false);
      };
  
      // Run detection after component mounts
      const timeoutId = setTimeout(detectModal, 0);
      
      return () => clearTimeout(timeoutId);
    }, []);
  
    return { selectRef, isInModal };
  };