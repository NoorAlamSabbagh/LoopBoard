# Drop your GitHub notes here

Copy the notes folders from your GitHub repo into this `prep-notes` directory, keeping stack names as folder names.

Then in Loopboard open **Preparation → Notes & questions** and click **Import my notes**.

## Folder names (map to stacks)

| Folder name | Stack |
| --- | --- |
| `react`, `reactjs` | React |
| `node`, `nodejs`, `node.js` | Node.js |
| `express` | Express |
| `javascript`, `js` | JavaScript |
| `typescript`, `ts` | TypeScript |
| `mongodb`, `mongo` | MongoDB |
| `system-design`, `system_design`, `lld`, `hld` | System design |
| `dsa`, `algorithms`, `leetcode` | DSA |
| anything else (e.g. `redis`, `bullmq`) | New stack on the hub (created on import) |

You can also add a stack in the app: **Notes & questions → New stack**. That creates `prep-notes/<name>/` so you can drop files there later.

Example:

```
prep-notes/
  react/
    hooks.md
    rendering.md
  nodejs/
    event-loop.md
  dsa/
    arrays.md
    graphs/
      bfs.md
```

Supported files: `.md`, `.markdown`, `.txt`

Optional Q&A inside a file (also becomes interview questions):

```
Q: What is a closure?
A: A function that remembers its lexical scope.

Q: Explain the event loop.
A: ...
```
