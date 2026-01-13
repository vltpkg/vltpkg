# @vltpkg/graph Architecture

This document provides an architectural overview of the
`@vltpkg/graph` library for new team members.

## Overview

The graph library models a JavaScript/TypeScript project's dependency
universe. It is the foundation for computing and applying changes to
`node_modules`.

```mermaid
flowchart TB
    subgraph "@vltpkg/graph"
        Graph[Graph]
        Node[Node]
        Edge[Edge]
        Diff[Diff]
    end

    subgraph "Graph Variants"
        Virtual[Virtual Graph<br/>from lockfile]
        Actual[Actual Graph<br/>from node_modules]
        Ideal[Ideal Graph<br/>desired state]
    end

    subgraph "Operations"
        Load[Load]
        Build[Build]
        Reify[Reify]
    end

    Virtual --> Load
    Actual --> Load
    Load --> Graph
    Graph --> Build
    Build --> Ideal
    Ideal --> Diff
    Actual --> Diff
    Diff --> Reify
    Reify --> node_modules[(node_modules)]
```

## Core Data Structures

### Graph, Node, and Edge Relationships

```mermaid
classDiagram
    class Graph {
        +Map~DepID, Node~ nodes
        +Map~string, Set~Node~~ nodesByName
        +Set~Edge~ edges
        +Set~Node~ importers
        +Node mainImporter
        +Map~DepID, Manifest~ manifests
        +PeerContext[] peerContexts
        +addNode()
        +addEdge()
        +placePackage()
        +findResolution()
        +removeNode()
        +resetEdges()
        +gc()
    }

    class Node {
        +DepID id
        +string name
        +string version
        +string location
        +Manifest manifest
        +Set~Edge~ edgesIn
        +Map~string, Edge~ edgesOut
        +boolean dev
        +boolean optional
        +boolean detached
        +string peerSetHash
        +string buildState
        +setResolved()
        +inVltStore()
    }

    class Edge {
        +Node from
        +Node to
        +DependencyType type
        +Spec spec
        +boolean dev
        +boolean optional
        +boolean peer
        +valid()
    }

    Graph "1" *-- "*" Node : contains
    Graph "1" *-- "*" Edge : contains
    Node "1" o-- "*" Edge : edgesIn
    Node "1" o-- "*" Edge : edgesOut
    Edge "*" --> "1" Node : from
    Edge "*" --> "0..1" Node : to
```

### Node Identity and Location

```mermaid
flowchart LR
    subgraph "Node Identity"
        DepID["DepID<br/>registry··pkg@1.0.0"]
        Spec["Spec<br/>pkg@^1.0.0"]
        Manifest["Manifest<br/>{name, version, ...}"]
    end

    subgraph "Node Location"
        Store["vlt Store<br/>node_modules/.vlt/&lt;id&gt;/node_modules/&lt;name&gt;"]
        Importer["Importer<br/>. or ./packages/foo"]
        Link["File Link<br/>./path/to/local"]
    end

    Spec --> DepID
    Manifest --> DepID
    DepID --> Store
    DepID --> Importer
    DepID --> Link
```

## Module Architecture

### Directory Structure

```
src/graph/src/
├── index.ts           # Public API exports
├── graph.ts           # Graph class
├── node.ts            # Node class
├── edge.ts            # Edge class
├── diff.ts            # Diff computation
├── dependencies.ts    # Dependency helpers
├── modifiers.ts       # Graph modifiers (DSS queries)
├── actual/            # Actual graph loading
│   └── load.ts
├── ideal/             # Ideal graph building
│   ├── build.ts
│   ├── build-ideal-from-starting-graph.ts
│   ├── refresh-ideal-graph.ts
│   ├── append-nodes.ts
│   ├── peers.ts
│   ├── get-importer-specs.ts
│   ├── get-ordered-dependencies.ts
│   └── types.ts
├── lockfile/          # Lockfile operations
│   ├── load.ts
│   ├── save.ts
│   └── types.ts
├── reify/             # Apply changes to disk
│   ├── index.ts
│   └── extract-node.ts
└── visualization/     # Graph output formats
    ├── mermaid-output.ts
    ├── human-readable-output.ts
    ├── json-output.ts
    └── object-like-output.ts
```

### Module Dependencies

