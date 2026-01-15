# Granular Access Tokens

All tokens are considered "granular access tokens" (GATs). Token
entries in the database consist of 3 parts:

- `token` the unique token value
- `uuid` associative value representing a single user/scope
- `scope` value representing the granular access/privileges

#### `scope` as a JSON `Object`

A `scope` contains an array of privileges that define both the type(s)
of & access value(s) for a token.

> [!NOTE] Tokens can be associated with multiple "types" of access

- `type(s)`:
  - `pkg:read` read associated packages
  - `pkg:read+write` write associated packages (requires read access)
  - `user:read` read associated user
  - `user:read+write` write associated user (requires read access)
- `value(s)`:
  - `*` an ANY selector for `user:` or `pkg:` access types
  - `~<user>` user selector for the `user:` access type
  - `@<scope>/<pkg>` package specific selector for the `pkg:` access
    type
  - `@<scope>/*` glob scope selector for `pkg:` access types

> [!NOTE]
>
> - user/org/team management via `@<scope>` is not supported at the
>   moment

### Granular Access Examples

##### End-user/Subscriber Persona

- specific package read access
- individual user read+write access

```json
[
  {
    "values": ["@organization/package-name"],
    "types": {
      "pkg": {
        "read": true
      }
    }
  },
  {
    "values": ["~johnsmith"],
    "types": {
      "user": {
        "read": true,
        "write": true
      }
    }
  }
]
```

##### Team Member/Maintainer Persona

- scoped package read+write access
- individual user read+write access

```json
[
  {
    "values": ["@organization/*"],
    "types": {
      "pkg": {
        "read": true
      }
    }
  },
  {
    "values": ["~johnsmith"],
    "types": {
      "user": {
        "read": true,
        "write": true
      }
    }
  }
]
```

##### Package Publish CI Persona

- organization scoped packages read+write access
- individual user read+write access

```json
[
  {
    "values": ["@organization/package-name"],
    "types": {
      "pkg": {
        "read": true
      }
    }
  },
  {
    "values": ["~johnsmith"],
    "types": {
      "user": {
        "read": true,
        "write": true
      }
    }
  }
]
```

##### Organization Admin Persona

- organization scoped package read+write access
- organization users read+write access

```json
[
  {
    "values": ["@company/*"],
    "types": {
      "pkg": {
        "read": true,
        "write": true
      },
      "user": {
        "read": true,
        "write": true
      }
    }
  }
]
```

##### Registry Owner/Admin Persona

```json
[
  {
    "values": ["*"],
    "types": {
      "pkg": {
        "read": true,
        "write": true
      },
      {
        "user": {
          "read": true,
          "write": true
        }
      }
    }
  }
]
```
