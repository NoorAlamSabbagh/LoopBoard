import { useState, useMemo, type ReactNode } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  FileText,
  FileCode,
  Search,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit3,
  Download,
  FolderInput,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Layers,
  BookOpen,
  Plus,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { dataApi } from '@/services/dataApi';
import { ApiClientError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { Note, PrepStack } from '@/types/api';
import { formatDate } from '@/utils/format';

type Props = {
  stack: string;
  meta: PrepStack;
  notes: Note[];
  topicId?: string;
  onNotesChange: () => Promise<void>;
  onOpenImport: () => void;
};

type ParsedQa = {
  prompt: string;
  answer: string;
};

function parseQaBlocks(content: string): ParsedQa[] {
  const cleanLines = content
    .split('\n')
    .map((line) => line.replace(/^[\s/*#\->]+(?=(?:Q|Question|A|Answer)\s*:)/i, ''))
    .join('\n');

  const chunks = cleanLines.split(/\n(?=(?:Q|Question)\s*:\s*)/i);
  const questions: ParsedQa[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^(?:Q|Question)\s*:\s*([\s\S]+?)(?:\n(?:A|Answer)\s*:\s*([\s\S]*))?$/i);
    if (!m?.[1]) continue;
    const prompt = m[1].split('\n')[0]!.trim().replace(/^[\s/*#\->]+/, '');
    const answer = (m[2] ?? '')
      .split('\n')
      .map((l) => l.replace(/^[\s/*#\->]+/, ''))
      .join('\n')
      .trim();
    if (prompt.length > 3) questions.push({ prompt, answer });
  }
  return questions;
}

// Simple & robust Markdown renderer with line numbers
function MarkdownView({ content }: { content: string }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function copyCode(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  // Parse lines into blocks; each block carries the starting source line number
  const blocks = useMemo(() => {
    const lines = content.split('\n');
    const result: { lineNo: number; node: ReactNode }[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let codeStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Code block start/end
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const codeText = codeBuffer.join('\n');
          const codeId = `code-${codeStartLine}`;
          const codeLines = [...codeBuffer];
          const startLine = codeStartLine;
          result.push({
            lineNo: startLine + 1,
            node: (
              <div key={codeId} className="relative my-3 rounded-xl border border-line bg-sidebar text-white overflow-hidden text-xs">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-white/5 font-mono text-[11px] text-white/60">
                  <span>{codeLanguage || 'code'}</span>
                  <button
                    type="button"
                    onClick={() => copyCode(codeText, codeId)}
                    className="flex items-center gap-1 hover:text-white transition"
                  >
                    {copiedCode === codeId ? (
                      <>
                        <Check className="h-3 w-3 text-ok" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="flex overflow-x-auto font-mono text-[12.5px] leading-relaxed">
                  {/* Code block line number gutter */}
                  <div
                    className="select-none shrink-0 border-r border-white/10 bg-white/5 px-3 py-4 text-right text-white/30"
                    aria-hidden="true"
                  >
                    {codeLines.map((_, li) => (
                      <div key={li} className="leading-relaxed">
                        {startLine + li + 2}
                      </div>
                    ))}
                  </div>
                  {/* Code content */}
                  <pre className="px-4 py-4 overflow-x-auto flex-1 m-0">
                    <code>
                      {codeLines.map((codeLine, li) => (
                        <div key={li} className="leading-relaxed whitespace-pre">
                          {codeLine}
                        </div>
                      ))}
                    </code>
                  </pre>
                </div>
              </div>
            ),
          });
          inCodeBlock = false;
          codeBuffer = [];
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeStartLine = i;
          codeLanguage = line.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Empty line
      if (!line.trim()) {
        result.push({ lineNo: i + 1, node: <div key={`empty-${i}`} className="h-2" /> });
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        result.push({
          lineNo: i + 1,
          node: (
            <h1 key={`h1-${i}`} className="text-xl font-bold text-ink mt-4 mb-2 pb-1 border-b border-line">
              {renderInline(line.slice(2))}
            </h1>
          ),
        });
        continue;
      }
      if (line.startsWith('## ')) {
        result.push({
          lineNo: i + 1,
          node: (
            <h2 key={`h2-${i}`} className="text-lg font-semibold text-ink mt-4 mb-1.5">
              {renderInline(line.slice(3))}
            </h2>
          ),
        });
        continue;
      }
      if (line.startsWith('### ')) {
        result.push({
          lineNo: i + 1,
          node: (
            <h3 key={`h3-${i}`} className="text-sm font-semibold text-ink mt-3 mb-1">
              {renderInline(line.slice(4))}
            </h3>
          ),
        });
        continue;
      }

      // Blockquote / Callout
      if (line.startsWith('> ')) {
        result.push({
          lineNo: i + 1,
          node: (
            <blockquote
              key={`bq-${i}`}
              className="my-2 border-l-3 border-accent bg-accent/5 px-3.5 py-2 rounded-r-lg text-xs leading-relaxed text-ink"
            >
              {renderInline(line.slice(2))}
            </blockquote>
          ),
        });
        continue;
      }

      // Bullet lists
      if (line.match(/^(\*|-|\+)\s+/)) {
        result.push({
          lineNo: i + 1,
          node: (
            <div key={`li-${i}`} className="flex items-start gap-2 text-xs leading-relaxed text-ink ml-2 my-0.5">
              <span className="text-accent mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              <span>{renderInline(line.replace(/^(\*|-|\+)\s+/, ''))}</span>
            </div>
          ),
        });
        continue;
      }

      // Numbered lists
      if (line.match(/^\d+\.\s+/)) {
        const num = line.match(/^(\d+)\.\s+/)?.[1];
        result.push({
          lineNo: i + 1,
          node: (
            <div key={`nli-${i}`} className="flex items-start gap-2 text-xs leading-relaxed text-ink ml-2 my-0.5">
              <span className="font-mono text-accent font-semibold shrink-0">{num}.</span>
              <span>{renderInline(line.replace(/^\d+\.\s+/, ''))}</span>
            </div>
          ),
        });
        continue;
      }

      // Paragraph
      result.push({
        lineNo: i + 1,
        node: (
          <p key={`p-${i}`} className="text-xs leading-relaxed text-ink my-1">
            {renderInline(line)}
          </p>
        ),
      });
    }

    return result;
  }, [content, copiedCode]);

  const totalLines = content.split('\n').length;
  const gutterWidth = totalLines >= 1000 ? 'w-12' : totalLines >= 100 ? 'w-9' : 'w-7';

  return (
    <div className="flex min-h-0">
      {/* Line number gutter */}
      <div
        className={`select-none shrink-0 ${gutterWidth} border-r border-line/50 mr-4 pr-2 space-y-1 text-right font-mono text-[11px] leading-relaxed text-ink-soft/40`}
        aria-hidden="true"
      >
        {blocks.map((b, idx) => (
          <div key={idx} className="leading-[1.6rem]">
            {b.lineNo}
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {blocks.map((b, idx) => (
          <div key={idx}>{b.node}</div>
        ))}
      </div>
    </div>
  );
}

// Simple inline markdown parsing for bold, code, italics
function renderInline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[11px] text-accent-dark font-medium">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function PrepNotesExplorer({ stack, meta, notes, topicId, onNotesChange, onOpenImport }: Props) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all, "" = root/unfiled, "folder" = specific folder
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Editor states
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Folder creation modal/popover
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Move note modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetMoveFolder, setTargetMoveFolder] = useState('');

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Practice state inside note
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const push = useUi((s) => s.push);

  // Group notes into folder map
  const { folderTree, allFoldersList, unfiledNotesCount } = useMemo(() => {
    const map: Record<string, Note[]> = {};
    const foldersSet = new Set<string>();
    let unfiled = 0;

    for (const note of notes) {
      const folder = note.folderPath ? note.folderPath.trim() : '';
      if (!folder) {
        unfiled++;
        if (!map['']) map[''] = [];
        map[''].push(note);
      } else {
        foldersSet.add(folder);
        if (!map[folder]) map[folder] = [];
        map[folder].push(note);
      }
    }

    const sortedFolders = Array.from(foldersSet).sort((a, b) => a.localeCompare(b));
    return {
      folderTree: map,
      allFoldersList: sortedFolders,
      unfiledNotesCount: unfiled,
    };
  }, [notes]);

  // Filter notes based on selected folder and search term
  const displayedNotes = useMemo(() => {
    return notes.filter((n) => {
      // Folder filter
      if (selectedFolder !== null) {
        const noteFolder = n.folderPath ? n.folderPath.trim() : '';
        if (selectedFolder === '' && noteFolder !== '') return false;
        if (selectedFolder !== '' && noteFolder !== selectedFolder) return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = n.title.toLowerCase().includes(q);
        const contentMatch = n.content.toLowerCase().includes(q);
        const folderMatch = (n.folderPath || '').toLowerCase().includes(q);
        return titleMatch || contentMatch || folderMatch;
      }
      return true;
    });
  }, [notes, selectedFolder, searchTerm]);

  // Active note
  const activeNote = useMemo(() => {
    if (selectedNoteId) {
      return notes.find((n) => n.id === selectedNoteId) || null;
    }
    return displayedNotes[0] || null;
  }, [notes, selectedNoteId, displayedNotes]);

  // Toggle folder expansion
  function toggleFolder(folder: string) {
    setExpandedFolders((prev) => ({
      ...prev,
      [folder]: prev[folder] === undefined ? false : !prev[folder],
    }));
  }

  function handleSelectNote(note: Note) {
    setSelectedNoteId(note.id);
    setMode('view');
    setRevealedAnswers({});
  }

  function startEditNote() {
    if (!activeNote) return;
    setEditTitle(activeNote.title);
    setEditContent(activeNote.content);
    setEditFolder(activeNote.folderPath || '');
    setMode('edit');
  }

  function startCreateNote(folderDefault?: string) {
    setEditTitle('');
    setEditContent(
      `# Note Title\n\nWrite your interview notes here.\n\nQ: Example Interview Question?\nA: Example answer with technical details...`,
    );
    setEditFolder(folderDefault !== undefined ? folderDefault : (selectedFolder || ''));
    setMode('create');
    setShowLivePreview(false);
  }

  async function handleSaveNote() {
    if (!editTitle.trim()) {
      push('Please enter a note title', 'err');
      return;
    }
    if (!editContent.trim()) {
      push('Please enter note content', 'err');
      return;
    }

    setIsSaving(true);
    try {
      if (mode === 'edit' && activeNote) {
        await dataApi.updateNote(activeNote.id, {
          title: editTitle.trim(),
          content: editContent,
          folderPath: editFolder.trim(),
        });
        push('Note updated');
        await onNotesChange();
        setMode('view');
      } else {
        // Create
        let tId = topicId;
        if (!tId) {
          const tRes = await dataApi.createTopic({
            slug: stack === 'system_design' ? 'system-design' : stack.replaceAll('_', '-'),
            name: meta.name,
            notes: meta.blurb,
          });
          tId = tRes.data.id;
        }

        const res = await dataApi.createNote({
          title: editTitle.trim(),
          content: editContent,
          folderPath: editFolder.trim(),
          tags: [stack, 'stack'],
          entityType: 'preparation_topic',
          entityId: tId,
        });

        // Also check if any Q&A blocks exist and auto create questions if not existing
        const questions = parseQaBlocks(editContent);
        if (questions.length > 0) {
          for (const q of questions) {
            try {
              await dataApi.createQuestion({
                prompt: q.prompt,
                technology: stack,
                category: stack,
                difficulty: 'medium',
                answer: q.answer,
                notes: `Created with note ${editTitle.trim()}`,
              });
            } catch {
              // Ignore duplicate question errors
            }
          }
          push(`Saved note and created ${questions.length} questions!`);
        } else {
          push('Note created');
        }

        await onNotesChange();
        setSelectedNoteId(res.data.id);
        setMode('view');
      }
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Could not save note', 'err');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteNote() {
    if (!activeNote) return;
    if (!window.confirm(`Are you sure you want to delete "${activeNote.title}"?`)) return;

    try {
      await dataApi.deleteNote(activeNote.id);
      push('Note deleted');
      setSelectedNoteId(null);
      await onNotesChange();
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Could not delete note', 'err');
    }
  }

  async function handleMoveNote() {
    if (!activeNote) return;
    try {
      await dataApi.updateNote(activeNote.id, {
        folderPath: targetMoveFolder.trim(),
      });
      push(`Moved note to ${targetMoveFolder ? `📁 ${targetMoveFolder}` : 'Unfiled'}`);
      setShowMoveModal(false);
      await onNotesChange();
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Could not move note', 'err');
    }
  }

  function handleDownloadNote() {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeNote.title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const activeQaList = useMemo(() => {
    if (!activeNote) return [];
    return parseQaBlocks(activeNote.content);
  }, [activeNote]);

  return (
    <div className={isFullscreen ? '' : 'grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start'}>
      {/* LEFT SIDEBAR: Folder & File Explorer — hidden in fullscreen */}
      {!isFullscreen && <Card className="p-0 overflow-hidden border border-line bg-card shadow-xs flex flex-col h-[740px]">
        {/* Explorer Header */}
        <div className="border-b border-line p-3.5 bg-paper/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink">Explorer</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setNewFolderName('');
                setShowNewFolderModal(true);
              }}
              title="New Folder"
              className="h-7 w-7 p-0"
            >
              <FolderPlus className="h-3.5 w-3.5 text-ink-soft hover:text-ink" />
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => startCreateNote()}
              title="New Note File"
              className="h-7 w-7 p-0"
            >
              <FilePlus className="h-3.5 w-3.5 text-accent hover:text-accent-dark" />
            </Button>
          </div>
        </div>

        {/* Search Notes & Folders */}
        <div className="p-2.5 border-b border-line/60 bg-paper/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-soft" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files & folders..."
              className="h-8 pl-8 pr-2.5 text-xs bg-card"
            />
          </div>
        </div>

        {/* Tree List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs select-none">
          {/* Filter: All Notes */}
          <button
            type="button"
            onClick={() => setSelectedFolder(null)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left ${
              selectedFolder === null ? 'bg-accent/15 text-accent font-semibold' : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>All Notes</span>
            </div>
            <span className="text-[11px] font-mono opacity-70">{notes.length}</span>
          </button>

          {/* Filter: Root / Unfiled Notes */}
          {unfiledNotesCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFolder('')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left ${
                selectedFolder === '' ? 'bg-accent/15 text-accent font-semibold' : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCode className="h-3.5 w-3.5" />
                <span>Unfiled Notes</span>
              </div>
              <span className="text-[11px] font-mono opacity-70">{unfiledNotesCount}</span>
            </button>
          )}

          {/* Folder Tree Items */}
          {allFoldersList.length > 0 && (
            <div className="pt-2">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft/70">
                Folders ({allFoldersList.length})
              </p>

              {allFoldersList.map((folderName) => {
                const folderNotes = folderTree[folderName] || [];
                const isExpanded = expandedFolders[folderName] !== false; // default expanded
                const isFolderActive = selectedFolder === folderName;

                return (
                  <div key={folderName} className="space-y-0.5">
                    {/* Folder Row */}
                    <div
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-lg transition cursor-pointer ${
                        isFolderActive
                          ? 'bg-accent/10 text-accent font-medium'
                          : 'text-ink hover:bg-paper-2'
                      }`}
                      onClick={() => setSelectedFolder(isFolderActive ? null : folderName)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFolder(folderName);
                          }}
                          className="p-0.5 rounded hover:bg-paper text-ink-soft"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                        {isExpanded ? (
                          <FolderOpen className="h-3.5 w-3.5 text-accent shrink-0" />
                        ) : (
                          <Folder className="h-3.5 w-3.5 text-accent shrink-0" />
                        )}
                        <span className="truncate font-medium text-[12px]">{folderName}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono text-ink-soft opacity-70">
                          {folderNotes.length}
                        </span>
                        <button
                          type="button"
                          title="New file in this folder"
                          onClick={(e) => {
                            e.stopPropagation();
                            startCreateNote(folderName);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-paper text-ink-soft hover:text-accent transition"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Files inside this folder */}
                    {isExpanded && folderNotes.length > 0 && (
                      <div className="pl-6 space-y-0.5 border-l border-line/40 ml-3">
                        {folderNotes.map((note) => {
                          const isActive = activeNote?.id === note.id;
                          const qCount = parseQaBlocks(note.content).length;

                          return (
                            <button
                              key={note.id}
                              type="button"
                              onClick={() => handleSelectNote(note)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition ${
                                isActive
                                  ? 'bg-accent text-white font-medium shadow-xs'
                                  : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-accent'}`} />
                                <span className="truncate text-[12px]">{note.title}</span>
                              </div>

                              {qCount > 0 && (
                                <span
                                  className={`text-[10px] px-1 py-0.2 rounded font-mono shrink-0 ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-ok/10 text-ok'
                                  }`}
                                  title={`${qCount} Q&A questions`}
                                >
                                  {qCount}Q
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Files matching current folder/search (if not grouping) */}
          <div className="pt-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft/70">
              {selectedFolder === null ? 'All Files' : selectedFolder === '' ? 'Unfiled Files' : `Files in ${selectedFolder}`} ({displayedNotes.length})
            </p>

            {displayedNotes.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-ink-soft italic">No notes found</p>
            ) : (
              displayedNotes.map((note) => {
                const isActive = activeNote?.id === note.id;
                const qCount = parseQaBlocks(note.content).length;

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectNote(note)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition my-0.5 ${
                      isActive
                        ? 'bg-accent text-white font-medium shadow-xs'
                        : 'text-ink hover:bg-paper-2'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-accent'}`} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px]">{note.title}</p>
                        {note.folderPath && selectedFolder === null && (
                          <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-ink-soft'}`}>
                            📁 {note.folderPath}
                          </p>
                        )}
                      </div>
                    </div>

                    {qCount > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-ok/10 text-ok'
                        }`}
                        title={`${qCount} Q&A questions`}
                      >
                        {qCount}Q
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Explorer Footer Quick Actions */}
        <div className="border-t border-line p-2.5 bg-paper/40 flex items-center justify-between text-xs">
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenImport}
            className="h-8 text-xs text-accent hover:text-accent-dark w-full justify-center gap-1.5"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Upload Folder / Files
          </Button>
        </div>
      </Card>}

      {/* RIGHT WORKSPACE: Note Viewer / Editor / Extracted Q&A */}
      <div
        className={isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-card overflow-y-auto'
          : 'min-h-[740px] flex flex-col'
        }
      >
        {mode === 'create' || mode === 'edit' ? (
          /* EDIT / CREATE MODE */
          <Card className="flex-1 flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3.5">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-accent" />
                <h2 className="text-base font-semibold text-ink">
                  {mode === 'create' ? 'Create New Note' : 'Edit Note'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className="text-xs h-8 gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showLivePreview ? 'Hide Preview' : 'Split Preview'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMode('view')}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveNote}
                  className="h-8 text-xs gap-1.5"
                >
                  {isSaving ? 'Saving…' : 'Save Note'}
                </Button>
              </div>
            </div>

            {/* Note Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Note Title">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. React Hooks Cheat Sheet"
                  className="h-9 text-xs font-medium"
                />
              </Field>

              <Field label="Folder Location">
                <div className="flex gap-2">
                  <Input
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
                    placeholder="e.g. hooks or state/redux (leave blank for root)"
                    className="h-9 text-xs font-mono flex-1"
                  />
                  {allFoldersList.length > 0 && (
                    <Select
                      value={editFolder}
                      onChange={(e) => setEditFolder(e.target.value)}
                      className="h-9 text-xs w-36"
                    >
                      <option value="">(Root)</option>
                      {allFoldersList.map((f) => (
                        <option key={f} value={f}>
                          📁 {f}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </Field>
            </div>

            {/* Content Editor & Live Preview */}
            <div className={`flex-1 grid gap-4 ${showLivePreview ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="flex flex-col space-y-1">
                <span className="text-[11px] font-medium text-ink-soft">
                  Markdown Content (Use <code className="font-mono text-ink">Q: ... A: ...</code> for Q&A questions)
                </span>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 min-h-[420px] font-mono text-xs leading-relaxed resize-y"
                  placeholder="# Note Title&#10;&#10;Write markdown notes here...&#10;&#10;Q: What is the virtual DOM?&#10;A: Virtual DOM is an in-memory representation..."
                />
              </div>

              {showLivePreview && (
                <div className="flex flex-col space-y-1">
                  <span className="text-[11px] font-medium text-ink-soft">Live Markdown Preview</span>
                  <div className="flex-1 min-h-[420px] max-h-[500px] overflow-y-auto rounded-lg border border-line bg-paper/30 p-4">
                    <MarkdownView content={editContent} />
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : activeNote ? (
          /* VIEW MODE */
          <Card className="flex-1 flex flex-col p-6 space-y-5">
            {/* Note Header Bar */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div className="space-y-1.5 min-w-0">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs text-ink-soft font-mono">
                  <span>{meta.name}</span>
                  <ChevronRight className="h-3 w-3" />
                  {activeNote.folderPath ? (
                    <>
                      <span className="text-accent font-medium">📁 {activeNote.folderPath}</span>
                      <ChevronRight className="h-3 w-3" />
                    </>
                  ) : null}
                  <span className="text-ink font-medium">{activeNote.title}</span>
                </div>

                <h1 className="text-xl font-bold tracking-tight text-ink">{activeNote.title}</h1>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
                  {activeNote.folderPath ? (
                    <Badge tone="accent">📁 {activeNote.folderPath}</Badge>
                  ) : (
                    <Badge tone="neutral">Unfiled</Badge>
                  )}
                  <span>·</span>
                  <span>{activeNote.content.split(/\s+/).filter(Boolean).length} words</span>
                  {activeNote.updatedAt && (
                    <>
                      <span>·</span>
                      <span>Updated {formatDate(activeNote.updatedAt)}</span>
                    </>
                  )}
                  {activeQaList.length > 0 && (
                    <>
                      <span>·</span>
                      <Badge tone="ok">{activeQaList.length} Q&A Questions</Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Note Action Toolbar */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setTargetMoveFolder(activeNote.folderPath || '');
                    setShowMoveModal(true);
                  }}
                  title="Move to Folder"
                  className="h-8.5 text-xs gap-1.5"
                >
                  <FolderInput className="h-3.5 w-3.5" />
                  Move
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDownloadNote}
                  title="Download Markdown"
                  className="h-8.5 text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={startEditNote}
                  className="h-8.5 text-xs gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="h-8.5 text-xs px-2.5"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeleteNote}
                  className="h-8.5 text-xs px-2.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Extracted Q&A Accordion Panel */}
            {activeQaList.length > 0 && (
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold text-accent-dark">
                      Extracted Interview Questions ({activeQaList.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-soft">Click to reveal answer for practice</span>
                </div>

                <div className="space-y-2">
                  {activeQaList.map((qa, index) => {
                    const isRevealed = revealedAnswers[index];
                    return (
                      <div key={index} className="rounded-lg border border-line bg-card p-3 text-xs space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-ink leading-relaxed">
                            <span className="text-accent font-mono mr-1.5">Q{index + 1}:</span>
                            {qa.prompt}
                          </p>
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() =>
                              setRevealedAnswers((prev) => ({
                                ...prev,
                                [index]: !prev[index],
                              }))
                            }
                            className="h-6 text-[11px] px-2 gap-1 text-ink-soft shrink-0"
                          >
                            {isRevealed ? (
                              <>
                                <EyeOff className="h-3 w-3" /> Hide
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" /> Reveal Answer
                              </>
                            )}
                          </Button>
                        </div>

                        {isRevealed && qa.answer && (
                          <div className="rounded-md bg-paper p-3 text-ink leading-relaxed border-l-2 border-accent animate-in fade-in">
                            <p className="font-mono text-[10px] text-accent font-semibold mb-1">ANSWER:</p>
                            <p className="whitespace-pre-wrap">{qa.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note Content (Rich Markdown View) */}
            <div className="flex-1 overflow-y-auto max-h-[600px] pr-2">
              <MarkdownView content={activeNote.content} />
            </div>
          </Card>
        ) : (
          /* EMPTY STATE WHEN NO NOTE IS SELECTED */
          <Card className="flex-1 grid place-items-center p-12 text-center">
            <div className="max-w-md space-y-4">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">No note selected</h3>
                <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                  Select a note from the explorer sidebar, create a new note inside a folder, or import your folder files.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                <Button type="button" onClick={() => startCreateNote()} className="h-8.5 text-xs gap-1.5">
                  <FilePlus className="h-3.5 w-3.5" />
                  Create Note
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onOpenImport}
                  className="h-8.5 text-xs gap-1.5"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  Upload Folder / Files
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* MODAL: New Folder */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-ink">
              <FolderPlus className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-semibold">Create New Folder</h3>
            </div>

            <Field label="Folder Name">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. hooks, algorithms, performance"
                className="h-9 text-xs font-mono"
                autoFocus
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowNewFolderModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!newFolderName.trim()) {
                    push('Enter a folder name', 'err');
                    return;
                  }
                  setSelectedFolder(newFolderName.trim());
                  setShowNewFolderModal(false);
                  startCreateNote(newFolderName.trim());
                }}
              >
                Create & Add Note
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Move Note to Folder */}
      {showMoveModal && activeNote && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-ink">
              <FolderInput className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-semibold">Move Note to Folder</h3>
            </div>

            <p className="text-xs text-ink-soft">
              Moving note <strong className="text-ink">"{activeNote.title}"</strong>
            </p>

            <Field label="Destination Folder">
              <div className="space-y-2">
                <Input
                  value={targetMoveFolder}
                  onChange={(e) => setTargetMoveFolder(e.target.value)}
                  placeholder="Folder name or leave blank for root"
                  className="h-9 text-xs font-mono"
                />

                {allFoldersList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setTargetMoveFolder('')}
                      className="px-2 py-0.5 rounded bg-paper-2 text-[11px] text-ink-soft hover:text-ink font-mono"
                    >
                      (Root)
                    </button>
                    {allFoldersList.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setTargetMoveFolder(f)}
                        className="px-2 py-0.5 rounded bg-paper-2 text-[11px] text-ink font-mono hover:bg-accent/10 hover:text-accent"
                      >
                        📁 {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowMoveModal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleMoveNote}>
                Move Note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
