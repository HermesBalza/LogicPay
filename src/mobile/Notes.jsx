// src/Notes.jsx
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote, Paperclip, Smile, X, FileText } from 'lucide-react';
import './Notes.css';

// Helper to format dates: US format and Venezuela time (UTC‑4)
function formatNoteDate(isoStr) {
  const utc = new Date(isoStr);
  const usDate = utc.toLocaleDateString('en-US'); // MM/DD/YYYY
  const veTime = utc.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Caracas'
  });
  return `${usDate} – ${veTime}`;
}

const EMOJIS = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','👍','👎','👊','✊','🤛','🤜','👋','🤚','🖐','✋','👌','✌','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💓','💗','💖','💘','💝','💟','🙏','💪','🔥','⭐','✨','🎉','🎊','🎈','🎁','🎀','✅','❌','❗','❓','💯','🔴','🟢','🟡','🟠','🟣','🟤','🔵'];

export default function Notes({ currentUser }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const notesListRef = useRef(null);
  const shouldAutoScroll = useRef(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const scrollToBottom = () => {
    const el = notesListRef.current;
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 0);
  };

  useEffect(() => {
    if (shouldAutoScroll.current) {
      scrollToBottom();
      shouldAutoScroll.current = false;
    }
  }, [notes]);

  // ---------------------------------------------------------------------
  // API helpers (Axios is used for convenience – already a dependency of the project)
  // ---------------------------------------------------------------------
  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/notas?userId=${encodeURIComponent(currentUser.id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotes(await res.json());
    } catch (e) {
      console.error('Error loading notes', e);
    }
  };

  const loadUnread = async () => {
    try {
      const res = await fetch(`/api/notas/unread/${currentUser.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const count = typeof data === 'object' && data.count != null ? data.count : data;
      setUnreadCount(count);
    } catch (e) {
      console.error('Error loading unread count', e);
    }
  };

  const markAllRead = async () => {
    const toMark = notes.filter(n => n.autor_id !== currentUser.id && !n.leido);
    await Promise.all(
      toMark.map(n =>
        fetch(`/api/notas/${n.id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        })
      )
    ).catch(e => console.error('Mark read error', e));
    loadUnread();
  };

  const submitNote = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const payload = {
      autorId: currentUser.id,
      mensaje: newMessage,
      parentId: replyTo ? replyTo.id : undefined,
      adjuntos: attachments.length > 0 ? JSON.stringify(attachments) : undefined
    };
    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: currentUser.userId, userName: currentUser.userName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setNewMessage('');
      setReplyTo(null);
      setAttachments([]);
      shouldAutoScroll.current = true;
      await loadNotes();
      await loadUnread();
    } catch (e) {
      console.error('Error creating note', e);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachments(prev => [...prev, { name: file.name, type: file.type, data: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (!file) continue;
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments(prev => [...prev, { name: `Captura (${new Date().toLocaleTimeString()})`, type: file.type, data: ev.target.result }]);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setNewMessage(newMessage.slice(0, start) + emoji + newMessage.slice(end));
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + emoji.length;
      el.focus();
    }, 0);
    setShowEmojiPicker(false);
  };

  const deleteNote = async (id) => {
    try {
      await fetch(`/api/notas/${id}?userId=${currentUser.userId}&userName=${encodeURIComponent(currentUser.userName || '')}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      loadNotes();
      loadUnread();
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  const editNote = async (id, newText) => {
    try {
      await fetch(`/api/notas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: newText, userId: currentUser.userId, userName: currentUser.userName })
      });
      setEditingNoteId(null);
      setEditingText('');
      loadNotes();
    } catch (e) {
      console.error('Edit error', e);
    }
  };

  // ---------------------------------------------------------------------
  // Effects – initial load and polling for badge count every 30 s
  // ---------------------------------------------------------------------
  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // When modal opens, refresh notes and mark as read; lock body scroll
  useEffect(() => {
    if (open) {
      shouldAutoScroll.current = true;
      loadNotes();
      markAllRead();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ---------------------------------------------------------------------
  // Helper to build a tree from flat list (so replies are nested)
  // ---------------------------------------------------------------------
  const buildTree = (flat) => {
    const map = {};
    const roots = [];
    flat.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });
    flat.forEach(item => {
      if (item.parent_id) {
        const parent = map[item.parent_id];
        if (parent) parent.children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });
    return roots;
  };

  const renderNote = (note, depth = 0) => {
    const isEditing = editingNoteId === note.id;
    return (
    <div key={note.id} className="note-item" style={{ marginLeft: depth * 20 }}>
      <div className="note-header">
        <strong>{note.autor_nombre || note.autor_email || 'Usuario'}</strong>
        <span className="note-date">{formatNoteDate(note.created_at)}{note.edited_at ? <span className="text-[9px] text-gray-400 italic ml-1">editado</span> : ''}</span>
        {note.autor_id === currentUser.id && !isEditing && (
          <div className="note-actions">
            <button className="note-btn" onClick={() => { setConfirmDeleteId(note.id); }}>🗑️</button>
            <button className="note-btn" onClick={() => setReplyTo(note)}>↩️</button>
            <button className="note-btn" onClick={() => { setEditingNoteId(note.id); setEditingText(note.mensaje); }}>✏️</button>
          </div>
        )}
        {note.autor_id !== currentUser.id && !isEditing && (
          <div className="note-actions">
            <button className="note-btn" onClick={() => setReplyTo(note)}>↩️</button>
          </div>
        )}
        {note.autor_id !== currentUser.id && !note.leido && (
          <span className="unread-dot" title="No leído" />
        )}
      </div>
      {isEditing ? (
        <div className="note-edit-inline">
          <textarea
            className="note-textarea"
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
            rows={3}
          />
          <div className="notes-form-actions" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={() => editNote(note.id, editingText)}>Guardar</button>
            <button className="btn btn-secondary" onClick={() => { setEditingNoteId(null); setEditingText(''); }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="note-body">{note.mensaje}
          {note.adjuntos && (() => {
            try {
              const files = JSON.parse(note.adjuntos);
              return (
                <div className="note-attachments">
                  {files.map((f, i) => (
                    f.type?.startsWith('image/')
                      ? <img key={i} src={f.data} alt={f.name} className="note-attachment-img" onClick={() => window.open(f.data, '_blank')} />
                      : <div key={i} className="note-attachment-file"><FileText size={14} /><span>{f.name}</span></div>
                  ))}
                </div>
              );
            } catch { return null; }
          })()}
        </div>
      )}
      {note.children && note.children.map(child => renderNote(child, depth + 1))}
    </div>
    );
  };

  // ---------------------------------------------------------------------
  // UI rendering
  // ---------------------------------------------------------------------
  return (
    <>
      <button
        id="notesBtn"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-[#303a7f]/5 text-[#303a7f] rounded-xl border-2 border-transparent hover:border-[#303a7f]/10 hover:bg-[#303a7f]/10 transition-all active:scale-95 group shadow-sm relative"
        title="Bloc de Notas"
      >
        <StickyNote size={16} className="group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Notas</span>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[4px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black leading-none border-2 border-white">{unreadCount}</span>}
      </button>

      {open && createPortal(
        <>
        <div className="notes-modal" onClick={() => setOpen(false)}>
          <div className="notes-content" onClick={e => e.stopPropagation()}>
            <header className="notes-header">
              <h2>Bloc de notas</h2>
              <button onClick={() => setOpen(false)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all active:scale-90 flex items-center justify-center shrink-0"><X size={18} /></button>
            </header>
            <section className="notes-list" ref={notesListRef}>
              {buildTree(notes).map(root => renderNote(root))}
            </section>
            <form className="notes-form" onSubmit={submitNote}>
              {attachments.length > 0 && (
                <div className="notes-attachments">
                  {attachments.map((att, i) => (
                    <div key={i} className="notes-attachment">
                      {att.type.startsWith('image/') ? (
                        <img src={att.data} alt={att.name} />
                      ) : (
                        <FileText size={20} className="text-gray-400 shrink-0" />
                      )}
                      <span className="attachment-name">{att.name}</span>
                      <button type="button" className="remove-attachment" onClick={() => removeAttachment(i)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                ref={textareaRef}
                placeholder={replyTo ? `Responder a ${replyTo.autor_nombre || 'usuario'}...` : 'Nueva nota...'}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitNote(e);
                  }
                }}
                onPaste={handlePaste}
                rows={3}
                required
                className="note-textarea"
              />
              <div className="notes-toolbar">
                <button type="button" className="toolbar-btn" onClick={() => fileInputRef.current.click()} title="Adjuntar archivo">
                  <Paperclip size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emoji">
                  <Smile size={16} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden" />
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    {EMOJIS.map(emoji => (
                      <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}>{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="notes-form-actions">
                <button type="submit" className="btn btn-primary">Enviar</button>
                {replyTo && (
                  <button type="button" onClick={() => setReplyTo(null)} className="btn btn-secondary">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {confirmDeleteId && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#303a7f]/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmDeleteId(null)}>
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-[0_40px_100px_rgba(48,58,127,0.3)] p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 border-2 border-white relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50" />
              <div className="w-20 h-20 rounded-[1.8rem] flex items-center justify-center mb-8 shadow-2xl bg-red-500 text-white shadow-red-900/20 relative z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-in zoom-in duration-500"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </div>
              <h3 className="text-[#303a7f] font-black text-2xl uppercase tracking-tighter mb-4 relative z-10">¿Eliminar nota?</h3>
              <p className="text-gray-400 text-[11px] font-bold leading-relaxed mb-10 uppercase tracking-[0.1em] px-4 relative z-10">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 w-full relative z-10">
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 hover:bg-gray-200">Cancelar</button>
                <button onClick={() => deleteNote(confirmDeleteId)} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-900/20 transition-all active:scale-95 hover:bg-red-600">Eliminar</button>
              </div>
            </div>
          </div>
        )}
        </>,
        document.body
      )}
    </>
  );
}
