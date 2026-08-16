import { useState, useEffect } from 'react';

export interface UseBlenderOptions<T> {
  initialData: T;
  collectionName: string;
  itemId: string;
}

/**
 * A React hook that enables real-time visual preview updates inside the Next.js storefront.
 * It listens for `postMessage` update events from the parent CMS admin portal.
 */
export function useBlender<T>({ initialData, collectionName, itemId }: UseBlenderOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    // Check if loaded inside an iframe or if edit query param is present
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    const hasEditParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('edit') === 'true';
    
    if (inIframe || hasEditParam) {
      setIsEditing(true);

      // Let the parent visual editor admin page know the preview iframe is loaded and ready
      window.parent.postMessage({ type: 'BLENDER_READY', collectionName, itemId, data }, window.location.origin);

      // Listen for updates from the editor parent frame
      const handleMessage = (event: MessageEvent) => {
        // Validate origin to prevent spoofing from cross-origin pages
        if (event.origin !== window.location.origin) {
          return;
        }
        const message = event.data;
        if (message && message.type === 'BLENDER_UPDATE') {
          if (message.collectionName === collectionName && message.itemId === itemId) {
            setData(message.data);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [collectionName, itemId]);

  /**
   * Generates binding data attributes on HTML elements.
   * If in edit mode, enables inline text editing and hooks up blur events to send edits back.
   */
  const bind = (fieldName: string) => {
    if (!isEditing) return {};
    return {
      'data-blender-field': `${collectionName}:${itemId}:${fieldName}`,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (e: any) => {
        const text = e.currentTarget.innerText || '';
        // Send inline edit event to parent Admin frame
        window.parent.postMessage({
          type: 'BLENDER_INLINE_EDIT',
          collectionName,
          itemId,
          fieldName,
          value: text
        }, window.location.origin);
      },
      style: { 
        outline: '1px dashed rgba(99, 102, 241, 0.4)',
        cursor: 'text',
        minWidth: '20px',
        display: 'inline-block'
      }
    };
  };

  return { data, bind, isEditing };
}
