# Why this format

The three-format split is modeled on the
[Diátaxis taxonomy](https://diataxis.fr) — the industry standard for
docs structure — and the information architecture of peer package
managers/registries (uv, pnpm, JSR).

Diátaxis separates docs by what the reader needs, not by length:

| Format       | Reader is                     | Obligation                       | Example             |
| ------------ | ----------------------------- | -------------------------------- | ------------------- |
| Lesson       | at study, acquiring skill     | a successful learning experience | nextjs.org/learn    |
| How-to guide | at work, accomplishing a task | get the job done                 | bun.com/docs/guides |
| Reference    | looking something up          | a lookup, not a narrative        | Deno CLI reference  |

The single most common docs mistake is conflating tutorials with
how-to guides. Bun's guides are how-tos ("Add a dependency"); Deno's
`publish` page is reference (Requirements + Options tables). Neither
is a lesson.

Peer registries also point the way: uv, pnpm, and JSR put the lesson
in a "Getting Started" track and keep a separate, task-oriented
**Guides** section. Registry docs cluster around jobs a registry does
— publishing, authentication, consumption, integration — rather than
language features.

## What makes lessons engaging

From Diátaxis, freeCodeCamp, and Next.js Learn:

1. State the goal up front — never "in this tutorial you will learn…",
   but "we will build/publish X; along the way we'll meet Y."
2. Deliver visible results early and often — every step must produce
   something the learner can see.
3. Maintain a narrative of the expected — "you should see…", "if you
   don't see X, you probably forgot to Y."
4. Point out what to notice — "notice the prompt changes to…".
5. Minimize explanation — one line max, then link out.
6. Small steps, small paragraphs, scannable headings.
7. Prerequisites stated up front — tool versions, accounts, whether
   paid.
8. Code-first, copy-pasteable.
9. Concreteness over abstraction; ignore alternatives.
10. Courses/chapters (Next.js Learn) add progress + quizzes for large
    skills — overkill for a single guide page.
