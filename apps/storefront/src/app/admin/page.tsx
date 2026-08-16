"use client";

import React, { useState, useEffect, useRef } from 'react';

/**
 * Helper utility to securely update state values along nested path strings (e.g. 'blocks.0.data.title')
 */
function setNestedPath(obj: any, pathStr: string, value: any) {
  const newObj = JSON.parse(JSON.stringify(obj));
  const parts = pathStr.split('.');
  let current = newObj;
  
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (forbiddenKeys.includes(part)) {
      console.warn(`Blocked nested path update attempting to access prototype key: "${part}"`);
      return obj; // Return original object unchanged to prevent corruption
    }
    const nextPart = parts[i + 1];
    const isNextNum = !isNaN(Number(nextPart));
    
    if (current[part] === undefined) {
      current[part] = isNextNum ? [] : {};
    }
    current = current[part];
  }
  
  const lastPart = parts[parts.length - 1];
  if (forbiddenKeys.includes(lastPart)) {
    console.warn(`Blocked nested path update attempting to set prototype key: "${lastPart}"`);
    return obj;
  }
  current[lastPart] = value;
  return newObj;
}

export default function AdminPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [activePageId, setActivePageId] = useState<string>('home');
  const [collectionName, setCollectionName] = useState<string>('');
  const [itemId, setItemId] = useState<string>('');
  const [pageData, setPageData] = useState<any>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newPageId, setNewPageId] = useState<string>('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load the page list on mount
  const fetchPageList = async () => {
    try {
      const res = await fetch('/api/blender');
      const data = await res.json();
      if (data.pages) {
        setPages(data.pages);
      }
    } catch (err) {
      console.error('Failed to load page list', err);
    }
  };

  useEffect(() => {
    fetchPageList();

    const handleMessage = (event: MessageEvent) => {
      // Validate origin to prevent spoofing from cross-origin pages
      if (event.origin !== window.location.origin) {
        return;
      }
      const message = event.data;
      if (message) {
        if (message.type === 'BLENDER_READY') {
          setCollectionName(message.collectionName);
          setItemId(message.itemId);
          setPageData(message.data);
          setActivePageId(message.itemId);
          setIsReady(true);
        } else if (message.type === 'BLENDER_INLINE_EDIT') {
          // Sync inline text changes back to visual state
          setPageData((prevData: any) => {
            if (!prevData) return prevData;
            return setNestedPath(prevData, message.fieldName, message.value);
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Update preview dynamic frame
  const handleUpdate = (updatedData: any) => {
    setPageData(updatedData);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'BLENDER_UPDATE',
          collectionName,
          itemId,
          data: updatedData,
        },
        window.location.origin
      );
    }
  };

  const moveBlock = (idx: number, direction: 'up' | 'down') => {
    if (!pageData || !pageData.blocks) return;
    const newBlocks = [...pageData.blocks];
    if (direction === 'up' && idx > 0) {
      const temp = newBlocks[idx];
      newBlocks[idx] = newBlocks[idx - 1];
      newBlocks[idx - 1] = temp;
    } else if (direction === 'down' && idx < newBlocks.length - 1) {
      const temp = newBlocks[idx];
      newBlocks[idx] = newBlocks[idx + 1];
      newBlocks[idx + 1] = temp;
    }
    handleUpdate({ ...pageData, blocks: newBlocks });
  };

  const deleteBlock = (idx: number) => {
    if (!pageData || !pageData.blocks) return;
    const newBlocks = pageData.blocks.filter((_: any, i: number) => i !== idx);
    handleUpdate({ ...pageData, blocks: newBlocks });
  };

  const addBlock = (type: 'Hero' | 'Text' | 'ProductGrid') => {
    if (!pageData) return;
    const newBlocks = pageData.blocks ? [...pageData.blocks] : [];
    let defaultData = {};
    if (type === 'Hero') {
      defaultData = { title: 'New Hero Banner', subtitle: 'This is a subtitle', ctaText: 'Learn More' };
    } else if (type === 'Text') {
      defaultData = { content: 'Enter your new paragraph copy here.' };
    } else if (type === 'ProductGrid') {
      defaultData = { title: 'Featured Arrivals', collectionId: 'footwear', limit: 4 };
    }
    newBlocks.push({ type, data: defaultData });
    handleUpdate({ ...pageData, blocks: newBlocks });
  };

  // Submit current state back to disk
  const handleSave = async () => {
    if (!pageData) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/blender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          collectionName,
          itemId,
          data: pageData,
        }),
      });
      const res = await response.json();
      if (res.success) {
        alert('Changes successfully validated and saved to disk!');
        fetchPageList(); // Refresh list to catch title updates
      } else {
        alert(`Failed to save: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error saving changes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Create new page file
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageId.trim()) return;
    const cleanId = newPageId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    
    try {
      const response = await fetch('/api/blender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          collectionName: 'pages',
          itemId: cleanId,
        }),
      });
      const res = await response.json();
      if (res.success) {
        setNewPageId('');
        await fetchPageList();
        // Load the new page in iframe
        setActivePageId(cleanId);
        setIsReady(false);
      } else {
        alert(`Failed to create page: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error creating page: ${err.message}`);
    }
  };

  // Delete page file
  const handleDeletePage = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid switching to page being deleted
    if (targetId === 'home') {
      alert('Cannot delete the default home page.');
      return;
    }
    if (!confirm(`Are you sure you want to delete /${targetId}?`)) return;

    try {
      const response = await fetch('/api/blender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          collectionName: 'pages',
          itemId: targetId,
        }),
      });
      const res = await response.json();
      if (res.success) {
        await fetchPageList();
        // If deleted the currently active page, revert to home
        if (activePageId === targetId) {
          setActivePageId('home');
          setIsReady(false);
        }
      } else {
        alert(`Failed to delete page: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error deleting page: ${err.message}`);
    }
  };

  const handleSelectPage = (pageId: string) => {
    setActivePageId(pageId);
    setIsReady(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Sidebar Editor Panel */}
      <div 
        style={{ 
          width: '450px', 
          background: '#1f2937', 
          color: 'white', 
          padding: '1.5rem', 
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #374151',
          overflowY: 'auto'
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', color: 'var(--color-primary)' }}>Blender Next Dashboard</h2>
        
        {/* Page List Section */}
        <div style={{ marginBottom: '1.5rem', background: '#111827', padding: '1rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#9ca3af', letterSpacing: '0.05em' }}>PAGES DIRECTORY</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem' }}>
            {pages.map((p) => (
              <div 
                key={p.id}
                onClick={() => handleSelectPage(p.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  background: activePageId === p.id ? '#312e81' : '#1f2937',
                  border: activePageId === p.id ? '1px solid #6366f1' : '1px solid transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                <span>/{p.id} <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>({p.title})</span></span>
                {p.id !== 'home' && (
                  <button 
                    onClick={(e) => handleDeletePage(p.id, e)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px 6px', fontSize: '0.85rem' }}
                    title="Delete page"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleCreatePage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="e.g. about"
              value={newPageId}
              onChange={(e) => setNewPageId(e.target.value)}
              style={{ flexGrow: 1, padding: '0.4rem 0.75rem', background: '#374151', border: 'none', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }}
            />
            <button 
              type="submit"
              style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Create
            </button>
          </form>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #374151', margin: '0 0 1.5rem 0' }} />

        {/* Dynamic Fields Editor */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#9ca3af', letterSpacing: '0.05em' }}>PAGE CONTENT FIELDS</h3>

            {!isReady ? (
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Loading visual preview...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 'bold' }}>
                    PAGE TITLE
                  </label>
                  <input 
                    type="text" 
                    value={pageData.title || ''}
                    onChange={(e) => handleUpdate({ ...pageData, title: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#374151', border: 'none', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                  />
                </div>

                {pageData.blocks?.map((block: any, idx: number) => {
                  if (block.type === 'Hero') {
                    return (
                      <div key={idx} style={{ background: '#374151', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 'bold' }}>BLOCK: HERO BANNER</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} style={{ padding: '0.1rem 0.3rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>▲</button>
                            <button onClick={() => moveBlock(idx, 'down')} disabled={idx === pageData.blocks.length - 1} style={{ padding: '0.1rem 0.3rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: idx === pageData.blocks.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === pageData.blocks.length - 1 ? 0.5 : 1 }}>▼</button>
                            <button onClick={() => deleteBlock(idx)} style={{ padding: '0.1rem 0.3rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                          </div>
                        </div>
                        
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>Hero Title</label>
                          <input 
                            type="text" 
                            value={block.data.title || ''}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.title = e.target.value;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', boxSizing: 'border-box' }}
                          />
                        </div>
 
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>Subtitle</label>
                          <textarea 
                            value={block.data.subtitle || ''}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.subtitle = e.target.value;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            rows={2}
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', fontFamily: 'sans-serif', boxSizing: 'border-box' }}
                          />
                        </div>
 
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>Button Label</label>
                          <input 
                            type="text" 
                            value={block.data.ctaText || ''}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.ctaText = e.target.value;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>Hero Image URL</label>
                          <input 
                            type="text" 
                            value={block.data.imageUrl || ''}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.imageUrl = e.target.value;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            placeholder="e.g. https://images.unsplash.com/..."
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    );
                  } else if (block.type === 'Text') {
                    return (
                      <div key={idx} style={{ background: '#374151', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 'bold' }}>BLOCK: TEXT BODY</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} style={{ padding: '0.1rem 0.3rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>▲</button>
                            <button onClick={() => moveBlock(idx, 'down')} disabled={idx === pageData.blocks.length - 1} style={{ padding: '0.1rem 0.3rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: idx === pageData.blocks.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === pageData.blocks.length - 1 ? 0.5 : 1 }}>▼</button>
                            <button onClick={() => deleteBlock(idx)} style={{ padding: '0.1rem 0.3rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                          </div>
                        </div>
                        
                        <div style={{ marginTop: '0.5rem' }}>
                          <textarea 
                            value={block.data.content || ''}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.content = e.target.value;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            rows={5}
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', fontFamily: 'sans-serif', lineHeight: '1.4', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    );
                  } else if (block.type === 'ProductGrid') {
                    return (
                      <div key={idx} style={{ background: '#374151', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 'bold' }}>BLOCK: PRODUCT GRID</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} style={{ padding: '0.1rem 0.3rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>▲</button>
                            <button onClick={() => moveBlock(idx, 'down')} disabled={idx === pageData.blocks.length - 1} style={{ padding: '0.1rem 0.3rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: idx === pageData.blocks.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === pageData.blocks.length - 1 ? 0.5 : 1 }}>▼</button>
                            <button onClick={() => deleteBlock(idx)} style={{ padding: '0.1rem 0.3rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                          </div>
                        </div>
                        
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>Grid Title</label>
                          <input 
                            type="text" 
                            value={block.data.title || ''}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.title = e.target.value;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', boxSizing: 'border-box' }}
                          />
                        </div>
 
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>Commerce Collection</label>
                          <select 
                            value={block.data.collectionId || ''}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.collectionId = e.target.value;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', boxSizing: 'border-box', cursor: 'pointer' }}
                          >
                            <option value="">-- Select Category --</option>
                            <option value="restaurants">Trending Restaurants (Merchant Menu API)</option>
                            <option value="grocery">Grocery & Convenience (Merchant Menu API)</option>
                          </select>
                        </div>
 
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem', color: '#cbd5e1' }}>Products Limit</label>
                          <input 
                            type="number" 
                            min={1}
                            max={8}
                            value={block.data.limit || 4}
                            onChange={(e) => {
                              const newBlocks = [...pageData.blocks];
                              newBlocks[idx].data.limit = parseInt(e.target.value) || 4;
                              handleUpdate({ ...pageData, blocks: newBlocks });
                            }}
                            style={{ width: '100%', padding: '0.4rem', background: '#1f2937', border: 'none', borderRadius: '4px', color: 'white', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
                
                {/* Add layout block dashboard */}
                <div style={{ marginTop: '1.5rem', background: '#1f2937', padding: '1rem', borderRadius: '8px', border: '1px solid #374151' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#9ca3af', letterSpacing: '0.05em' }}>ADD LAYOUT BLOCK</h4>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button type="button" onClick={() => addBlock('Hero')} style={{ flex: 1, padding: '0.4rem', background: '#374151', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>+ Hero</button>
                    <button type="button" onClick={() => addBlock('Text')} style={{ flex: 1, padding: '0.4rem', background: '#374151', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>+ Text</button>
                    <button type="button" onClick={() => addBlock('ProductGrid')} style={{ flex: 1, padding: '0.4rem', background: '#374151', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>+ Products</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isReady && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              style={{ 
                width: '100%', 
                background: '#4f46e5', 
                color: 'white', 
                border: 'none', 
                padding: '0.85rem', 
                borderRadius: '6px', 
                fontSize: '0.95rem', 
                fontWeight: 'bold', 
                cursor: isSaving ? 'not-allowed' : 'pointer',
                marginTop: '1.5rem'
              }}
            >
              {isSaving ? 'Saving Changes...' : 'Save to Disk / Git'}
            </button>
          )}
        </div>

      </div>

      {/* Preview Viewport Frame */}
      <div style={{ flexGrow: 1, background: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#e5e7eb', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid #d1d5db' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          </div>
          <span style={{ margin: '0 auto', fontSize: '0.85rem', color: '#4b5563', fontFamily: 'monospace' }}>
            Previewing: /{activePageId}?edit=true
          </span>
        </div>
        <iframe 
          ref={iframeRef}
          src={`/${activePageId}?edit=true`} 
          style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
        />
      </div>

    </div>
  );
}
