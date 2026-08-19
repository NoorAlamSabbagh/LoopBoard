export type StackId =
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'nodejs'
  | 'express'
  | 'mongodb'
  | 'system_design'
  | 'dsa';

export type StackQuestionSeed = {
  prompt: string;
  answer: string;
  notes: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export type StackNoteSeed = {
  title: string;
  content: string;
};

export type StackPrepSeed = {
  id: StackId;
  name: string;
  blurb: string;
  questions: StackQuestionSeed[];
  notes: StackNoteSeed[];
};

export const STACK_PREP: StackPrepSeed[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    blurb: 'Closures, event loop, this, prototypes, async.',
    questions: [
      {
        prompt: 'Explain the event loop, call stack, and microtask queue.',
        difficulty: 'medium',
        answer:
          'JS is single-threaded. Sync work runs on the call stack. Promises/queueMicrotask go to the microtask queue and drain before the next macrotask (setTimeout, I/O). The event loop picks the next macrotask only when the stack and microtasks are empty.',
        notes: 'Draw: stack → microtasks → macrotasks. Promise.then runs before setTimeout(0).',
      },
      {
        prompt: 'What is a closure? Give a practical example.',
        difficulty: 'easy',
        answer:
          'A closure is a function that remembers variables from its lexical scope after the outer function has returned. Used for private state, partial application, and React hooks.',
        notes: 'Classic: makeCounter() returning increment that closes over count.',
      },
      {
        prompt: 'var vs let vs const, and temporal dead zone.',
        difficulty: 'easy',
        answer:
          'var is function-scoped and hoisted as undefined. let/const are block-scoped and hoisted into the TDZ until initialized. const cannot be reassigned.',
        notes: 'Interviewers often follow with: can you mutate a const object? Yes.',
      },
      {
        prompt: 'How does this work in regular functions vs arrow functions?',
        difficulty: 'medium',
        answer:
          'Regular functions bind this from the call site (object, new, bind, or global/undefined in strict). Arrow functions inherit this from the enclosing lexical scope and cannot be rebound.',
        notes: 'React class methods need bind or arrows. Avoid arrows as object methods if you need own this.',
      },
      {
        prompt: 'What are debouncing and throttling?',
        difficulty: 'medium',
        answer:
          'Debounce: wait until calls stop, then run once (search input). Throttle: run at most once per interval (scroll). Implement with setTimeout / last-run timestamp.',
        notes: 'Know when to use each in UI interviews.',
      },
    ],
    notes: [
      {
        title: 'JS mental model',
        content:
          'Types (primitive vs object), equality (== vs ===), copying (spread vs structuredClone), iteration (for...of vs for...in). Practice: flatten array, debounce, Promise.all polyfill.',
      },
      {
        title: 'Async patterns',
        content:
          'Callbacks → promises → async/await. Error handling with try/catch. Promise.all vs allSettled vs race. AbortController for fetch cancellation.',
      },
    ],
  },
  {
    id: 'react',
    name: 'React',
    blurb: 'Hooks, rendering, state, performance, composition.',
    questions: [
      {
        prompt: 'How does React rendering work, and when does a component re-render?',
        difficulty: 'medium',
        answer:
          'A render is triggered by setState/useState, parent re-render, or context change. React compares the new element tree (reconciliation) and commits DOM updates. Memo/useMemo/useCallback reduce extra work, they do not skip renders by default except memo on props.',
        notes: 'Strict Mode double-invokes render in dev. Keys must be stable.',
      },
      {
        prompt: 'useEffect vs useLayoutEffect. Cleanup?',
        difficulty: 'medium',
        answer:
          'useEffect runs after paint (subscriptions, fetch). useLayoutEffect runs after DOM mutations, before paint (measure layout). Return a cleanup to unsubscribe / abort fetch.',
        notes: 'Missing deps and stale closures are the #1 hook bug.',
      },
      {
        prompt: 'Controlled vs uncontrolled inputs.',
        difficulty: 'easy',
        answer:
          'Controlled: value + onChange, React is source of truth. Uncontrolled: defaultValue + ref. Prefer controlled for validation; uncontrolled for simple forms or file inputs.',
        notes: 'Mixing both on the same input causes bugs.',
      },
      {
        prompt: 'How would you prevent unnecessary re-renders?',
        difficulty: 'medium',
        answer:
          'Split state, lift only what is needed, React.memo, stable callbacks (useCallback) when passing to memo children, virtualize long lists, avoid anonymous objects in JSX props, use context selectors or state colocation.',
        notes: 'Profile first. Memo everywhere is a smell.',
      },
      {
        prompt: 'What is the virtual DOM and why keys matter in lists?',
        difficulty: 'easy',
        answer:
          'Virtual DOM is an in-memory tree of React elements. Reconciliation diffs previous vs next trees. Keys tell React which child is which so state is preserved and DOM is reused.',
        notes: 'Never use array index as key if the list can reorder.',
      },
    ],
    notes: [
      {
        title: 'Hooks checklist',
        content:
          'Rules of Hooks, custom hooks for reuse, useRef for mutable values that should not trigger render, useReducer for complex state, lifting state vs composition (children / render props).',
      },
      {
        title: 'Data fetching in React',
        content:
          'Fetch in useEffect with abort, or use a library (TanStack Query). Handle loading/error/empty. Don’t fetch in render. For SSR/RSC know the difference from client fetch.',
      },
    ],
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    blurb: 'Event loop, streams, modules, process, clustering.',
    questions: [
      {
        prompt: 'How is the Node.js event loop different from the browser?',
        difficulty: 'medium',
        answer:
          'Node uses libuv phases: timers, pending callbacks, idle/prepare, poll, check (setImmediate), close. process.nextTick and promises run between phases. Blocking the event loop (sync fs, heavy CPU) stalls all requests.',
        notes: 'setImmediate vs setTimeout vs nextTick is a common follow-up.',
      },
      {
        prompt: 'What are streams and when do you use them?',
        difficulty: 'medium',
        answer:
          'Readable/writable/duplex/transform. Stream large files or HTTP bodies so you don’t load everything into memory. pipe() and pipeline() handle backpressure.',
        notes: 'Know fs.createReadStream + res.pipe for file download.',
      },
      {
        prompt: 'CommonJS vs ESM in Node.',
        difficulty: 'easy',
        answer:
          'CJS: require/module.exports, sync, cached. ESM: import/export, static analysis, top-level await. Package.json "type": "module". Mixing needs createRequire or dynamic import().',
        notes: 'Loopboard server uses ESM (type module).',
      },
      {
        prompt: 'How do you handle uncaught errors in a Node HTTP server?',
        difficulty: 'medium',
        answer:
          'Try/catch in async handlers, Express error middleware, listen to unhandledRejection and uncaughtException (log and exit for unknown state). Don’t swallow errors. Use a process manager (PM2) to restart.',
        notes: 'Never leave the process running after a corrupted heap if you don’t know the state.',
      },
      {
        prompt: 'What is clustering / worker_threads used for?',
        difficulty: 'hard',
        answer:
          'cluster/fork uses multiple processes to use more CPU cores for I/O servers. worker_threads share memory for CPU-bound work without blocking the event loop. Prefer horizontal scale (more instances) for most APIs.',
        notes: 'Node is great at I/O, weak at single-thread CPU unless offloaded.',
      },
    ],
    notes: [
      {
        title: 'Node production basics',
        content:
          'env config, graceful shutdown (close server, drain connections), logging, health checks, don’t commit secrets, pin engines.node, handle SIGTERM.',
      },
      {
        title: 'Useful APIs',
        content:
          'fs/promises, path, crypto, http/https, EventEmitter, Buffer vs string encodings, process.env, worker_threads.',
      },
    ],
  },
  {
    id: 'express',
    name: 'Express',
    blurb: 'Middleware, routing, errors, auth, validation.',
    questions: [
      {
        prompt: 'What is middleware in Express and what is the (err, req, res, next) signature?',
        difficulty: 'easy',
        answer:
          'Middleware is a function (req, res, next) that can read/write req/res and call next(). Error middleware has 4 args. Order matters: parsers, auth, routes, 404, error handler.',
        notes: 'Forgetting next() hangs the request.',
      },
      {
        prompt: 'How do you structure a production Express API?',
        difficulty: 'medium',
        answer:
          'Router per resource, controller → service → repository, Zod/Joi validation, centralized error handler, async wrapper, Helmet, CORS, rate limit, request id logging.',
        notes: 'This app uses that layering.',
      },
      {
        prompt: 'How do you handle async errors in Express 4?',
        difficulty: 'medium',
        answer:
          'Wrap async route handlers and pass errors to next(err). Express 5 can await rejected promises. Always have a final error middleware that maps status codes.',
        notes: 'Uncaught async throw without next() crashes or hangs.',
      },
      {
        prompt: 'JWT access + refresh cookie flow.',
        difficulty: 'medium',
        answer:
          'Short-lived access JWT in memory/header. Refresh token httpOnly Secure cookie, rotated, stored server-side (Redis). CSRF: SameSite=Lax/Strict. Logout deletes the refresh record.',
        notes: 'Never store refresh in localStorage if you can avoid it.',
      },
      {
        prompt: 'How do you version and validate request bodies?',
        difficulty: 'easy',
        answer:
          'Validate at the edge (Zod). Reject unknown fields. Use 422 for validation. Version via /api/v1 or headers. Keep DTOs separate from DB models.',
        notes: 'Never trust req.body types without a schema.',
      },
    ],
    notes: [
      {
        title: 'Express request lifecycle',
        content:
          'Incoming → helmet/cors → json parser → rate limit → auth → route → service → mongoose → envelope { success, data } → error handler.',
      },
      {
        title: 'File uploads',
        content:
          'Multer for multipart. Limit size/mime. Store outside public web root or S3. Never use user filename as disk path without sanitizing.',
      },
    ],
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    blurb: 'Schema design, indexes, aggregation, transactions.',
    questions: [
      {
        prompt: 'When would you embed vs reference documents?',
        difficulty: 'medium',
        answer:
          'Embed when data is read together, bounded size, and not reused (address on user). Reference when many-to-many, unbounded arrays, or independently updated (questions vs companies).',
        notes: 'Unbounded arrays in a document is a scaling trap.',
      },
      {
        prompt: 'What indexes would you add for a user-scoped list with filters?',
        difficulty: 'medium',
        answer:
          'Compound index { userId: 1, createdAt: -1 } plus filters you query together, e.g. { userId: 1, technology: 1, status: 1 }. Partial unique indexes for soft-delete uniqueness.',
        notes: 'Equality fields first, then sort. Explain with explain().',
      },
      {
        prompt: 'Mongoose vs native driver. What is lean()?',
        difficulty: 'easy',
        answer:
          'Mongoose adds schemas, validation, middleware, and hydrated documents. lean() returns plain objects (faster, no save/virtuals unless you add them).',
        notes: 'Use lean() for read-heavy list APIs.',
      },
      {
        prompt: 'How do you model soft deletes and unique names per user?',
        difficulty: 'medium',
        answer:
          'deletedAt: Date | null. Unique index on { userId, name } with partialFilterExpression { deletedAt: null } so deleted names can be reused.',
        notes: 'Loopboard companies use this pattern.',
      },
      {
        prompt: 'Aggregation pipeline vs multiple queries.',
        difficulty: 'medium',
        answer:
          'Use aggregation for grouping, lookups, computed fields in one round trip (dashboard charts). Keep pipelines indexed. Avoid huge $lookup without filters.',
        notes: 'Know $match early, $group, $project, $lookup.',
      },
    ],
    notes: [
      {
        title: 'Mongo interview drills',
        content:
          'Replica sets vs sharding, write concern, read preference, ObjectId, TTL indexes, change streams at a high level.',
      },
      {
        title: 'Mongoose pitfalls',
        content:
          'Missing await, overusing populate, Mixed types, updating without validators (findOneAndUpdate needs runValidators).',
      },
    ],
  },
  {
    id: 'system_design',
    name: 'System design',
    blurb: 'APIs, scale, storage, caches, queues, trade-offs.',
    questions: [
      {
        prompt: 'Walk through designing a URL shortener.',
        difficulty: 'medium',
        answer:
          'API: POST /shorten, GET /:code redirect. Encode id (base62). Store mapping in DB + cache. Unique codes, 301 vs 302, analytics async via queue. Scale reads with cache/CDN. Hash collisions: retry.',
        notes: 'Clarify QPS, URL length, custom aliases, expiry.',
      },
      {
        prompt: 'How would you design a news feed?',
        difficulty: 'hard',
        answer:
          'Fan-out on write for small graphs (precompute timelines), fan-out on read for celebrities. Store posts, graph, timeline cache (Redis). Rank by time + engagement. Pagination with cursors.',
        notes: 'Talk consistency, backfill, and hot keys.',
      },
      {
        prompt: 'CAP theorem in practice. SQL vs NoSQL for an ATS?',
        difficulty: 'medium',
        answer:
          'CP vs AP is a trade-off under partition. For Loopboard-like ATS, user-scoped documents in Mongo is fine; strong relational data (money, inventory) often wants SQL + transactions.',
        notes: 'Don’t recite CAP without an example.',
      },
      {
        prompt: 'Where would you put Redis in a MERN API?',
        difficulty: 'medium',
        answer:
          'Session/refresh tokens, rate limits, hot dashboard cache, job queues, pub/sub. Cache-aside with TTL. Invalidate on writes. Don’t use Redis as source of truth for user data.',
        notes: 'This app uses Redis optionally with in-memory fallback in dev.',
      },
      {
        prompt: 'How do you design auth for a SPA + API?',
        difficulty: 'medium',
        answer:
          'HTTPS, short access JWT, httpOnly refresh cookie, CSRF strategy, CORS allowlist, rotation, logout revoke. Separate auth service later if many clients.',
        notes: 'Mention password hashing (bcrypt/argon2) and reset tokens hashed at rest.',
      },
    ],
    notes: [
      {
        title: 'System design template',
        content:
          '1) Requirements & numbers 2) API 3) Data model 4) High-level boxes 5) Deep dive (bottleneck) 6) Scale (cache, shard, queue) 7) Reliability (retries, idempotency) 8) Trade-offs.',
      },
      {
        title: 'Back-of-envelope',
        content:
          'QPS, storage, bandwidth. 1M users × 10 req/day ≈ 115 QPS avg. Peak 10×. Know KB vs GB vs TB quickly.',
      },
    ],
  },
  {
    id: 'dsa',
    name: 'DSA',
    blurb: 'Arrays, hashing, trees, graphs, DP — interview patterns.',
    questions: [
      {
        prompt: 'Two sum. Approaches and complexity.',
        difficulty: 'easy',
        answer:
          'Brute O(n²). Hash map value→index in one pass O(n) time O(n) space. If sorted, two pointers O(n).',
        notes: 'Follow-up: return all pairs, duplicates, two-sum in BST.',
      },
      {
        prompt: 'Detect a cycle in a linked list.',
        difficulty: 'easy',
        answer:
          'Floyd: slow/fast pointers. If they meet, cycle. To find start: reset one to head, step both by 1.',
        notes: 'O(1) extra space vs hash set of nodes.',
      },
      {
        prompt: 'Binary search template and common bugs.',
        difficulty: 'medium',
        answer:
          'While lo <= hi, mid = lo + ((hi-lo)>>1). Decide which half is sorted / contains answer. Off-by-one on lo=mid+1 vs hi=mid. Practice: first/last occurrence, search in rotated array.',
        notes: 'Always define the invariant: what lo/hi mean.',
      },
      {
        prompt: 'BFS vs DFS. When for graphs?',
        difficulty: 'medium',
        answer:
          'BFS: shortest path in unweighted graphs, level order. DFS: cycle detect, topology, components, path existence. Implement BFS with queue, DFS with stack/recursion. Track visited.',
        notes: 'Grid problems: 4-dir BFS for nearest distance.',
      },
      {
        prompt: 'When do you use DP? Give a pattern.',
        difficulty: 'hard',
        answer:
          'Overlapping subproblems + optimal substructure. Patterns: 1D (climb stairs, knapsack), 2D (LCS, unique paths), interval, LIS. Start from recurrence, then memo, then bottom-up.',
        notes: 'State definition is the interview. Complexity of states × transitions.',
      },
    ],
    notes: [
      {
        title: 'Pattern list to grind',
        content:
          'Two pointers, sliding window, prefix sums, hashing, stack (monotonic), heap, binary search, trees (BST/LCA), graphs (BFS/DFS/Union-Find), DP, greedy, intervals, trie.',
      },
      {
        title: 'Interview communication',
        content:
          'Restate, constraints, brute force, optimize, code, test edge cases (empty, one element, duplicates, overflow). Talk complexity out loud.',
      },
    ],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    blurb: 'Types, generics, narrowing, utility types.',
    questions: [
      {
        prompt: 'interface vs type. When each?',
        difficulty: 'easy',
        answer:
          'Both describe shapes. interface can merge (declaration merging) and extends cleanly. type aliases can unions, tuples, mapped types. Prefer interface for object contracts, type for unions.',
        notes: 'Don’t fight the codebase convention.',
      },
      {
        prompt: 'Explain narrowing and type guards.',
        difficulty: 'medium',
        answer:
          'Control flow analysis: typeof, instanceof, in, equality, custom predicates (x is Cat). Discriminated unions with a kind field are the most scalable.',
        notes: 'unknown vs any: unknown forces narrowing.',
      },
      {
        prompt: 'What are generics? Give an API example.',
        difficulty: 'medium',
        answer:
          'Type parameters for reusable functions/classes. e.g. unwrap<T>(p: Promise<ApiSuccess<T>>). Constraints with extends. Defaults like T = unknown.',
        notes: 'Avoid over-generic APIs that become any.',
      },
      {
        prompt: 'Partial, Pick, Omit, Record — when?',
        difficulty: 'easy',
        answer:
          'Partial for updates. Pick/Omit to derive DTOs. Record<K,V> for maps. Readonly / Required as needed. Prefer deriving from one source of truth.',
        notes: 'Don’t duplicate User and UserUpdate by hand if you can Omit.',
      },
    ],
    notes: [
      {
        title: 'TS in a MERN app',
        content:
          'Shared DTO types, Zod at runtime (TS is erased), strict mode, path aliases, don’t use any to silence errors — fix the type.',
      },
    ],
  },
];

export const STACK_IDS = STACK_PREP.map((s) => s.id);
