import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  BookOpen,
  Code2,
  Plus,
  FolderUp,
  FolderTree,
  Search,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { dataApi } from '@/services/dataApi';
import { ApiClientError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { Note, PrepStack, Question } from '@/types/api';
import { labelize } from '@/utils/format';
import { PrepNotesExplorer } from '@/components/PrepNotesExplorer';
import { FolderImportModal } from '@/components/FolderImportModal';

function topicSlug(stack: string) {
  return stack === 'system_design' ? 'system-design' : stack.replaceAll('_', '-');
}

export function PrepStackHubPage() {
  const [stacks, setStacks] = useState<PrepStack[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTargetStack, setImportTargetStack] = useState<string | undefined>(undefined);
  const push = useUi((s) => s.push);
  const navigate = useNavigate();
  const newForm = useForm<Record<string, string>>();

  async function loadStacks() {
    const res = await dataApi.stacks();
    setStacks(res.data);
  }

  useEffect(() => {
    void loadStacks().catch(() => undefined);
  }, []);

  const totalQ = stacks.reduce((a, s) => a + s.questions, 0);
  const totalNotes = stacks.reduce((a, s) => a + s.notes, 0);

  return (
    <div>
      <PageHeader
        title="Notes & questions"
        subtitle="Interview notes, folder hierarchies, and Q&A grouped by stack — import markdown files or folders directly into any topic."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowNew((v) => !v)}>
              <Plus className="h-4 w-4" />
              New stack
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setImportTargetStack(undefined);
                setImportModalOpen(true);
              }}
            >
              <FolderUp className="h-4 w-4 text-accent" />
              Import notes & folders
            </Button>
            <Button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                try {
                  const res = await dataApi.seedStackNotes();
                  push(
                    `Loaded ${res.data?.questionsAdded ?? 0} questions and ${res.data?.notesAdded ?? 0} notes`,
                  );
                  await loadStacks();
                } catch (err) {
                  push(err instanceof ApiClientError ? err.message : 'Could not load stack notes', 'err');
                } finally {
                  setSeeding(false);
                }
              }}
            >
              {seeding ? 'Loading…' : totalQ ? 'Fill missing starter notes' : 'Load starter notes'}
            </Button>
          </div>
        }
      />

      {showNew ? (
        <Card className="mb-4 animate-in fade-in">
          <p className="mb-3 text-[13px] font-semibold">Add a stack</p>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={newForm.handleSubmit(async (v) => {
              setCreating(true);
              try {
                const res = await dataApi.createStack({ name: v.name, blurb: v.blurb || undefined });
                push(`${res.data.name} added`);
                newForm.reset();
                setShowNew(false);
                await loadStacks();
                navigate(`/prep/notes/${res.data.id}`);
              } catch (err) {
                push(err instanceof ApiClientError ? err.message : 'Could not add stack', 'err');
              } finally {
                setCreating(false);
              }
            })}
          >
            <Field label="Name">
              <Input placeholder="Redis, BullMQ, Kafka, Next.js…" {...newForm.register('name', { required: true })} />
            </Field>
            <Field label="Short description">
              <Input placeholder="Queues, caching, streams, fullstack…" {...newForm.register('blurb')} />
            </Field>
            <Button type="submit" disabled={creating}>
              {creating ? 'Adding…' : 'Add stack'}
            </Button>
          </form>
        </Card>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper/50 p-4 text-[13px] text-ink-soft">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-accent" />
          <span>
            Organize notes with <strong className="text-ink">folders and files</strong>, and import whole markdown folder trees with automatic Q&A extraction.
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-ink">
          <span>{stacks.length} stacks</span>
          <span>·</span>
          <span>{totalNotes} notes</span>
          <span>·</span>
          <span>{totalQ} questions</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stacks.map((s) => (
          <div key={s.id} className="relative group">
            <Link to={`/prep/notes/${s.id}`} className="block h-full">
              <Card className="h-full hover:border-accent/50 hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                      {s.id === 'dsa' || s.id === 'system_design' ? (
                        <BookOpen className="h-5 w-5" />
                      ) : (
                        <Code2 className="h-5 w-5" />
                      )}
                    </div>
                    {s.custom ? <Badge tone="accent">Custom</Badge> : null}
                  </div>
                  <p className="text-[15px] font-semibold text-ink group-hover:text-accent transition">{s.name}</p>
                  <p className="mt-1 text-[13px] text-ink-soft line-clamp-2">{s.blurb}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-ink-soft">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span>{s.notes} notes</span>
                    <span>·</span>
                    <span>{s.questions} Qs</span>
                    {s.folders ? (
                      <>
                        <span>·</span>
                        <span className="text-accent font-medium">{s.folders} folders</span>
                      </>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    title={`Import into ${s.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImportTargetStack(s.id);
                      setImportModalOpen(true);
                    }}
                    className="p-1 rounded hover:bg-paper-2 text-ink-soft hover:text-accent transition"
                  >
                    <FolderUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            </Link>
          </div>
        ))}
      </div>

      <FolderImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        targetStack={importTargetStack}
        stacks={stacks}
        onImportComplete={loadStacks}
      />
    </div>
  );
}

export function PrepStackDetailPage() {
  const { stack } = useParams();
  const navigate = useNavigate();
  const push = useUi((s) => s.push);
  const [meta, setMeta] = useState<PrepStack | null>(null);
  const [stacks, setStacks] = useState<PrepStack[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tab, setTab] = useState<'notes' | 'questions'>('notes');
  const [topics, setTopics] = useState<{ id: string; slug: string }[]>([]);
  const [ready, setReady] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Question tab filters and search
  const [qSearch, setQSearch] = useState('');
  const [qDifficultyFilter, setQDifficultyFilter] = useState('all');
  const [qStatusFilter, setQStatusFilter] = useState('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [practiceMode, setPracticeMode] = useState(false);

  const qForm = useForm<Record<string, string>>({ defaultValues: { difficulty: 'medium' } });

  const topicId = useMemo(() => {
    if (!stack) return undefined;
    const slug = topicSlug(stack);
    return topics.find((t) => t.slug === slug)?.id;
  }, [topics, stack]);

  async function reload() {
    if (!stack) return;
    const [sRes, qRes, nRes, tRes] = await Promise.all([
      dataApi.stacks(),
      dataApi.questions({ limit: 500, technology: stack }),
      dataApi.notes({ limit: 500, tag: stack }),
      dataApi.topics({ limit: 500 }),
    ]);
    setStacks(sRes.data);
    setMeta(sRes.data.find((s) => s.id === stack) ?? null);
    setQuestions(qRes.data);
    setNotes(nRes.data.filter((n) => n.tags?.includes(stack)));
    setTopics(tRes.data);
    setReady(true);
  }

  useEffect(() => {
    setReady(false);
    void reload().catch(() => setReady(true));
  }, [stack]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (qDifficultyFilter !== 'all' && q.difficulty !== qDifficultyFilter) return false;
      if (qStatusFilter !== 'all' && q.status !== qStatusFilter) return false;
      if (qSearch.trim()) {
        const query = qSearch.toLowerCase();
        const promptMatch = q.prompt.toLowerCase().includes(query);
        const answerMatch = (q.answer || '').toLowerCase().includes(query);
        const notesMatch = (q.notes || '').toLowerCase().includes(query);
        return promptMatch || answerMatch || notesMatch;
      }
      return true;
    });
  }, [questions, qDifficultyFilter, qStatusFilter, qSearch]);

  if (!ready) {
    return <p className="text-[13px] text-ink-soft">Loading stack…</p>;
  }

  if (!meta || !stack) {
    return <EmptyState title="Unknown stack" hint="Add it from Notes & questions with New stack." />;
  }

  return (
    <div>
      {/* Top Back Navigation */}
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition font-medium"
        onClick={() => navigate('/prep/notes')}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All stacks
      </button>

      {/* Header */}
      <PageHeader
        title={meta.name}
        subtitle={meta.blurb}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="gap-1.5"
            >
              <FolderUp className="h-4 w-4 text-accent" />
              Import into this stack
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
        <div className="flex gap-2">
          <Button
            variant={tab === 'notes' ? 'primary' : 'secondary'}
            type="button"
            onClick={() => setTab('notes')}
            className="gap-2"
          >
            <FolderTree className="h-3.5 w-3.5" />
            Notes & Folders ({notes.length})
          </Button>
          <Button
            variant={tab === 'questions' ? 'primary' : 'secondary'}
            type="button"
            onClick={() => setTab('questions')}
            className="gap-2"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Questions ({questions.length})
          </Button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-ink-soft">
          <span>{notes.length} notes</span>
          <span>·</span>
          <span>{questions.length} questions</span>
        </div>
      </div>

      {tab === 'notes' ? (
        /* NOTES & FOLDER EXPLORER */
        <PrepNotesExplorer
          stack={stack}
          meta={meta}
          notes={notes}
          topicId={topicId}
          onNotesChange={reload}
          onOpenImport={() => setImportModalOpen(true)}
        />
      ) : (
        /* QUESTIONS TAB */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-3.5">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-soft" />
                <Input
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  placeholder="Search questions & answers..."
                  className="h-8.5 pl-8 text-xs"
                />
              </div>

              <Select
                value={qDifficultyFilter}
                onChange={(e) => setQDifficultyFilter(e.target.value)}
                className="h-8.5 text-xs w-32"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>

              <Select
                value={qStatusFilter}
                onChange={(e) => setQStatusFilter(e.target.value)}
                className="h-8.5 text-xs w-36"
              >
                <option value="all">All Statuses</option>
                <option value="not_studied">Not Studied</option>
                <option value="studying">Studying</option>
                <option value="weak">Weak</option>
                <option value="good">Good</option>
                <option value="mastered">Mastered</option>
              </Select>
            </div>

            <Button
              type="button"
              variant={practiceMode ? 'primary' : 'secondary'}
              onClick={() => {
                setPracticeMode(!practiceMode);
                setRevealedAnswers({});
              }}
              className="h-8.5 text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {practiceMode ? 'Exit Practice Mode' : 'Practice Mode'}
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
            {/* Questions List */}
            <div className="space-y-3">
              {filteredQuestions.length === 0 ? (
                <EmptyState
                  title="No questions match"
                  hint="Add questions using the form on the right or import notes containing Q: ... A: ... blocks."
                />
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isRevealed = revealedAnswers[q.id];

                  return (
                    <Card key={q.id} className="space-y-2.5 hover:border-accent/30 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-xs font-semibold text-accent mt-0.5">
                            Q{idx + 1}.
                          </span>
                          <p className="font-medium text-[13.5px] leading-6 text-ink">{q.prompt}</p>
                        </div>
                        <Badge
                          tone={
                            q.difficulty === 'easy' ? 'ok' : q.difficulty === 'hard' ? 'danger' : 'neutral'
                          }
                        >
                          {q.difficulty ?? 'medium'}
                        </Badge>
                      </div>

                      {/* Answer Section */}
                      {q.answer ? (
                        practiceMode ? (
                          <div className="pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setRevealedAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: !prev[q.id],
                                }))
                              }
                              className="h-7 text-xs px-2 gap-1.5 text-accent"
                            >
                              {isRevealed ? (
                                <>
                                  <EyeOff className="h-3 w-3" /> Hide Answer
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" /> Reveal Answer
                                </>
                              )}
                            </Button>

                            {isRevealed && (
                              <div className="mt-2 rounded-lg bg-paper p-3 text-[13px] leading-relaxed text-ink border-l-2 border-accent animate-in fade-in whitespace-pre-wrap">
                                {q.answer}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg bg-paper/60 p-3 text-[13px] leading-relaxed text-ink border-l-2 border-accent/40 whitespace-pre-wrap">
                            {q.answer}
                          </div>
                        )
                      ) : null}

                      {/* Metadata & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-ink-soft">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-paper-2 px-1.5 py-0.5 text-[11px] font-medium text-ink">
                            {labelize(q.status)}
                          </span>
                          {q.notes ? (
                            <span className="truncate max-w-[200px] text-[11px] italic" title={q.notes}>
                              {q.notes}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <select
                            value={q.status}
                            onChange={async (e) => {
                              try {
                                await dataApi.updateQuestion(q.id, { status: e.target.value });
                                await reload();
                              } catch {
                                push('Could not update status', 'err');
                              }
                            }}
                            className="h-6 rounded border border-line bg-card px-1.5 text-[11px] text-ink outline-none"
                          >
                            <option value="not_studied">Not Studied</option>
                            <option value="studying">Studying</option>
                            <option value="weak">Weak</option>
                            <option value="good">Good</option>
                            <option value="mastered">Mastered</option>
                          </select>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Add Question Form */}
            <Card className="sticky top-6">
              <p className="mb-3 text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-accent" />
                Add Question
              </p>
              <form
                className="space-y-3"
                onSubmit={qForm.handleSubmit(async (v) => {
                  try {
                    await dataApi.createQuestion({
                      prompt: v.prompt,
                      technology: stack,
                      category: stack,
                      difficulty: v.difficulty,
                      answer: v.answer,
                      notes: v.notes,
                    });
                    qForm.reset({ difficulty: 'medium' });
                    push('Question saved');
                    await reload();
                  } catch (err) {
                    push(err instanceof ApiClientError ? err.message : 'Could not save question', 'err');
                  }
                })}
              >
                <Field label="Question">
                  <Textarea placeholder="e.g. How does useMemo differ from useCallback?" {...qForm.register('prompt', { required: true })} />
                </Field>
                <Field label="Answer">
                  <Textarea placeholder="Detailed technical explanation..." {...qForm.register('answer')} />
                </Field>
                <Field label="Notes / Reference">
                  <Input placeholder="e.g. Asked at Meta, React docs" {...qForm.register('notes')} />
                </Field>
                <Field label="Difficulty">
                  <Select {...qForm.register('difficulty')}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </Field>
                <Button type="submit" className="w-full">
                  Save Question
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <FolderImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        targetStack={stack}
        stacks={stacks.length > 0 ? stacks : [meta]}
        onImportComplete={reload}
      />
    </div>
  );
}
