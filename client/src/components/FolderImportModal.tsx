import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  Upload,
  FolderUp,
  FileCode,
  CheckCircle2,
  HelpCircle,
  X,
  FileText,
  FolderTree,
  Server,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { dataApi } from '@/services/dataApi';
import { ApiClientError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { PrepStack } from '@/types/api';

type ParsedFile = {
  file: File;
  path: string;
  name: string;
  folderPath: string;
  title: string;
  content: string;
  questionsCount: number;
  size: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  targetStack?: string;
  stacks: PrepStack[];
  onImportComplete: () => Promise<void> | void;
};

const ALLOWED_EXT_REGEX = /\.(md|markdown|txt|js|ts|jsx|tsx|py|java|cpp|c|cs|go|rs|sql|html|css|json|yaml|yml|sh)$/i;
const IGNORED_NAMES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.ds_store', 'thumbs.db']);

function parseQaCount(content: string) {
  const cleanLines = content
    .split('\n')
    .map((line) => line.replace(/^[\s/*#\->]+(?=(?:Q|Question|A|Answer)\s*:)/i, ''))
    .join('\n');

  const chunks = cleanLines.split(/\n(?=(?:Q|Question)\s*:\s*)/i);
  let count = 0;
  for (const chunk of chunks) {
    const m = chunk.match(/^(?:Q|Question)\s*:\s*([\s\S]+?)(?:\n(?:A|Answer)\s*:\s*([\s\S]*))?$/i);
    if (m?.[1] && m[1].trim().length > 3) count++;
  }
  return count;
}

function extractTitle(filename: string, content: string) {
  const heading = content.match(/^(?:#|\/{2,}|\/\*+|\*+|#+)\s*#*\s*([^\r\n*]+)/m);
  if (heading?.[1]) {
    const candidate = heading[1].trim();
    if (candidate.length > 2 && !candidate.toLowerCase().startsWith('q:') && !candidate.toLowerCase().startsWith('question:')) {
      return candidate.slice(0, 150);
    }
  }
  const base = filename.replace(ALLOWED_EXT_REGEX, '');
  return base.replace(/[-_]+/g, ' ').trim() || filename;
}

function extractFolderPath(relPath: string, stackId: string) {
  const norm = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = norm.split('/');
  if (parts.length <= 1) return '';
  // If top folder is the stack id (e.g. react/hooks/useMemo.md or react/notes.js), exclude it
  if (parts[0]?.toLowerCase() === stackId.toLowerCase() || parts[0]?.toLowerCase() === stackId.replaceAll('_', '-')) {
    return parts.slice(1, -1).join('/');
  }
  return parts.slice(0, -1).join('/');
}

export function FolderImportModal({ open, onClose, targetStack, stacks, onImportComplete }: Props) {
  const [selectedStack, setSelectedStack] = useState<string>(targetStack || stacks[0]?.id || 'react');
  const [activeTab, setActiveTab] = useState<'upload' | 'server'>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState<{
    notesAdded: number;
    notesUpdated: number;
    questionsAdded: number;
    folders: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const push = useUi((s) => s.push);

  if (!open) return null;

  const currentStackMeta = stacks.find((s) => s.id === selectedStack);

  async function processFiles(filesList: FileList | File[]) {
    const rawFiles = Array.from(filesList).filter((f) => {
      if (IGNORED_NAMES.has(f.name.toLowerCase())) return false;
      if (f.name.startsWith('.')) return false;
      return ALLOWED_EXT_REGEX.test(f.name);
    });

    if (rawFiles.length === 0) {
      push('No supported note/code files (.js, .ts, .md, .txt, .py, etc.) found in selection', 'err');
      return;
    }

    setLoading(true);
    const parsed: ParsedFile[] = [];

    for (const file of rawFiles) {
      try {
        const text = await file.text();
        const path = file.webkitRelativePath || file.name;
        const folder = extractFolderPath(path, selectedStack);
        const title = extractTitle(file.name, text);
        const qCount = parseQaCount(text);

        parsed.push({
          file,
          path,
          name: file.name,
          folderPath: folder,
          title,
          content: text,
          questionsCount: qCount,
          size: file.size,
        });
      } catch (err) {
        console.error('Failed to read file:', file.name, err);
      }
    }

    setParsedFiles(parsed);
    setImportResult(null);
    setLoading(false);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files);
    }
  }

  async function executeUploadImport() {
    if (parsedFiles.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        stack: selectedStack,
        files: parsedFiles.map((pf) => ({
          path: pf.path,
          name: pf.name,
          content: pf.content,
        })),
      };

      const res = await dataApi.importStackFiles(payload);
      const data = res.data;
      setImportResult({
        notesAdded: data.notesAdded,
        notesUpdated: data.notesUpdated,
        questionsAdded: data.questionsAdded,
        folders: data.folders,
      });

      push(
        `Imported ${data.notesAdded} notes (${data.notesUpdated} updated) and ${data.questionsAdded} questions into ${currentStackMeta?.name || selectedStack}!`,
      );
      await onImportComplete();
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Upload failed', 'err');
    } finally {
      setLoading(false);
    }
  }

  async function executeServerImport() {
    setLoading(true);
    try {
      const res = await dataApi.importFolderNotes(selectedStack === 'all' ? undefined : selectedStack);
      const d = res.data;
      if (!d || d.scanned === 0) {
        push(`No files found in prep-notes/${selectedStack === 'all' ? '' : selectedStack}`, 'err');
      } else {
        setImportResult({
          notesAdded: d.notesAdded,
          notesUpdated: d.notesUpdated,
          questionsAdded: d.questionsAdded,
          folders: [],
        });
        push(
          `Imported ${d.notesAdded} notes (${d.notesUpdated} updated), ${d.questionsAdded} questions from ${d.scanned} files`,
        );
        await onImportComplete();
      }
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : 'Server import failed', 'err');
    } finally {
      setLoading(false);
    }
  }

  const totalQuestions = parsedFiles.reduce((sum, f) => sum + f.questionsCount, 0);
  const detectedFolders = Array.from(new Set(parsedFiles.map((f) => f.folderPath).filter(Boolean)));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-paper/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <FolderUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Import Notes & Questions</h2>
              <p className="text-xs text-ink-soft">
                Upload Markdown files or folders directly into your interview stacks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-2 hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Target Stack Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
              Target Stack
            </label>
            <select
              value={selectedStack}
              onChange={(e) => {
                setSelectedStack(e.target.value);
                setParsedFiles([]);
                setImportResult(null);
              }}
              className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[13px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              {stacks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.notes} notes, {s.questions} questions)
                </option>
              ))}
              {activeTab === 'server' && <option value="all">All Stacks (from prep-notes/)</option>}
            </select>
          </div>

          {/* Tab Selector: Upload from Browser vs Server Disk */}
          <div className="flex rounded-lg border border-line p-1 bg-paper/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setImportResult(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-2 ${
                activeTab === 'upload' ? 'bg-card text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Files / Folder
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('server');
                setImportResult(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-2 ${
                activeTab === 'server' ? 'bg-card text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              Scan Server Folder (prep-notes/)
            </button>
          </div>

          {activeTab === 'upload' ? (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  dragOver
                    ? 'border-accent bg-accent/5 scale-[0.99]'
                    : 'border-line hover:border-accent/40 bg-paper/30'
                }`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent mb-3">
                  <FolderTree className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-ink">
                  Drag & drop your notes folder or code / markdown files here
                </p>
                <p className="mt-1 text-xs text-ink-soft max-w-sm">
                  Supports <span className="font-mono text-ink">.js</span>,{' '}
                  <span className="font-mono text-ink">.ts</span>,{' '}
                  <span className="font-mono text-ink">.md</span>,{' '}
                  <span className="font-mono text-ink">.txt</span>,{' '}
                  <span className="font-mono text-ink">.py</span>, and all notes/code files with nested folders.
                </p>

                {/* Hidden Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept=".js,.ts,.jsx,.tsx,.py,.md,.markdown,.txt,.json,.sql,.html,.css,.yaml,.yml,.sh"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleFileChange}
                  // @ts-expect-error webkitdirectory is standard for folder upload
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                />

                <div className="mt-4 flex flex-wrap gap-2.5 justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => folderInputRef.current?.click()}
                    className="h-8.5 text-xs shadow-xs"
                  >
                    <FolderUp className="h-3.5 w-3.5" />
                    Select Folder
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8.5 text-xs shadow-xs"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    Select Files
                  </Button>
                </div>
              </div>

              {/* Automatic Q&A Extraction Explanation */}
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-3.5 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div className="text-xs text-ink space-y-1">
                  <p className="font-medium text-accent-dark">Automatic Question & Answer Extraction</p>
                  <p className="text-ink-soft leading-relaxed">
                    Any note with <code className="px-1.5 py-0.5 rounded bg-paper text-ink font-mono text-[11px]">Q: question...</code> and <code className="px-1.5 py-0.5 rounded bg-paper text-ink font-mono text-[11px]">A: answer...</code> blocks will automatically be parsed into this stack's Questions tab!
                  </p>
                </div>
              </div>

              {/* Preview of Parsed Files */}
              {parsedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink">
                        Ready to import ({parsedFiles.length} files)
                      </span>
                      {detectedFolders.length > 0 && (
                        <Badge tone="accent">
                          {detectedFolders.length} folder{detectedFolders.length === 1 ? '' : 's'}
                        </Badge>
                      )}
                      {totalQuestions > 0 && (
                        <Badge tone="ok">
                          {totalQuestions} Q&A question{totalQuestions === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setParsedFiles([])}
                      className="text-xs text-ink-soft hover:text-danger"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-line bg-paper/40 divide-y divide-line/60">
                    {parsedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <FileText className="h-4 w-4 text-accent shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-ink truncate">{file.title}</p>
                            <p className="text-[11px] text-ink-soft truncate font-mono">
                              {file.folderPath ? `📁 ${file.folderPath}/` : ''}
                              {file.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {file.questionsCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded bg-ok/10 px-1.5 py-0.5 text-[10px] font-medium text-ok">
                              <HelpCircle className="h-3 w-3" />
                              {file.questionsCount} Qs
                            </span>
                          )}
                          <span className="text-[11px] text-ink-soft">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Server Disk Import View */
            <div className="space-y-4 rounded-xl border border-line bg-paper/40 p-5">
              <div className="flex items-start gap-3">
                <Server className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">Import from workspace prep-notes/</p>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    Scans the local <span className="font-mono text-ink">prep-notes/{selectedStack === 'all' ? '' : selectedStack}</span> folder on disk.
                    Drop your markdown files or clone your GitHub notes repo into that directory.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-paper p-3 text-xs font-mono text-ink-soft">
                Target directory: <span className="text-ink font-semibold">prep-notes/{selectedStack === 'all' ? '*' : selectedStack}/</span>
              </div>
            </div>
          )}

          {/* Success Result Summary */}
          {importResult && (
            <div className="rounded-xl border border-ok/30 bg-ok/10 p-4 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-ok shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-ok">Import Successful!</p>
                <p className="text-ink">
                  Added <strong>{importResult.notesAdded}</strong> notes (<strong>{importResult.notesUpdated}</strong> updated) and{' '}
                  <strong>{importResult.questionsAdded}</strong> questions.
                  {importResult.folders.length > 0 && (
                    <> Organized across <strong>{importResult.folders.length}</strong> folders ({importResult.folders.join(', ')}).</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-paper/30">
          <Button type="button" variant="ghost" onClick={onClose}>
            {importResult ? 'Done' : 'Cancel'}
          </Button>

          {activeTab === 'upload' ? (
            <Button
              type="button"
              disabled={parsedFiles.length === 0 || loading}
              onClick={executeUploadImport}
              className="gap-2"
            >
              {loading ? (
                'Importing files…'
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {parsedFiles.length > 0 ? `${parsedFiles.length} Notes` : ''} into {currentStackMeta?.name || 'Stack'}
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={loading}
              onClick={executeServerImport}
              className="gap-2"
            >
              {loading ? 'Scanning server…' : 'Scan & Import prep-notes/'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