```mermaid
flowchart TB
    subgraph "External Packages"
        depid("@vltpkg/dep-id")
        spec("@vltpkg/spec")
        pkginfo("@vltpkg/package-info")
        satisfies("@vltpkg/satisfies")
        semver("@vltpkg/semver")
        workspaces("@vltpkg/workspaces")
        rollback("@vltpkg/rollback-remove")
    end

    subgraph "Core"
        g("graph.ts")
        node("node.ts")
        edge("edge.ts")
        diff("diff.ts")
    end

    subgraph "Loaders"
        actual("actual/load.ts")
        lockfile("lockfile/load.ts")
    end

    subgraph "Ideal Builder"
        build("ideal/build.ts")
        fromgraph("ideal/build-ideal-from-starting-graph.ts")
        refresh("ideal/refresh-ideal-graph.ts")
        append("ideal/append-nodes.ts")
        peers("ideal/peers.ts")
    end

    subgraph "Output"
        reify("reify/index.ts")
        save("lockfile/save.ts")
    end

    depid --> node
    depid --> g
    spec --> edge
    spec --> g
    satisfies --> g
    satisfies --> peers
    pkginfo --> append
    workspaces --> g
    semver --> peers
    rollback --> reify
    rollback --> append

    node --> g
    edge --> g
    g --> actual
    g --> lockfile
    g --> build

    lockfile --> build
    actual --> build
    build --> fromgraph
    fromgraph --> refresh
    refresh --> append
    append --> peers

    g --> diff
    diff --> reify
    g --> save
```

## Graph Building Pipeline

### Ideal Graph Build Flow

```mermaid
sequenceDiagram
    participant User
    participant install.ts
    participant build.ts
    participant fromGraph as build-ideal-from-starting-graph.ts
    participant refresh as refresh-ideal-graph.ts
    participant append as append-nodes.ts
    participant peers as peers.ts
    participant PackageInfo

    User->>install.ts: install(options, add?)
    install.ts->>build.ts: ideal.build(options)

    alt Has lockfile
        build.ts->>build.ts: loadVirtual()
    else No lockfile
        build.ts->>build.ts: loadActual()
    end

    build.ts->>fromGraph: buildIdealFromStartingGraph()
    fromGraph->>fromGraph: getImporterSpecs()
    fromGraph->>fromGraph: merge add/remove
    fromGraph->>refresh: refreshIdealGraph()

    loop For each importer
        refresh->>append: appendNodes()

        loop Breadth-first levels
            append->>PackageInfo: fetch manifests (parallel)
            PackageInfo-->>append: manifests
            append->>peers: startPeerPlacement()
            append->>append: placePackage()
            append->>peers: endPeerPlacement()
        end

        append->>peers: postPlacementPeerCheck()
    end

    refresh->>refresh: setDefaultLocation() for all nodes
    refresh-->>build.ts: graph
    build.ts-->>install.ts: graph
```

### Breadth-First Node Processing

```mermaid
flowchart TB
    subgraph "Level 0 - Importer"
        I[Importer Node]
    end

    subgraph "Level 1 - Direct Deps"
        A[Package A]
        B[Package B]
        C[Package C]
    end

    subgraph "Level 2 - Transitive"
        D[Package D]
        E[Package E]
        F[Package F]
    end

    subgraph "Level 3 - Deep"
        G[Package G]
    end

    I --> A
    I --> B
    I --> C
    A --> D
    B --> D
    B --> E
    C --> F
    D --> G
    E --> G

    style I fill:#f9f,stroke:#333
    style A fill:#bbf,stroke:#333
    style B fill:#bbf,stroke:#333
    style C fill:#bbf,stroke:#333
    style D fill:#bfb,stroke:#333
    style E fill:#bfb,stroke:#333
    style F fill:#bfb,stroke:#333
    style G fill:#fbb,stroke:#333
```

All nodes at each level are processed in parallel, with manifest
fetches happening concurrently.

## Peer Dependency Resolution

### Peer Context Lifecycle

```mermaid
stateDiagram-v2
    [*] --> InitialContext: Graph created

    InitialContext --> ProcessLevel: Start level processing

    ProcessLevel --> CheckCompatibility: For each dependency

    CheckCompatibility --> ReuseNode: Compatible
    CheckCompatibility --> ForkContext: Incompatible peers

    ReuseNode --> AddEdge
    ForkContext --> NewContext: Create context with index N
    NewContext --> PlaceNode

    PlaceNode --> StartPeerPlacement: Has peerDeps?
    StartPeerPlacement --> GenerateHash: Yes
    GenerateHash --> EndPeerPlacement
    EndPeerPlacement --> PutEntries

    PutEntries --> NeedsFork: Conflicts?
    NeedsFork --> ForkContext: Yes
    NeedsFork --> ResolvePeers: No

    ResolvePeers --> AddEdge: Satisfied from context
    ResolvePeers --> AddToNextLevel: Not satisfied

    AddEdge --> ProcessLevel: More deps?
    AddToNextLevel --> ProcessLevel

    ProcessLevel --> [*]: All levels done
```

### Peer Context Forking

