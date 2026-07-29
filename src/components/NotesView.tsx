import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  FileText, 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  Tag as TagIcon, 
  Image as ImageIcon, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  ListCheck, 
  List, 
  Quote, 
  Code, 
  Minus,
  Check, 
  X, 
  Eye, 
  Edit3,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileDown,
  SlidersHorizontal
} from 'lucide-react';
import { NotesStore, NoteFolder, NoteItem, Office } from '../types';
import { getStoredNotesStore, getStoredNotesStoreAsync, saveStoredNotesStore } from '../services/notesService';
import { getStorageItem } from '../services/syncService';

interface NotesViewProps {
  offices: Office[];
  onSaveOffices?: (offices: Office[]) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ offices, onSaveOffices }) => {
  const [store, setStore] = useState<NotesStore>(getStoredNotesStore);

  // Auto-sync notes from Mac Disk Server API
  useEffect(() => {
    let isMounted = true;
    const syncNotesStore = async () => {
      const latest = await getStoredNotesStoreAsync();
      if (isMounted && latest && latest.folders && latest.notes) {
        setStore(latest);
      }
    };

    syncNotesStore();

    const interval = setInterval(syncNotesStore, 4000);
    window.addEventListener('focus', syncNotesStore);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', syncNotesStore);
    };
  }, []);

  // Active selection
  const [selectedFolderId, setSelectedFolderId] = useState<string>('folder-geral');
  const [selectedOfficeTagFilter, setSelectedOfficeTagFilter] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Search
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [noteSearchTerm, setNoteSearchTerm] = useState('');

  // Modals / Forms (Folders)
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#38BDF8');

  // Modals / Forms (Office Tags Management)
  const [showOfficeTagModal, setShowOfficeTagModal] = useState<boolean>(false);
  const [editingOfficeTag, setEditingOfficeTag] = useState<Office | null>(null);
  const [officeTagName, setOfficeTagName] = useState<string>('');
  const [officeTagColor, setOfficeTagColor] = useState<string>('#F59E0B');

  // UI Expand / Collapse States
  const [isTagsCollapsed, setIsTagsCollapsed] = useState(true);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isAttachedImagesCollapsed, setIsAttachedImagesCollapsed] = useState<boolean>(true);
  const [mobileSubView, setMobileSubView] = useState<'list' | 'editor'>('list');

  // Preview Mode vs Edit Mode in Note Editor
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [showFormattingTools, setShowFormattingTools] = useState<boolean>(false);

  // Custom Tag Editing States & Handlers
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isAddingCustomTag, setIsAddingCustomTag] = useState<boolean>(false);

  const handleAddCustomTag = (tagText: string) => {
    if (!activeNote) return;
    const cleanTag = tagText.trim();
    if (!cleanTag) return;
    if (!activeNote.officeTags.includes(cleanTag)) {
      handleUpdateActiveNote({
        officeTags: [...activeNote.officeTags, cleanTag]
      });
    }
    setNewTagInput('');
    setIsAddingCustomTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeNote) return;
    handleUpdateActiveNote({
      officeTags: activeNote.officeTags.filter(t => t !== tagToRemove)
    });
  };

  // Office Tag CRUD Handlers (Create, Rename/Edit, Delete)
  const handleSaveOfficeTag = () => {
    if (!officeTagName.trim()) return;
    const cleanName = officeTagName.trim();

    if (editingOfficeTag) {
      const oldName = editingOfficeTag.name;
      const updatedOffices = offices.map(off => 
        off.id === editingOfficeTag.id 
          ? { ...off, name: cleanName, color: officeTagColor } 
          : off
      );
      if (onSaveOffices) {
        onSaveOffices(updatedOffices);
      }
      // If name changed, update existing notes that used the old tag name
      if (oldName !== cleanName) {
        setStore(prev => ({
          ...prev,
          notes: prev.notes.map(n => ({
            ...n,
            officeTags: n.officeTags.map(t => t === oldName ? cleanName : t)
          }))
        }));
      }
    } else {
      const newOffice: Office = {
        id: `office-${Date.now()}`,
        name: cleanName,
        dailyMeta: 100,
        color: officeTagColor
      };
      const updatedOffices = [...offices, newOffice];
      if (onSaveOffices) {
        onSaveOffices(updatedOffices);
      }
    }

    setOfficeTagName('');
    setEditingOfficeTag(null);
    setShowOfficeTagModal(false);
  };

  const handleDeleteOfficeTag = (officeTag: Office) => {
    if (confirm(`Deseja excluir a tag de escritório "${officeTag.name}"? Ela será removida das notas associadas.`)) {
      const updatedOffices = offices.filter(off => off.id !== officeTag.id);
      if (onSaveOffices) {
        onSaveOffices(updatedOffices);
      }
      setStore(prev => ({
        ...prev,
        notes: prev.notes.map(n => ({
          ...n,
          officeTags: n.officeTags.filter(t => t !== officeTag.name)
        }))
      }));
      if (selectedOfficeTagFilter === officeTag.name) {
        setSelectedOfficeTagFilter(null);
      }
    }
  };

  // Save to storage on change
  useEffect(() => {
    saveStoredNotesStore(store);
  }, [store]);

  // Sync background polling for cross-device updates
  useEffect(() => {
    const interval = setInterval(async () => {
      const remote = await getStorageItem<NotesStore>('notes', 'demands_notes_store_v1', store);
      if (remote && remote.notes && JSON.stringify(remote.notes) !== JSON.stringify(store.notes)) {
        setStore(remote);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [store]);

  // Current active note object
  const activeNote = store.notes.find(n => n.id === activeNoteId) || null;

  // Create New Note
  const handleCreateNewNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      folderId: selectedFolderId || store.folders[0]?.id || 'folder-geral',
      title: 'Nova Anotação',
      content: '# Título da Anotação\n\nEscreva suas anotações aqui...',
      officeTags: selectedOfficeTagFilter ? [selectedOfficeTagFilter] : [],
      images: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setStore(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
    setActiveNoteId(newNote.id);
    setMobileSubView('editor');
  };

  // Update Active Note Properties (Live Auto-save)
  const handleUpdateActiveNote = (updates: Partial<NoteItem>) => {
    if (!activeNoteId) return;
    setStore(prev => ({
      ...prev,
      notes: prev.notes.map(n => {
        if (n.id === activeNoteId) {
          return {
            ...n,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return n;
      })
    }));
  };

  // Delete Active Note
  const handleDeleteNote = (noteId: string) => {
    if (confirm('Tem certeza que deseja excluir esta anotação?')) {
      const remaining = store.notes.filter(n => n.id !== noteId);
      setStore(prev => ({ ...prev, notes: remaining }));
      if (activeNoteId === noteId) {
        setActiveNoteId(remaining[0]?.id || null);
      }
    }
  };

  // Toggle Pin Note
  const handleTogglePinNote = (noteId: string) => {
    setStore(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n)
    }));
  };

  // Folder CRUD
  const handleSaveFolder = () => {
    if (!newFolderName.trim()) return;

    if (editingFolder) {
      setStore(prev => ({
        ...prev,
        folders: prev.folders.map(f => f.id === editingFolder.id ? { ...f, name: newFolderName.trim(), color: newFolderColor } : f)
      }));
    } else {
      const newFolder: NoteFolder = {
        id: `folder-${Date.now()}`,
        name: newFolderName.trim(),
        color: newFolderColor,
        isPinned: false,
        createdAt: new Date().toISOString()
      };
      setStore(prev => ({ ...prev, folders: [...prev.folders, newFolder] }));
      setSelectedFolderId(newFolder.id);
    }

    setNewFolderName('');
    setEditingFolder(null);
    setShowFolderModal(false);
  };

  const handleTogglePinFolder = (folderId: string) => {
    setStore(prev => ({
      ...prev,
      folders: prev.folders.map(f => f.id === folderId ? { ...f, isPinned: !f.isPinned } : f)
    }));
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Excluir esta pasta? As notas dela serão movidas para Geral.')) {
      setStore(prev => ({
        folders: prev.folders.filter(f => f.id !== folderId),
        notes: prev.notes.map(n => n.folderId === folderId ? { ...n, folderId: 'folder-geral' } : n)
      }));
      if (selectedFolderId === folderId) {
        setSelectedFolderId('folder-geral');
      }
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeNote) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      if (base64Str) {
        const textarea = document.getElementById('note-editor-textarea') as HTMLTextAreaElement;
        const start = textarea ? textarea.selectionStart : activeNote.content.length;
        const end = textarea ? textarea.selectionEnd : activeNote.content.length;
        const currentContent = activeNote.content || '';
        const currentImages = activeNote.images || [];
        const nextImgNum = currentImages.length + 1;
        const imageTag = `\n![Imagem ${nextImgNum}]\n`;
        const newContent = currentContent.substring(0, start) + imageTag + currentContent.substring(end);

        handleUpdateActiveNote({ 
          content: newContent,
          images: [...currentImages, base64Str] 
        });

        setTimeout(() => {
          if (textarea) {
            textarea.focus();
            const newCursorPos = start + imageTag.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 50);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Clipboard Image Paste in Note Editor (inserts clean ![Imagem N] tag at cursor location)
  const handlePasteImage = (e: React.ClipboardEvent<HTMLTextAreaElement> | ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !activeNote) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string') {
              const base64Image = reader.result as string;

              // Get current cursor location from textarea
              const textarea = document.getElementById('note-editor-textarea') as HTMLTextAreaElement;
              const start = textarea ? textarea.selectionStart : activeNote.content.length;
              const end = textarea ? textarea.selectionEnd : activeNote.content.length;
              const currentContent = activeNote.content || '';
              const currentImages = activeNote.images || [];
              const nextImgNum = currentImages.length + 1;

              const imageTag = `\n![Imagem ${nextImgNum}]\n`;
              const newContent = currentContent.substring(0, start) + imageTag + currentContent.substring(end);

              handleUpdateActiveNote({ 
                content: newContent,
                images: [...currentImages, base64Image]
              });

              setTimeout(() => {
                if (textarea) {
                  textarea.focus();
                  const newCursorPos = start + imageTag.length;
                  textarea.setSelectionRange(newCursorPos, newCursorPos);
                }
              }, 50);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleRemoveImage = (imgIdx: number) => {
    if (!activeNote) return;
    const currentImages = [...(activeNote.images || [])];
    currentImages.splice(imgIdx, 1);
    handleUpdateActiveNote({ images: currentImages });
  };

  // Formatting Helper Insertion
  const insertFormatting = (prefix: string, suffix = '') => {
    if (!activeNote) return;
    const textarea = document.getElementById('note-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = activeNote.content || '';
    const selectedText = currentContent.substring(start, end);

    const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;
    const newContent = currentContent.substring(0, start) + replacement + currentContent.substring(end);

    handleUpdateActiveNote({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 5));
    }, 50);
  };

  // PDF Document Export Generator
  const handleExportPDF = () => {
    if (!activeNote) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date(activeNote.updatedAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const tagPillsHtml = activeNote.officeTags.map(tName => {
      const off = offices.find(o => o.name.toLowerCase() === tName.toLowerCase());
      const color = off ? off.color : '#0284C7';
      return `<span style="display:inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; background-color: ${color}20; color: ${color}; border: 1px solid ${color}40; margin-right: 6px;">${tName}</span>`;
    }).join('');

    const formatInlinePdf = (text: string) => {
      return text
        .replace(/`(.*?)`/g, '<code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 6px; border-radius: 4px; color: #D97706; font-weight: 700;">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 900; color: #0F172A;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #334155;">$1</em>');
    };

    const lines = (activeNote.content || '').split('\n');
    const formattedContentHtml = lines.map(line => {
      if (line.trim().startsWith('```')) {
        const codeText = line.replace(/```/g, '');
        return `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; background: #0F172A; color: #F59E0B; padding: 10px 14px; border-radius: 8px; margin: 10px 0; overflow-x: auto;"><code>${codeText}</code></pre>`;
      }
      if (line.trim().startsWith('![')) {
        const numMatch = line.match(/!\[Imagem\s*(\d+)\]/i);
        if (numMatch) {
          const imgIndex = parseInt(numMatch[1], 10) - 1;
          const imgSrc = activeNote.images && activeNote.images[imgIndex] ? activeNote.images[imgIndex] : null;
          if (imgSrc) {
            return `<div style="margin: 14px 0; text-align: center;"><img src="${imgSrc}" style="max-width: 100%; max-height: 420px; border-radius: 12px; border: 1px solid #CBD5E1;" /></div>`;
          }
        }
      }
      if (['---', '***', '___'].includes(line.trim())) {
        return `<hr style="border: none; border-top: 1px solid #CBD5E1; margin: 16px 0;" />`;
      }
      if (line.startsWith('# ')) {
        return `<h1 style="font-size: 22px; font-weight: 900; color: #0F172A; margin-top: 20px; margin-bottom: 10px;">${formatInlinePdf(line.replace('# ', ''))}</h1>`;
      }
      if (line.startsWith('## ')) {
        return `<h2 style="font-size: 16px; font-weight: 800; color: #1E293B; margin-top: 16px; margin-bottom: 8px;">${formatInlinePdf(line.replace('## ', ''))}</h2>`;
      }
      if (line.startsWith('> ')) {
        return `<blockquote style="border-left: 3px solid #F59E0B; padding: 6px 12px; margin: 8px 0; background: #FFFBEB; border-radius: 0 6px 6px 0; color: #78350F; font-style: italic; font-size: 14px; line-height: 1.6;">${formatInlinePdf(line.replace('> ', ''))}</blockquote>`;
      }
      if (line.startsWith('- [x] ')) {
        return `<div style="margin: 6px 0; font-size: 14px; line-height: 1.6; color: #166534; font-weight: 700; display: flex; align-items: center;"><span style="color: #16A34A; margin-right: 8px; font-weight: 900;">✔</span> <span style="text-decoration: line-through;">${formatInlinePdf(line.replace('- [x] ', ''))}</span></div>`;
      }
      if (line.startsWith('- [ ] ')) {
        return `<div style="margin: 6px 0; font-size: 14px; line-height: 1.6; color: #334155; font-weight: 600;"><span style="margin-right: 8px; color: #64748B;">☐</span> ${formatInlinePdf(line.replace('- [ ] ', ''))}</div>`;
      }
      if (line.startsWith('- ')) {
        return `<div style="margin: 6px 0; font-size: 14px; line-height: 1.6; color: #1E293B; padding-left: 8px; display: flex; align-items: center;"><span style="color: #475569; margin-right: 8px; font-weight: 700;">•</span> <span>${formatInlinePdf(line.replace('- ', ''))}</span></div>`;
      }
      if (line.trim().length === 0) return '<div style="height: 6px;"></div>';
      return `<p style="margin: 8px 0; line-height: 1.6; color: #1E293B; font-size: 14px;">${formatInlinePdf(line)}</p>`;
    }).join('');

    const imagesHtml = (activeNote.images || []).map(imgSrc => (
      `<div style="margin-top: 16px; text-align: center;"><img src="${imgSrc}" style="max-width: 100%; max-height: 420px; border-radius: 12px; border: 1px solid #CBD5E1; box-shadow: 0 4px 10px -2px rgba(0,0,0,0.08);" /></div>`
    )).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${activeNote.title || 'Documento Nota'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #F8FAFC;
              color: #0F172A;
              margin: 0;
              padding: 40px;
            }
            .document-card {
              max-width: 800px;
              margin: 0 auto;
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
            }
            .document-header {
              border-bottom: 2px solid #E2E8F0;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .document-title {
              font-size: 26px;
              font-weight: 900;
              color: #0F172A;
              margin: 0 0 12px 0;
              letter-spacing: -0.5px;
            }
            .document-meta {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 12px;
              color: #64748B;
              font-weight: 600;
            }
            @media print {
              body { background-color: #FFFFFF; padding: 0; }
              .document-card { border: none; box-shadow: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="document-card">
            <div class="document-header">
              <h1 class="document-title">${activeNote.title || 'Sem Título'}</h1>
              <div class="document-meta">
                <div>${tagPillsHtml}</div>
                <div>Atualizado em: ${dateStr}</div>
              </div>
            </div>
            <div class="document-content">
              ${formattedContentHtml}
              ${imagesHtml}
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Filter Folders
  const filteredFolders = store.folders.filter(f => f.name.toLowerCase().includes(folderSearchTerm.toLowerCase()));
  const pinnedFolders = filteredFolders.filter(f => f.isPinned);
  const unpinnedFolders = filteredFolders.filter(f => !f.isPinned);

  // Filter Notes for Middle Panel
  const filteredNotes = store.notes.filter(note => {
    if (selectedOfficeTagFilter) {
      if (!note.officeTags.includes(selectedOfficeTagFilter)) return false;
    } else if (selectedFolderId) {
      if (note.folderId !== selectedFolderId) return false;
    }

    if (noteSearchTerm.trim()) {
      const term = noteSearchTerm.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(term);
      const contentMatch = note.content.toLowerCase().includes(term);
      if (!titleMatch && !contentMatch) return false;
    }

    return true;
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  const currentFolder = store.folders.find(f => f.id === selectedFolderId);

  return (
    <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-3rem)] flex flex-col md:flex-row gap-4 overflow-hidden">
      
      {/* LEFT PANEL: FOLDERS & OFFICE TAGS */}
      <div 
        className={`bg-[#101010] border border-[#222222] shadow-xl rounded-2xl flex-col space-y-4 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          mobileSubView === 'editor' ? 'hidden md:flex' : 'flex'
        } ${
          isEditorExpanded 
            ? 'w-0 p-0 border-0 opacity-0 pointer-events-none -mr-4' 
            : 'w-full md:w-64 p-4 opacity-100'
        }`}
      >
        {/* Header & Add Folder Button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <Folder className="w-4 h-4 text-brand-yellow" />
            <span>Pastas & Tags</span>
          </h2>
          <button
            onClick={() => {
              setEditingFolder(null);
              setNewFolderName('');
              setShowFolderModal(true);
            }}
            className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white transition-colors"
            title="Nova Pasta"
          >
            <FolderPlus className="w-4 h-4 text-brand-yellow" />
          </button>
        </div>

        {/* Collapsible Office Tags Section with Management (Create, Edit, Delete) */}
        <div className="border-b border-slate-800/80 pb-2">
          {/* Header row with hover group for + button */}
          <div className="flex items-center justify-between mb-2 group/header">
            <button
              onClick={() => setIsTagsCollapsed(!isTagsCollapsed)}
              className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
            >
              <TagIcon className="w-3 h-3 text-cyan-400" />
              <span>TAGS DOS ESCRITÓRIOS</span>
              {isTagsCollapsed ? <ChevronRight className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>

            <button
              onClick={() => {
                setEditingOfficeTag(null);
                setOfficeTagName('');
                setOfficeTagColor('#F59E0B');
                setShowOfficeTagModal(true);
              }}
              className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white transition-opacity duration-200 opacity-0 pointer-events-none group-hover/header:opacity-100 group-hover/header:pointer-events-auto flex items-center gap-1 text-[10px] font-bold"
              title="Nova Tag de Escritório"
            >
              <Plus className="w-3.5 h-3.5 text-brand-yellow" />
            </button>
          </div>

          {!isTagsCollapsed && (
            <div className="space-y-1">
              <button
                onClick={() => setSelectedOfficeTagFilter(null)}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  selectedOfficeTagFilter === null 
                    ? 'bg-dark-700 text-brand-yellow border border-brand-yellow/30 font-extrabold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/40'
                }`}
              >
                <span>Todas as Pastas</span>
                {selectedOfficeTagFilter === null && <Check className="w-3.5 h-3.5 text-brand-yellow" />}
              </button>

              {offices.map(off => (
                <div
                  key={off.id}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group/item ${
                    selectedOfficeTagFilter === off.name
                      ? 'bg-dark-700 text-brand-yellow border border-brand-yellow/30 font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/40'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedOfficeTagFilter(selectedOfficeTagFilter === off.name ? null : off.name);
                    }}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: off.color }} />
                    <span className="truncate">{off.name}</span>
                  </button>

                  <div className="flex items-center gap-1 opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOfficeTag(off);
                        setOfficeTagName(off.name);
                        setOfficeTagColor(off.color);
                        setShowOfficeTagModal(true);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-dark-600"
                      title="Editar Tag de Escritório"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOfficeTag(off);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Excluir Tag de Escritório"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Folder Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar pastas..."
            value={folderSearchTerm}
            onChange={(e) => setFolderSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-yellow"
          />
        </div>

        {/* Folder Navigation List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {/* Pinned Folders */}
          {pinnedFolders.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Pin className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>PASTAS FIXADAS ({pinnedFolders.length})</span>
              </span>
              {pinnedFolders.map(f => (
                <div
                  key={f.id}
                  onClick={() => { setSelectedFolderId(f.id); setSelectedOfficeTagFilter(null); }}
                  className={`group px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                    selectedFolderId === f.id && !selectedOfficeTagFilter
                      ? 'bg-dark-600 text-white font-bold border border-slate-600'
                      : 'text-slate-300 hover:bg-dark-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color || '#38BDF8' }} />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleTogglePinFolder(f.id); }} className="text-amber-400">
                      <Pin className="w-3 h-3 fill-amber-400" />
                    </button>
                    {f.id !== 'folder-geral' && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }} className="text-slate-400 hover:text-rose-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Folders */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              TODAS AS PASTAS ({unpinnedFolders.length})
            </span>
            {unpinnedFolders.map(f => (
              <div
                key={f.id}
                onClick={() => { setSelectedFolderId(f.id); setSelectedOfficeTagFilter(null); }}
                className={`group px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                  selectedFolderId === f.id && !selectedOfficeTagFilter
                    ? 'bg-dark-600 text-white font-bold border border-slate-600'
                    : 'text-slate-300 hover:bg-dark-700/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color || '#38BDF8' }} />
                  <span className="truncate">{f.name}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleTogglePinFolder(f.id); }} className="text-slate-400 hover:text-amber-400">
                    <Pin className="w-3 h-3" />
                  </button>
                  {f.id !== 'folder-geral' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }} className="text-slate-400 hover:text-rose-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MIDDLE PANEL: NOTES LIST */}
      <div 
        className={`bg-[#101010] border border-[#222222] shadow-xl rounded-2xl flex-col space-y-4 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          mobileSubView === 'editor' ? 'hidden md:flex' : 'flex'
        } ${
          isEditorExpanded 
            ? 'w-0 p-0 border-0 opacity-0 pointer-events-none -mr-4' 
            : 'w-full md:w-80 p-4 opacity-100'
        }`}
      >
        {/* Header & Create Note */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="truncate">
            <h2 className="text-sm font-black text-white truncate">
              {selectedOfficeTagFilter ? `Tag: ${selectedOfficeTagFilter}` : currentFolder?.name || 'Anotações'}
            </h2>
            <span className="text-[10px] text-slate-400 block font-medium">{filteredNotes.length} notas</span>
          </div>

          <button
            onClick={handleCreateNewNote}
            className="px-3 py-1.5 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-dark-900 font-extrabold text-xs shadow-md transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Nota</span>
          </button>
        </div>

        {/* Note Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar nas notas..."
            value={noteSearchTerm}
            onChange={(e) => setNoteSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-yellow"
          />
        </div>

        {/* Notes List Container */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <span className="text-xs text-slate-400 block font-medium">Nenhuma nota encontrada.</span>
            </div>
          ) : (
            <>
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                    <Pin className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>FIXADAS</span>
                  </span>

                  {pinnedNotes.map(note => {
                    const isActive = activeNoteId === note.id;
                    const snippet = (note.content || '').replace(/[#*`>-]/g, '').slice(0, 70);

                    return (
                      <div
                        key={note.id}
                        onClick={() => {
                          setActiveNoteId(note.id);
                          setMobileSubView('editor');
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                          isActive 
                            ? 'bg-[#1C1C1C] border-brand-yellow/50 shadow-md ring-1 ring-brand-yellow/20' 
                            : 'bg-[#141414] hover:bg-[#1C1C1C] border-[#222222]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-white truncate max-w-[190px]">
                            {note.title || 'Sem Título'}
                          </h4>
                          <button onClick={(e) => { e.stopPropagation(); handleTogglePinNote(note.id); }}>
                            <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          </button>
                        </div>

                        {snippet && <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{snippet}</p>}

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-semibold">
                          <span>{new Date(note.updatedAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                          {note.officeTags.length > 0 && (
                            <div className="flex gap-1">
                              {note.officeTags.map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 font-bold">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Other Unpinned Notes */}
              <div className="space-y-2">
                {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mt-3">
                    OUTRAS ANOTAÇÕES
                  </span>
                )}

                {unpinnedNotes.map(note => {
                  const isActive = activeNoteId === note.id;
                  const snippet = (note.content || '').replace(/[#*`>-]/g, '').slice(0, 70);

                  return (
                    <div
                      key={note.id}
                      onClick={() => {
                        setActiveNoteId(note.id);
                        setMobileSubView('editor');
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isActive 
                          ? 'bg-[#1C1C1C] border-brand-yellow/50 shadow-md ring-1 ring-brand-yellow/20' 
                          : 'bg-[#141414] hover:bg-[#1C1C1C] border-[#222222]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-white truncate max-w-[190px]">
                          {note.title || 'Sem Título'}
                        </h4>
                        <button onClick={(e) => { e.stopPropagation(); handleTogglePinNote(note.id); }} className="text-slate-500 hover:text-amber-400">
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {snippet && <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{snippet}</p>}

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-semibold">
                        <span>{new Date(note.updatedAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                        {note.officeTags.length > 0 && (
                          <div className="flex gap-1">
                            {note.officeTags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 rounded bg-dark-900 text-slate-300 border border-slate-700 font-bold">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT MAIN PANEL: RICH NOTE EDITOR */}
      <div className={`flex-1 bg-[#101010] border-y sm:border border-[#222222] shadow-xl rounded-none sm:rounded-2xl p-2 sm:p-5 flex flex-col space-y-2.5 overflow-hidden transition-all duration-300 ease-in-out min-w-0 ${
        mobileSubView === 'list' ? 'hidden md:flex' : 'flex'
      }`}>
        {activeNote ? (
          <>
            {/* Top Navigation & Action Controls Bar */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#222222]">
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileSubView('list')}
                className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#161616] border border-[#222222] text-xs font-bold text-slate-300 hover:text-white flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-brand-yellow" />
                <span>Notas</span>
              </button>

              {/* Desktop Focus Mode Toggle Button */}
              <button
                onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all ${
                  isEditorExpanded 
                    ? 'bg-amber-400 text-dark-900 border-amber-400 font-extrabold shadow-md' 
                    : 'bg-[#161616] text-slate-300 border-[#222222] hover:text-white'
                }`}
                title={isEditorExpanded ? "Restaurar visão dos painéis" : "Expandir modo de foco (tela cheia)"}
              >
                {isEditorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isEditorExpanded ? 'Restaurar Painéis' : 'Modo Foco'}</span>
              </button>

              {/* Right Controls: Edit/Preview + Tools Toggle */}
              <div className="flex items-center gap-1.5">
                {/* Editor / Preview Switch */}
                <div className="flex items-center bg-[#141414] p-0.5 rounded-xl border border-[#222222] text-xs">
                  <button
                    onClick={() => setEditorTab('edit')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      editorTab === 'edit' ? 'bg-[#222222] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      editorTab === 'preview' ? 'bg-[#222222] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>
                </div>

                {/* Collapsible Tools & Settings Button */}
                <button
                  onClick={() => setShowFormattingTools(!showFormattingTools)}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                    showFormattingTools 
                      ? 'bg-brand-yellow text-dark-900 border-brand-yellow font-extrabold shadow-sm' 
                      : 'bg-[#161616] text-slate-300 border-[#222222] hover:text-white'
                  }`}
                  title="Expandir ferramentas e ajustes"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFormattingTools ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Dedicated Full-Width Title Row */}
            <div className="pb-1">
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                placeholder="Título da anotação..."
                className="w-full text-base sm:text-xl font-black text-white bg-transparent border-b border-[#222222]/80 focus:border-brand-yellow focus:outline-none placeholder-slate-500 py-1.5 px-0.5"
              />
            </div>

            {/* Active Tags Bar */}
            {activeNote.officeTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <TagIcon className="w-3 h-3 text-brand-yellow" />
                  <span>Tags:</span>
                </span>

                {activeNote.officeTags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 text-[11px] font-extrabold group transition-all"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-400 p-0.5 rounded transition-colors"
                      title={`Remover tag "${tag}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Collapsible Tools & Metadata Panel (Smooth Bidirectional Transition) */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showFormattingTools 
                ? 'max-h-[500px] opacity-100 my-1.5' 
                : 'max-h-0 opacity-0 my-0 border-0 pointer-events-none'
            }`}>
              <div className="bg-[#141414] p-3 rounded-xl border border-[#222222] space-y-3">
                {/* Row 1: Folder Selector & Office Tags */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Pasta:</span>
                    <select
                      value={activeNote.folderId}
                      onChange={(e) => handleUpdateActiveNote({ folderId: e.target.value })}
                      className="px-2.5 py-0.5 rounded-lg bg-[#101010] border border-[#222222] text-white font-bold focus:outline-none focus:border-brand-yellow text-xs"
                    >
                      {store.folders.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 max-w-full overflow-x-auto custom-scrollbar py-0.5">
                    <span className="text-slate-400 font-bold flex-shrink-0">Escritórios:</span>
                    <div className="flex items-center gap-1">
                      {offices.map(off => {
                        const isSelected = activeNote.officeTags.includes(off.name);
                        return (
                          <button
                            key={off.id}
                            onClick={() => {
                              const newTags = isSelected 
                                ? activeNote.officeTags.filter(t => t !== off.name)
                                : [...activeNote.officeTags, off.name];
                              handleUpdateActiveNote({ officeTags: newTags });
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all border whitespace-nowrap ${
                              isSelected 
                                ? 'bg-amber-400 text-dark-900 border-amber-400 shadow-sm' 
                                : 'bg-[#101010] text-slate-400 border-[#222222] hover:border-slate-500'
                            }`}
                          >
                            {off.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 2: Rich Formatting Buttons & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222222]">
                  {/* Formatting Buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
                    <button
                      onClick={() => insertFormatting('**', '**')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Negrito (**)"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertFormatting('*', '*')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Itálico (*)"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-[#222222] mx-0.5" />
                    <button
                      onClick={() => insertFormatting('# ')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Título H1 (#)"
                    >
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertFormatting('## ')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Subtítulo H2 (##)"
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-[#222222] mx-0.5" />
                    <button
                      onClick={() => insertFormatting('- [ ] ')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Checklist (- [ ])"
                    >
                      <ListCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertFormatting('- ')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Lista (-)"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertFormatting('> ')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Citação (>)"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertFormatting('`', '`')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Código (`)"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertFormatting('\n---\n')}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors"
                      title="Divisor (---)"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <label className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#222222] transition-colors cursor-pointer" title="Inserir Imagem">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>

                  {/* Actions (Export, Pin, Delete) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleExportPDF}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleTogglePinNote(activeNote.id)}
                      className={`p-1.5 rounded-lg border ${
                        activeNote.isPinned ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-[#161616] text-slate-400 border-[#222222]'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${activeNote.isPinned ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(activeNote.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Edge-to-Edge Full Width Editor Writing Area */}
            <div className="flex-1 flex flex-col min-h-[320px] sm:min-h-[420px] overflow-hidden -mx-2 sm:mx-0 transition-all duration-500 ease-in-out">
              {editorTab === 'edit' ? (
                <div className="flex-1 flex flex-col bg-[#070708] border-y sm:border border-[#222222] rounded-none sm:rounded-xl overflow-hidden shadow-inner">
                  {/* Editor Top Header Status */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#0E0E10] border-b border-[#1E1E22] text-[10px] font-mono text-slate-400 select-none">
                    <span className="font-extrabold text-slate-300 tracking-wider">EDITOR</span>
                    <span className="text-slate-500 font-bold uppercase">MARKDOWN • UTF-8</span>
                  </div>

                  {/* Monospace Textarea */}
                  <textarea
                    id="note-editor-textarea"
                    value={activeNote.content}
                    onChange={(e) => handleUpdateActiveNote({ content: e.target.value })}
                    onPaste={handlePasteImage}
                    placeholder="Escreva suas anotações com suporte a Markdown, listas e imagens..."
                    className="flex-1 w-full p-4 sm:p-5 bg-transparent text-xs sm:text-sm leading-relaxed font-mono text-slate-100 placeholder-slate-600 focus:outline-none resize-none custom-scrollbar min-h-[300px] selection:bg-amber-400/20 selection:text-white"
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="flex-1 w-full p-4 sm:p-6 bg-[#0A0A0A] border-y sm:border border-[#222222] rounded-none sm:rounded-xl overflow-y-auto custom-scrollbar space-y-3 prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 min-h-[300px]">
                  {(() => {
                    const parseMarkdownInline = (text: string) => {
                      const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
                      return parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                          return <strong key={i} className="font-black text-white">{part.slice(2, -2)}</strong>;
                        }
                        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                          return <em key={i} className="italic font-medium text-white">{part.slice(1, -1)}</em>;
                        }
                        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
                          return (
                            <code key={i} className="px-1.5 py-0.5 rounded-md bg-[#1C1C1C] border border-[#2B2B2B] text-amber-400 font-mono text-xs font-bold">
                              {part.slice(1, -1)}
                            </code>
                          );
                        }
                        return part;
                      });
                    };

                    return activeNote.content.split('\n').map((line, idx) => {
                      // 1. Code blocks ```
                      if (line.trim().startsWith('```')) {
                        return (
                          <div key={idx} className="my-2 p-3 rounded-xl bg-[#0E0E10] border border-[#222222] font-mono text-xs text-amber-300 overflow-x-auto">
                            <code>{line.replace(/```/g, '')}</code>
                          </div>
                        );
                      }

                      // 2. Check for ![Imagem N] clean tag
                      if (line.trim().startsWith('![')) {
                        const numMatch = line.match(/!\[Imagem\s*(\d+)\]/i);
                        if (numMatch) {
                          const imgIndex = parseInt(numMatch[1], 10) - 1;
                          const imgSrc = activeNote.images && activeNote.images[imgIndex] ? activeNote.images[imgIndex] : null;
                          if (imgSrc) {
                            return (
                              <div key={idx} className="my-3">
                                <img src={imgSrc} alt={`Imagem ${numMatch[1]}`} className="max-w-full max-h-[500px] object-contain rounded-xl border border-[#222222] shadow-lg" />
                              </div>
                            );
                          }
                        }

                        // 3. Check for standard ![alt](url) tag
                        const match = line.match(/!\[(.*?)\]\((.*?)\)/);
                        if (match) {
                          return (
                            <div key={idx} className="my-3">
                              <img src={match[2]} alt={match[1] || 'Imagem'} className="max-w-full max-h-[500px] object-contain rounded-xl border border-[#222222] shadow-lg" />
                            </div>
                          );
                        }
                      }
                      // 4. Horizontal Dividers (--- / *** / ___)
                      if (['---', '***', '___'].includes(line.trim())) {
                        return <hr key={idx} className="my-4 border-t border-[#262626]" />;
                      }
                      if (line.startsWith('# ')) {
                        return <h1 key={idx} className="text-xl font-black text-white pt-2 pb-1">{parseMarkdownInline(line.replace('# ', ''))}</h1>;
                      }
                      if (line.startsWith('## ')) {
                        return <h2 key={idx} className="text-base font-extrabold text-white pt-2">{parseMarkdownInline(line.replace('## ', ''))}</h2>;
                      }
                      if (line.startsWith('> ')) {
                        return <blockquote key={idx} className="border-l-4 border-amber-400 pl-3 py-1 my-2 bg-amber-400/5 italic text-slate-300 rounded-r">{parseMarkdownInline(line.replace('> ', ''))}</blockquote>;
                      }
                      if (line.startsWith('- [x] ')) {
                        return <div key={idx} className="flex items-center gap-2 text-emerald-400 font-bold"><Check className="w-4 h-4" /> <span className="line-through">{parseMarkdownInline(line.replace('- [x] ', ''))}</span></div>;
                      }
                      if (line.startsWith('- [ ] ')) {
                        return <div key={idx} className="flex items-center gap-2 text-slate-300 font-semibold"><span className="w-3.5 h-3.5 rounded border border-slate-600 block" /> <span>{parseMarkdownInline(line.replace('- [ ] ', ''))}</span></div>;
                      }
                      if (line.startsWith('- ')) {
                        return <div key={idx} className="flex items-center gap-2 text-slate-200 text-sm leading-relaxed pl-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 block flex-shrink-0" /> <span>{parseMarkdownInline(line.replace('- ', ''))}</span></div>;
                      }
                      if (line.trim().length === 0) {
                        return <div key={idx} className="h-1" />;
                      }
                      return <p key={idx} className="leading-relaxed">{parseMarkdownInline(line)}</p>;
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Attached Images Container (Only in Edit Mode & Collapsible) */}
            {editorTab === 'edit' && activeNote.images && activeNote.images.length > 0 && (
              <div className="pt-2.5 border-t border-[#222222] space-y-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAttachedImagesCollapsed(prev => !prev);
                  }}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer select-none"
                >
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Imagens Anexadas ({activeNote.images.length})</span>
                  </span>
                  {isAttachedImagesCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {!isAttachedImagesCollapsed && (
                  <div className="flex flex-wrap items-center gap-3 max-h-36 overflow-y-auto pt-1 animate-fadeIn">
                    {activeNote.images.map((imgSrc, imgIdx) => (
                      <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-[#222222] w-24 h-24 bg-black">
                        <img src={imgSrc} alt={`Anexo ${imgIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemoveImage(imgIdx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                          title="Remover Imagem"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 border border-dashed border-slate-800 rounded-2xl">
            <FileText className="w-12 h-12 text-slate-600" />
            <h3 className="text-base font-extrabold text-white">Nenhuma anotação selecionada</h3>
            <p className="text-xs text-slate-400 max-w-sm">Selecione uma nota na lista ao lado ou clique no botão "+ Nova Nota" para começar a escrever.</p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl glass-card">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-brand-yellow" />
                <span>{editingFolder ? 'Editar Pasta' : 'Nova Pasta'}</span>
              </h3>
              <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Nome da Pasta *</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Reuniões DM9..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Cor da Pasta</label>
              <input
                type="color"
                value={newFolderColor}
                onChange={(e) => setNewFolderColor(e.target.value)}
                className="w-full h-10 p-1 rounded-xl bg-dark-900 border border-slate-700 cursor-pointer"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFolder}
                className="px-5 py-2 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-dark-900 text-xs font-extrabold shadow-md"
              >
                Salvar Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT OFFICE TAG MODAL */}
      {showOfficeTagModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#222222] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-brand-yellow" />
                <h3 className="text-sm font-extrabold text-white">
                  {editingOfficeTag ? 'Editar Tag de Escritório' : 'Nova Tag de Escritório'}
                </h3>
              </div>
              <button onClick={() => setShowOfficeTagModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Nome da Tag / Escritório</label>
                <input
                  type="text"
                  value={officeTagName}
                  onChange={(e) => setOfficeTagName(e.target.value)}
                  placeholder="Ex: DM9, Celebra, M10, Filial SP..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-white font-bold focus:outline-none focus:border-brand-yellow"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Cor Temática</label>
                <div className="flex items-center gap-2">
                  {['#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#F97316'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setOfficeTagColor(c)}
                      className={`w-6 h-6 rounded-full border transition-transform ${
                        officeTagColor === c ? 'scale-125 border-white ring-2 ring-white/50' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
              <button
                onClick={() => setShowOfficeTagModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#1C1C1C] border border-[#222222] text-slate-300 text-xs font-bold hover:bg-[#222222]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOfficeTag}
                className="px-4 py-1.5 rounded-xl bg-brand-yellow text-dark-900 text-xs font-extrabold hover:bg-amber-400 transition-colors shadow-sm"
              >
                {editingOfficeTag ? 'Salvar Alterações' : 'Criar Tag'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
