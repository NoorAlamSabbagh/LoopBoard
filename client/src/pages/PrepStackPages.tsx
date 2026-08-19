import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, BookOpen, Code2, Plus } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { dataApi } from '@/services/dataApi';
import { ApiClientError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { Note, PrepStack, Question } from '@/types/api';
import { labelize } from '@/utils/format';

function topicSlug(stack: string) {
  return stack === 'system_design' ? 'system-design' : stack.replaceAll('_', '-');
}

export function PrepStackHubPage() {
  const [stacks, setStacks] = useState<PrepStack[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
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

  return (
    <div>
      <PageHeader
        title="Notes & questions"
        subtitle="Interview notes and Q&A grouped by stack — add Redis, BullMQ, or any topic you want."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowNew((v) => !v)}>
              <Plus className="h-4 w-4" />
              New stack
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={importing}
              onClick={async () => {
                setImporting(true);
                try {
                  const res = await dataApi.importFolderNotes();
                  const d = res.data;
                  if (!d?.scanned) {
                    push('No files found. Copy your notes into the prep-notes folder, then import again.', 'err');
                  } else {
                    push(
                      `Imported ${d.notesAdded} notes (${d.notesUpdated} updated), ${d.questionsAdded} questions from ${d.scanned} files`,
                    );
                  }
                  await loadStacks();
                } catch (err) {
                  push(err instanceof ApiClientError ? err.message : 'Import failed', 'err');
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? 'Importing…' : 'Import my notes'}
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
              {seeding ? 'Loading…' : totalQ ? 'Fill missing stacks' : 'Load starter notes'}
            </Button>
          </div>
        }
      />
      {showNew ? (
        <Card className="mb-4">
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
              <Input placeholder="Redis, BullMQ, Kafka…" {...newForm.register('name', { required: true })} />
            </Field>
            <Field label="Short description">
              <Input placeholder="Queues, caching, streams…" {...newForm.register('blurb')} />
            </Field>
            <Button type="submit" disabled={creating}>
              {creating ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </Card>
      ) : null}
      <p className="mb-4 text-[13px] text-ink-soft">
        Copy GitHub notes into <span className="font-medium text-ink">prep-notes/</span> (including folders like{' '}
        <span className="font-medium text-ink">redis</span> or <span className="font-medium text-ink">bullmq</span>), then
        import — or add a stack here and write notes in the app.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stacks.map((s) => (
          <Link key={s.id} to={`/prep/notes/${s.id}`}>
            <Card className="h-full hover:border-accent/40">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
                  {s.id === 'dsa' || s.id === 'system_design' ? (
                    <BookOpen className="h-4 w-4" />
                  ) : (
                    <Code2 className="h-4 w-4" />
                  )}
                </div>
                {s.custom ? <Badge>Yours</Badge> : null}
              </div>
              <p className="text-[15px] font-semibold">{s.name}</p>
              <p className="mt-1 text-[13px] text-ink-soft">{s.blurb}</p>
              <p className="mt-3 text-xs text-ink-soft">
                {s.questions} questions · {s.notes} notes
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PrepStackDetailPage() {
  const { stack } = useParams();
  const navigate = useNavigate();
  const push = useUi((s) => s.push);
  const [meta, setMeta] = useState<PrepStack | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tab, setTab] = useState<'questions' | 'notes'>('questions');
  const [topics, setTopics] = useState<{ id: string; slug: string }[]>([]);
  const [ready, setReady] = useState(false);
  const qForm = useForm<Record<string, string>>({ defaultValues: { difficulty: 'medium' } });
  const nForm = useForm<Record<string, string>>();

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

  if (!ready) {
    return <p className="text-[13px] text-ink-soft">Loading stack…</p>;
  }

  if (!meta || !stack) {
    return <EmptyState title="Unknown stack" hint="Add it from Notes & questions with New stack." />;
  }

  return (
    <div>
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-soft hover:text-ink"
        onClick={() => navigate('/prep/notes')}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All stacks
      </button>
      <PageHeader title={meta.name} subtitle={meta.blurb} />
      <div className="mb-4 flex gap-2">
        <Button variant={tab === 'questions' ? 'primary' : 'secondary'} type="button" onClick={() => setTab('questions')}>
          Questions ({questions.length})
        </Button>
        <Button variant={tab === 'notes' ? 'primary' : 'secondary'} type="button" onClick={() => setTab('notes')}>
          Notes ({notes.length})
        </Button>
      </div>

      {tab === 'questions' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {questions.length === 0 ? (
              <EmptyState title="No questions yet" hint="Add a question on the right." />
            ) : (
              questions.map((q) => (
                <Card key={q.id}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-6">{q.prompt}</p>
                    <Badge>{q.difficulty ?? 'medium'}</Badge>
                  </div>
                  {q.answer ? <p className="mt-2 text-[13px] leading-6 text-ink">{q.answer}</p> : null}
                  {q.notes ? <p className="mt-2 text-[13px] text-ink-soft">{q.notes}</p> : null}
                  <p className="mt-2 text-xs text-ink-soft">{labelize(q.status)}</p>
                </Card>
              ))
            )}
          </div>
          <Card>
            <p className="mb-3 text-[13px] font-semibold">Add question</p>
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
                  push(err instanceof ApiClientError ? err.message : 'Could not save', 'err');
                }
              })}
            >
              <Field label="Question">
                <Textarea {...qForm.register('prompt', { required: true })} />
              </Field>
              <Field label="Answer">
                <Textarea {...qForm.register('answer')} />
              </Field>
              <Field label="Notes">
                <Textarea {...qForm.register('notes')} />
              </Field>
              <Field label="Difficulty">
                <Select {...qForm.register('difficulty')}>
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </Select>
              </Field>
              <Button type="submit">Save</Button>
            </form>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {notes.length === 0 ? (
              <EmptyState title="No notes yet" hint="Write a cheat sheet on the right." />
            ) : (
              notes.map((n) => (
                <Card key={n.id}>
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-ink-soft">{n.content}</p>
                </Card>
              ))
            )}
          </div>
          <Card>
            <p className="mb-3 text-[13px] font-semibold">Add note</p>
            <form
              className="space-y-3"
              onSubmit={nForm.handleSubmit(async (v) => {
                try {
                  let id = topicId;
                  if (!id) {
                    const topic = await dataApi.createTopic({
                      slug: topicSlug(stack),
                      name: meta.name,
                      notes: meta.blurb,
                    });
                    id = topic.data.id;
                  }
                  await dataApi.createNote({
                    title: v.title,
                    content: v.content,
                    tags: [stack, 'stack'],
                    entityType: 'preparation_topic',
                    entityId: id,
                  });
                  nForm.reset();
                  push('Note saved');
                  await reload();
                } catch (err) {
                  push(err instanceof ApiClientError ? err.message : 'Could not save note', 'err');
                }
              })}
            >
              <Field label="Title">
                <Input {...nForm.register('title', { required: true })} />
              </Field>
              <Field label="Content">
                <Textarea {...nForm.register('content', { required: true })} />
              </Field>
              <Button type="submit">Save note</Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