```mermaid
flowchart TB
    subgraph "Context 0 (Initial)"
        C0_react["react → v18.0.0"]
        C0_lodash["lodash → v4.17.0"]
    end

    subgraph "Context 1 (Forked)"
        C1_react["react → v19.0.0"]
        C1_lodash["lodash → v4.17.0 (inherited)"]
    end

    subgraph "Nodes"
        N1["react-dom@18<br/>peerSetHash: undefined"]
        N2["react-dom@19<br/>peerSetHash: ṗ:1"]
    end

    C0_react --> N1
    C1_react --> N2

    C0_react -.->|"incompatible<br/>peer version"| C1_react
```

When a package requires a different peer version than what's in the
current context, a new context is forked and the node gets a unique
`peerSetHash`.

## Lockfile Format

### Data Structure

```mermaid
erDiagram
    LockfileData ||--o{ LockfileNode : contains
    LockfileData ||--o{ LockfileEdge : contains

    LockfileData {
        number lockfileVersion
        object options
        object nodes
        object edges
    }

    LockfileNode {
        number flags
        string name
        string integrity
        string resolved
        string location
        object manifest
        object platform
        object bins
        number buildState
    }

    LockfileEdge {
        string key "fromId specName"
        string value "type bareSpec toId"
    }
```

### Node Flags

| Flag Value | Meaning               |
| ---------- | --------------------- |
| 0          | Production dependency |
| 1          | Optional dependency   |
| 2          | Dev dependency        |
| 3          | Dev + Optional        |

## Installation Flow

```mermaid
flowchart TB
    Start([vlt install]) --> ValidateOptions

    ValidateOptions --> CheckPkgJson{package.json<br/>exists?}
    CheckPkgJson -->|No| Init[vlt init]
    CheckPkgJson -->|Yes| CheckFrozen{frozen-lockfile?}
    Init --> CheckFrozen

    CheckFrozen -->|Yes| ValidateLockfile[Validate lockfile<br/>matches package.json]
    ValidateLockfile -->|Mismatch| Error([Error])
    ValidateLockfile -->|OK| LoadActual

    CheckFrozen -->|No| LoadActual[Load Actual Graph]

    LoadActual --> BuildIdeal[Build Ideal Graph]
    BuildIdeal --> CheckLockfileOnly{lockfile-only?}

    CheckLockfileOnly -->|Yes| SaveLockfile[Save Lockfile]
    SaveLockfile --> Done([Done])

    CheckLockfileOnly -->|No| Reify[Reify Changes]
    Reify --> SaveBoth[Save Lockfiles]
    SaveBoth --> RunScripts[Run Build Scripts]
    RunScripts --> Done
```

## Key Concepts

### DepID (Dependency ID)

Unique identifier for a package instance:

- `registry··pkg@1.0.0` - Registry package
- `file·./local/path` - Local file/folder
- `git·github.com/user/repo#commit` - Git dependency
- `workspace·packages/foo` - Workspace package

### Resolution Cache

The graph maintains resolution caches for performance:

- `resolutions: Map<string, Node>` - Spec → Node lookup
- `resolutionsReverse: Map<Node, Set<string>>` - Node → Specs reverse
  lookup

Cache keys combine:
`spec + fromLocation + extra (modifier + peerSetHash)`

### Detached Nodes

When `graph.resetEdges()` is called:

1. All edges are cleared
2. Nodes with manifests are marked `detached = true`
3. Detached nodes can be reused without re-fetching manifests

### Early Extraction

During ideal graph building, tarballs can be extracted in parallel:

1. Node is placed in graph
2. If node doesn't exist in actual graph → extract immediately
3. Extraction happens via `RollbackRemove` for safe rollback on
   failure

## Visualization Outputs

The `visualization/` module provides multiple graph output formats:

| Format         | Function                | Description                                     |
| -------------- | ----------------------- | ----------------------------------------------- |
| Mermaid        | `mermaidOutput()`       | Flowchart diagram syntax for docs/debugging     |
| Human-readable | `humanReadableOutput()` | ASCII tree with colors (like `npm ls`)          |
| JSON           | `jsonOutput()`          | Array of `{name, fromID, spec, type, to}` items |
| Object-like    | `objectLikeOutput()`    | Node.js `inspect()` output for debugging        |

All outputs accept filtered `{edges, nodes, importers}` from query
results.

## Testing Strategy

- Unit tests in `test/` mirror `src/` structure
- 100% code coverage required
- Use mock `PackageInfoClient` for manifest fetching
- Test peer context forking with real npm packages (e.g., React
  ecosystem)

## Further Reading

- [Cursor Rules](.cursor/rules/graph/) - Detailed implementation
  guides
- [npm package.json docs](https://docs.npmjs.com/cli/configuring-npm/package-json)
- [Semantic Versioning](https://semver.org)
