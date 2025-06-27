import packageJson from '../package.json' with { type: 'json' }
import wranglerJson from '../wrangler.json' with { type: 'json' }

const version = packageJson.version
const dev = wranglerJson.dev

const localhost = {
  "url": `http://localhost:${dev.port}`,
  "description": "localhost"
}
const npm = {
  "url": "https://registry.npmjs.org",
  "description": "npm public registry"
}
const year = new Date().getFullYear()

export const API = {
  "openapi": "3.1.0",
  "servers": [ localhost ],
  "info": {
    "title": `vlt serverless registry`,
    "version": version,
    "license": {
      "identifier": "FSL-1.1-MIT",
      "name": "Functional Source License, Version 1.1, MIT Future License",
      "url": "https://fsl.software/FSL-1.1-MIT.template.md"
    },
    "description": `
  The **vlt serverless registry** is the modern JavaScript package registry.

  ### Compatible Clients

  <table>
    <tbody>
      <tr>
        <td><a href="https://vlt.sh" alt="vlt"><strong><code>vlt</code></strong></a></td>
        <td><a href="https://npmjs.com/package/npm" alt="npm"><strong><code>npm</code></strong></a></td>
        <td><a href="https://yarnpkg.com/" alt="yarn"><strong><code>yarn</code></strong></a></td>
        <td><a href="https://pnpm.io/" alt="pnpm"><strong><code>pnpm</code></strong></a></td>
        <td><a href="https://deno.com/" alt="deno"><strong><code>deno</code></strong></a></td>
        <td><a href="https://bun.sh/" alt="bun"><strong><code>bun</code></strong></a></td>
      </tr>
    </tbody>
  </table>

  ### Features

  <ul alt="features">
    <li>Backwards compatible with npm & npm clients</li>
    <li>Granular access control</li>
    <li>Proxying upstream registries when configured</li>
    <li>Package integrity validation for enhanced security</li>
    <li>Minimized JSON responses when header set<br><code>Accept: application/vnd.npm.install-v1+json</code></li>
    <li>Manifest slimming for performance</li>
    <li>Manifest confusion checks on published packages</li>
    <li>Semver range resolution for package manifests</li>
    <li>Support for URL-encoded complex semver ranges<br><code>%3E%3D1.0.0%20%3C2.0.0</code> for <code>>=1.0.0 &lt;2.0.0</code></li>
    <li>Dist-tag management for package versions</li>
    <li>Protected "latest" dist-tag which cannot be deleted</li>
    <li>Dist-tag operations restricted on proxied packages</li>
  </ul>

  ### Resources

  <ul alt="resources">
    <li><a href="https://vlt.sh">https://<strong>vlt.sh</strong></a></li>
    <li><a href="https://github.com/vltpkg/vsr">https://github.com/<strong>vltpkg/vsr</strong></a></li>
    <li><a href="https://discord.gg/vltpkg">https://discord.gg/<strong>vltpkg</strong></a></li>
    <li><a href="https://x.com/vltpkg">https://x.com/<strong>vltpkg</strong></a></li>
  </ul>

  ##### Trademark Disclaimer

  <p alt="trademark-disclaimer">All trademarks, logos and brand names are the property of their respective owners. All company, product and service names used in this website are for identification purposes only. Use of these names, trademarks and brands does not imply endorsement.</p>

  ### License

<details alt="license">
  <summary><strong>Functional Source License</strong>, Version 1.1, MIT Future License</summary>
<h1>Functional Source License,<br />Version 1.1,<br />MIT Future License</h1>
<h2>Abbreviation</h2>

FSL-1.1-MIT

<h2>Notice</h2>

Copyright ${year} vlt technology inc.

<h2>Terms and Conditions</h2>

<h3>Licensor ("We")</h3>

The party offering the Software under these Terms and Conditions.

<h3>The Software</h3>

The "Software" is each version of the software that we make available under
these Terms and Conditions, as indicated by our inclusion of these Terms and
Conditions with the Software.

<h3>License Grant</h3>

Subject to your compliance with this License Grant and the Patents,
Redistribution and Trademark clauses below, we hereby grant you the right to
use, copy, modify, create derivative works, publicly perform, publicly display
and redistribute the Software for any Permitted Purpose identified below.

<h3>Permitted Purpose</h3>

A Permitted Purpose is any purpose other than a Competing Use. A Competing Use
means making the Software available to others in a commercial product or
service that:

1. substitutes for the Software;

2. substitutes for any other product or service we offer using the Software
  that exists as of the date we make the Software available; or

3. offers the same or substantially similar functionality as the Software.

Permitted Purposes specifically include using the Software:

1. for your internal use and access;

2. for non-commercial education;

3. for non-commercial research; and

4. in connection with professional services that you provide to a licensee
  using the Software in accordance with these Terms and Conditions.

<h3>Patents</h3>

To the extent your use for a Permitted Purpose would necessarily infringe our
patents, the license grant above includes a license under our patents. If you
make a claim against any party that the Software infringes or contributes to
the infringement of any patent, then your patent license to the Software ends
immediately.

<h3>Redistribution</h3>

The Terms and Conditions apply to all copies, modifications and derivatives of
the Software.

If you redistribute any copies, modifications or derivatives of the Software,
you must include a copy of or a link to these Terms and Conditions and not
remove any copyright notices provided in or with the Software.

<h3>Disclaimer</h3>

THE SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF FITNESS FOR A PARTICULAR
PURPOSE, MERCHANTABILITY, TITLE OR NON-INFRINGEMENT.

IN NO EVENT WILL WE HAVE ANY LIABILITY TO YOU ARISING OUT OF OR RELATED TO THE
SOFTWARE, INCLUDING INDIRECT, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES,
EVEN IF WE HAVE BEEN INFORMED OF THEIR POSSIBILITY IN ADVANCE.

<h3>Trademarks</h3>

Except for displaying the License Details and identifying us as the origin of
the Software, you have no right under these Terms and Conditions to use our
trademarks, trade names, service marks or product names.

<h2>Grant of Future License</h2>

We hereby irrevocably grant you an additional license to use the Software under
the MIT license that is effective on the second anniversary of the date we make
the Software available. On or after that date, you may use the Software under
the MIT license, in which case the following will apply:

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
</dialog>
  `
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "Bearer <token>"
      },
      "basicAuth": {
        "type": "http",
        "scheme": "basic"
      },
      "apiKeyHeader": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      },
      "apiKeyQuery": {
        "type": "apiKey",
        "in": "query",
        "name": "api_key"
      },
      "apiKeyCookie": {
        "type": "apiKey",
        "in": "cookie",
        "name": "api_key"
      },
      "oAuth2": {
        "type": "oauth2",
        "flows": {
          "authorizationCode": {
            "authorizationUrl": "https://galaxy.scalar.com/oauth/authorize",
            "tokenUrl": "https://galaxy.scalar.com/oauth/token",
            "scopes": {
              "read:account": "read your account information",
              "write:planets": "modify planets in your account",
              "read:planets": "read your planets"
            }
          },
          "clientCredentials": {
            "tokenUrl": "https://galaxy.scalar.com/oauth/token",
            "scopes": {
              "read:account": "read your account information",
              "write:planets": "modify planets in your account",
              "read:planets": "read your planets"
            }
          },
          "implicit": {
            "authorizationUrl": "https://galaxy.scalar.com/oauth/authorize",
            "scopes": {
              "read:account": "read your account information",
              "write:planets": "modify planets in your account",
              "read:planets": "read your planets"
            }
          },
          "password": {
            "tokenUrl": "https://galaxy.scalar.com/oauth/token",
            "scopes": {
              "read:account": "read your account information",
              "write:planets": "modify planets in your account",
              "read:planets": "read your planets"
            }
          }
        }
      }
    },
    "parameters": {
      "minimalJsonHeader": {
        "name": "Accept",
        "in": "header",
        "description": "Set to 'application/vnd.npm.install-v1+json' to receive minimal JSON responses without pretty-printing",
        "required": false,
        "schema": {
          "type": "string",
          "default": "application/json",
          "enum": [
            "application/json",
            "application/vnd.npm.install-v1+json"
          ]
        }
      },
      "planetId": {
        "name": "planetId",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "format": "int64",
          "examples": [
            1
          ]
        }
      },
      "limit": {
        "name": "limit",
        "in": "query",
        "description": "The number of items to return",
        "required": false,
        "schema": {
          "type": "integer",
          "format": "int64",
          "default": 10
        }
      },
      "offset": {
        "name": "offset",
        "in": "query",
        "description": "The number of items to skip before starting to collect the result set",
        "required": false,
        "schema": {
          "type": "integer",
          "format": "int64",
          "default": 0
        }
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Bad Request",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Forbidden": {
        "description": "Forbidden",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "NotFound": {
        "description": "NotFound",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Unauthorized",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "tags": [
    {
      "name": "Users",
      "description": "Some endpoints are public, but some require authentication. We provide all the required endpoints to create an account and authorize yourself."
    },
    {
      "name": "Tokens",
      "description": ""
    },
    {
      "name": "Access",
      "description": "Endpoints related to package access management"
    },
    {
      "name": "Packages",
      "description": "Package-related endpoints with enhanced features including consistent packument responses, manifest slimming to exclude sensitive data, and integrity validation for package tarballs. All endpoints are compatible with npm, yarn, pnpm, and other package managers."
    },
    {
      "name": "Dist-Tags",
      "description": "Endpoints for managing package distribution tags, including listing, adding, updating, and removing tags. The 'latest' tag is protected and cannot be deleted."
    },
    {
      "name": "Search",
      "description": "Endpoints for searching packages using text search."
    },
    {
      "name": "Misc.",
      "description": ""
    }
  ],
  "paths": {
    "/-/user": {
      "get": {
        "tags": ["Users"],
        "summary": "Get User Profile",
        "description": `Returns profile object associated with auth token
\`\`\`bash
$ npm profile
name: johnsmith
created: 2015-02-26T01:26:01.124Z
updated: 2023-01-10T21:55:32.118Z
\`\`\``,
        "parameters": [
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "User Profile",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "name": "johnsmith"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/-/ping": {
      "get": {
        "tags": ["Misc."],
        "summary": "Ping",
        "description": `Check if the server is alive
\`\`\`bash
$ npm ping
npm notice PING http://localhost:1337/
npm notice PONG 13ms
\`\`\``,
        "parameters": [
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "security": [],
        "responses": {
          "200": {
            "description": "Server is alive",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {}
                }
              }
            }
          }
        }
      }
    },

    "/": {
      "get": {
        "tags": ["Misc."],
        "summary": "Documentation",
        "description": "Get the registry docs",
        "responses": {
          "200": {
            "description": "Retrieves the registry docs",
          }
        }
      }
    },
    "/-/whoami": {
      "get": {
        "tags": ["Users"],
        "summary": "Get User Username",
        "description": `Returns username associated with auth token
\`\`\`bash
$ npm whoami
johnsmith
\`\`\``,
        "parameters": [
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Retrieves a user name",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "username": "johnsmith"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/-/tokens": {
      "get": {
        "tags": ["Tokens"],
        "summary": "Get Token Profile",
        "description": `Get tokens for the associative authenticated user

\`\`\`bash
$ npm token list
<token-type> token <partial-token>… with id <uuid> created <date-created>
\`\`\``,
        "parameters": [
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Token Profile",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "objects": [
                      {
                        "cidr_whitelist": null,
                        "readonly": false,
                        "automation": null,
                        "created": null,
                        "updated": null,
                        "scope": [
                          {
                            "values": [
                              "*"
                            ],
                            "types": {
                              "pkg": {
                                "read": true,
                                "write": true
                              }
                            }
                          },
                          {
                            "values": [
                              "*"
                            ],
                            "types": {
                              "user": {
                                "read": true,
                                "write": true
                              }
                            }
                          }
                        ],
                        "key": "fff00131-d831-4517-84c0-1b53b1c85ba9",
                        "token": "a67a46ad-fe51-4fde-94fe-c56ee00fd638"
                      }
                    ],
                    "urls": {}
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": ["Tokens"],
        "summary": "Create Token",
        "description": "Creates a token for authenticated user or provided UUID user (later requires global read+write user scope)",
        "parameters": [
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "headers": {
          "Authorization": {
            "description": "The number of allowed requests in the current period",
            "schema": {
              "type": "Authorization",
              "bearerFormat": "Bearer <token>"
            }
          }
        },
        "requestBody": {
          "description": "Scope of access/scopes for the new token",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "example": {
                  "uuid": "admin",
                  "scope": [
                    {
                      "values": ["*"],
                      "types": { "pkg": { "read": true, "write": false }}
                    },
                    {
                      "values": [
                        "~admin"
                      ],
                      "types": {
                        "user": {
                          "read": true,
                          "write": true
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Token created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": {
                    "uuid": "admin",
                    "token": "1ef5f713-15ff-6491-b62d-d16f6f04e6ac",
                    "scope": [
                      {
                        "values": [
                          "*"
                        ],
                        "types": {
                          "pkg": {
                            "read": true,
                            "write": false
                          }
                        }
                      },
                      {
                        "values": [
                          "~admin"
                        ],
                        "types": {
                          "user": {
                            "read": true,
                            "write": true
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": ["Tokens"],
        "summary": "Update Token",
        "description": "Update a token by the token itself",
        "parameters": [
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Token updated"
          }
        }
      },
      "delete": {
        "tags": ["Tokens"],
        "summary": "Delete Token by Auth",
        "description": `Revokes a token for the associative authenticated user

\`\`\`bash
$ npm token revoke <token>
\`\`\``,
        "responses": {
          "204": {
            "description": "Token Deleted Response"
          }
        }
      }
    },
    "/-/tokens/token/{token}": {
      "delete": {
        "tags": ["Tokens"],
        "summary": "Delete Token by ID",
        "description": "Delete a token by the token ID",
        "parameters": [
          {
            "in": "path",
            "name": "token",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "Token deleted"
          }
        }
      }
    },
    "/{scope}/{pkg}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Scoped Package Packument",
        "description": "Returns all published packages & metadata for the specific scoped package with a consistent packument structure including name, dist-tags, versions, and time fields",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (with @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          },
          {
            "in": "query",
            "name": "versionRange",
            "required": false,
            "schema": {
              "type": "string"
            },
            "description": "Semver range to filter package versions"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Package packument",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "The package name with scope"
                    },
                    "dist-tags": {
                      "type": "object",
                      "description": "Distribution tags, mapping tag names to versions",
                      "properties": {
                        "latest": {
                          "type": "string",
                          "description": "The latest version"
                        }
                      },
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "versions": {
                      "type": "object",
                      "description": "All package versions with slimmed manifests",
                      "additionalProperties": {
                        "type": "object"
                      }
                    },
                    "time": {
                      "type": "object",
                      "description": "Timestamps for package modifications and version publications",
                      "properties": {
                        "modified": {
                          "type": "string",
                          "format": "date-time"
                        }
                      },
                      "additionalProperties": {
                        "type": "string",
                        "format": "date-time"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found"
          }
        }
      },
      "put": {
        "tags": ["Packages"],
        "summary": "Publish Scoped Package",
        "description": "Publishes a scoped package by storing the full manifest in the database while returning a slimmed version that excludes sensitive data. The stored package includes proper versioning and integrity information.",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (with @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          }
        ],
        "requestBody": {
          "description": "Package data",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "version"],
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Package name with scope"
                  },
                  "version": {
                    "type": "string",
                    "description": "Package version"
                  },
                  "description": {
                    "type": "string",
                    "description": "Package description"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Package published",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "manifest": {
                      "type": "object",
                      "description": "Slimmed version of the published manifest"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request"
          },
          "409": {
            "description": "Conflict"
          }
        }
      }
    },
    "/{pkg}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Packument",
        "description": "Returns all published packages & metadata for the specific package with a consistent packument structure including name, dist-tags, versions, and time fields.",
        "operationId": "getPackagePackument",
        "parameters": [
          {
            "name": "pkg",
            "in": "path",
            "required": true,
            "description": "Package name",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "versionRange",
            "required": false,
            "schema": {
              "type": "string"
            },
            "description": "Semver range to filter package versions"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Package packument",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "Package name"
                    },
                    "dist-tags": {
                      "type": "object",
                      "description": "Distribution tags, mapping tag names to versions",
                      "properties": {
                        "latest": {
                          "type": "string",
                          "description": "The latest version"
                        }
                      },
                      "additionalProperties": {
                        "type": "string"
                      }
                    },
                    "versions": {
                      "type": "object",
                      "description": "All package versions with slimmed manifests",
                      "additionalProperties": {
                        "type": "object"
                      }
                    },
                    "time": {
                      "type": "object",
                      "description": "Timestamps for package modifications and version publications",
                      "properties": {
                        "modified": {
                          "type": "string",
                          "format": "date-time"
                        }
                      },
                      "additionalProperties": {
                        "type": "string",
                        "format": "date-time"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Package not found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": ["Packages"],
        "summary": "Publish Package",
        "description": "Publishes a package by storing the full manifest in the database while returning a slimmed version that excludes sensitive data. The stored package includes proper versioning and integrity information.",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name"
          }
        ],
        "requestBody": {
          "description": "Package data",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "version"],
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Package name"
                  },
                  "version": {
                    "type": "string",
                    "description": "Package version"
                  },
                  "description": {
                    "type": "string",
                    "description": "Package description"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Package published",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "name": {
                      "type": "string"
                    },
                    "version": {
                      "type": "string"
                    },
                    "manifest": {
                      "type": "object",
                      "description": "Slimmed version of the published manifest"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request"
          },
          "409": {
            "description": "Conflict"
          }
        }
      }
    },
    "/{scope}/{pkg}/{version}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Scoped Package Manifest",
        "description": "Returns the slimmed package manifest for a specific scoped package version with consistent fields and without sensitive data. Supports explicit versions, dist tags, semver ranges, and URL-encoded complex range (e.g., %3E%3D1.0.0%20%3C2.0.0 for '>=1.0.0 <2.0.0')",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (with @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          },
          {
            "in": "path",
            "name": "version",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package version. Can be an explicit version (e.g., 1.0.0), dist tag (e.g., latest), semver range (e.g., >=1.0.0), or URL-encoded complex range (e.g., %3E%3D1.0.0%20%3C2.0.0 for '>=1.0.0 <2.0.0')"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Package manifest",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "Package name"
                    },
                    "version": {
                      "type": "string",
                      "description": "Package version"
                    },
                    "description": {
                      "type": "string",
                      "description": "Package description"
                    },
                    "dist": {
                      "type": "object",
                      "description": "Distribution information",
                      "properties": {
                        "tarball": {
                          "type": "string",
                          "description": "URL to the package tarball"
                        },
                        "shasum": {
                          "type": "string",
                          "description": "SHA-1 hash of the tarball"
                        },
                        "integrity": {
                          "type": "string",
                          "description": "SRI integrity hash of the tarball"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found"
          }
        }
      }
    },
    "/{pkg}/{version}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Manifest",
        "description": "Returns the package manifest for a specific version. Supports explicit versions (e.g., 1.0.0), dist tags (e.g., latest), semver ranges (e.g., >=1.0.0, *), and URL-encoded complex semver ranges with spaces and special characters.",
        "operationId": "getPackageManifest",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name"
          },
          {
            "in": "path",
            "name": "version",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package version. Can be an explicit version (e.g., 1.0.0), dist tag (e.g., latest), semver range (e.g., >=1.0.0), or URL-encoded complex range (e.g., %3E%3D1.0.0%20%3C2.0.0 for '>=1.0.0 <2.0.0')"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Package manifest",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "Package name"
                    },
                    "version": {
                      "type": "string",
                      "description": "Package version"
                    },
                    "description": {
                      "type": "string",
                      "description": "Package description"
                    },
                    "dist": {
                      "type": "object",
                      "description": "Distribution information",
                      "properties": {
                        "tarball": {
                          "type": "string",
                          "description": "URL to the package tarball"
                        },
                        "shasum": {
                          "type": "string",
                          "description": "SHA-1 hash of the tarball"
                        },
                        "integrity": {
                          "type": "string",
                          "description": "SRI integrity hash of the tarball"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found"
          }
        }
      }
    },
    "/{scope}/{pkg}/-/{tarball}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Scoped Package Tarball",
        "description": "Retrieves the scoped package tarball with support for integrity validation",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (with @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          },
          {
            "in": "path",
            "name": "tarball",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tarball filename"
          },
          {
            "in": "header",
            "name": "accepts-integrity",
            "required": false,
            "schema": {
              "type": "string"
            },
            "description": "SRI integrity hash for validation"
          }
        ],
        "responses": {
          "200": {
            "description": "Package tarball",
            "content": {
              "application/octet-stream": {
                "schema": {
                  "type": "string",
                  "format": "binary"
                }
              }
            }
          },
          "400": {
            "description": "Integrity validation failed",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Integrity check failed"
                    },
                    "code": {
                      "type": "string",
                      "example": "EINTEGRITY"
                    },
                    "expected": {
                      "type": "string",
                      "example": "sha512-abcdefghijklmnopqrstuvwxyz0123456789"
                    },
                    "actual": {
                      "type": "string",
                      "example": "sha512-differenthashvaluefortestingwhenthingsdonotmatch"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found"
          }
        }
      }
    },
    "/{pkg}/-/{tarball}": {
      "get": {
        "tags": ["Packages"],
        "summary": "Get Package Tarball",
        "description": "Retrieves the package tarball with support for integrity validation",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name"
          },
          {
            "in": "path",
            "name": "tarball",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tarball filename"
          },
          {
            "in": "header",
            "name": "accepts-integrity",
            "required": false,
            "schema": {
              "type": "string"
            },
            "description": "SRI integrity hash for validation"
          }
        ],
        "responses": {
          "200": {
            "description": "Package tarball",
            "content": {
              "application/octet-stream": {
                "schema": {
                  "type": "string",
                  "format": "binary"
                }
              }
            }
          },
          "400": {
            "description": "Integrity validation failed",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Integrity check failed"
                    },
                    "code": {
                      "type": "string",
                      "example": "EINTEGRITY"
                    },
                    "expected": {
                      "type": "string",
                      "example": "sha512-abcdefghijklmnopqrstuvwxyz0123456789"
                    },
                    "actual": {
                      "type": "string",
                      "example": "sha512-differenthashvaluefortestingwhenthingsdonotmatch"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found"
          }
        }
      }
    },
    "/-/package/{pkg}/dist-tags": {
      "get": {
        "tags": ["Dist-Tags"],
        "summary": "List Dist-Tags",
        "description": "Lists all dist-tags for a given package",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Map of dist-tags to versions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "string"
                  },
                  "example": {
                    "latest": "1.0.0",
                    "beta": "1.1.0-beta.1"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Package not found"
          }
        }
      }
    },

    "/-/package/{pkg}/dist-tags/{tag}": {
      "get": {
        "tags": ["Dist-Tags"],
        "summary": "Get Specific Dist-Tag",
        "description": "Gets a specific dist-tag for a given package",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name"
          },
          {
            "in": "path",
            "name": "tag",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tag name"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Version for the specified tag",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "1.0.0"
                }
              }
            }
          },
          "404": {
            "description": "Package or tag not found"
          }
        }
      },
      "put": {
        "tags": ["Dist-Tags"],
        "summary": "Add/Update Dist-Tag",
        "description": "Adds or updates a dist-tag for a given package",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name"
          },
          {
            "in": "path",
            "name": "tag",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tag name"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "requestBody": {
          "description": "Version to tag",
          "required": true,
          "content": {
            "text/plain": {
              "schema": {
                "type": "string",
                "example": "1.0.0"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Updated map of dist-tags to versions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "string"
                  },
                  "example": {
                    "latest": "1.0.0",
                    "beta": "1.1.0-beta.1"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Package or version not found"
          }
        }
      },
      "delete": {
        "tags": ["Dist-Tags"],
        "summary": "Delete Dist-Tag",
        "description": "Deletes a dist-tag for a given package. The 'latest' tag cannot be deleted.",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name"
          },
          {
            "in": "path",
            "name": "tag",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tag name"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Updated map of dist-tags to versions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "string"
                  },
                  "example": {
                    "latest": "1.0.0"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request, e.g., attempting to delete the 'latest' tag"
          },
          "404": {
            "description": "Package or tag not found"
          }
        }
      }
    },

    "/-/package/@{scope}/{pkg}/dist-tags": {
      "get": {
        "tags": ["Dist-Tags"],
        "summary": "List Dist-Tags (Scoped Package)",
        "description": "Lists all dist-tags for a given scoped package",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (without @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Map of dist-tags to versions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "string"
                  },
                  "example": {
                    "latest": "1.0.0",
                    "beta": "1.1.0-beta.1"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Package not found"
          }
        }
      }
    },

    "/-/package/@{scope}/{pkg}/dist-tags/{tag}": {
      "get": {
        "tags": ["Dist-Tags"],
        "summary": "Get Specific Dist-Tag (Scoped Package)",
        "description": "Gets a specific dist-tag for a given scoped package",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (without @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          },
          {
            "in": "path",
            "name": "tag",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tag name"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Version for the specified tag",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "1.0.0"
                }
              }
            }
          },
          "404": {
            "description": "Package or tag not found"
          }
        }
      },
      "put": {
        "tags": ["Dist-Tags"],
        "summary": "Add/Update Dist-Tag (Scoped Package)",
        "description": "Adds or updates a dist-tag for a given scoped package",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (without @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          },
          {
            "in": "path",
            "name": "tag",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tag name"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "requestBody": {
          "description": "Version to tag",
          "required": true,
          "content": {
            "text/plain": {
              "schema": {
                "type": "string",
                "example": "1.0.0"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Updated map of dist-tags to versions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "string"
                  },
                  "example": {
                    "latest": "1.0.0",
                    "beta": "1.1.0-beta.1"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Package or version not found"
          }
        }
      },
      "delete": {
        "tags": ["Dist-Tags"],
        "summary": "Delete Dist-Tag (Scoped Package)",
        "description": "Deletes a dist-tag for a given scoped package. The 'latest' tag cannot be deleted.",
        "parameters": [
          {
            "in": "path",
            "name": "scope",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package scope (without @ prefix)"
          },
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name without scope"
          },
          {
            "in": "path",
            "name": "tag",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Tag name"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Updated map of dist-tags to versions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "string"
                  },
                  "example": {
                    "latest": "1.0.0"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request, e.g., attempting to delete the 'latest' tag"
          },
          "404": {
            "description": "Package or tag not found"
          }
        }
      }
    },
    "/-/package/{pkg}/access": {
      "get": {
        "tags": ["Access"],
        "summary": "Get Package Access Status",
        "description": "Returns the access status of a package (private or public)",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name (including scope if applicable)"
          }
        ],
        "responses": {
          "200": {
            "description": "Package access status",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "enum": ["private", "public"],
                      "description": "Access status of the package"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Insufficient permissions"
          },
          "404": {
            "description": "Package not found"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "basicAuth": []
          }
        ]
      },
      "put": {
        "tags": ["Access"],
        "summary": "Set Package Access Status",
        "description": "Sets the access status of a package to private or public. Currently, only private access is supported.",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name (including scope if applicable)"
          }
        ],
        "requestBody": {
          "description": "Access status to set",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["status"],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": ["private", "public"],
                    "description": "Desired access status"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Package access status updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "enum": ["private", "public"],
                      "description": "New access status of the package"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Insufficient permissions"
          },
          "404": {
            "description": "Package not found"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "basicAuth": []
          }
        ]
      }
    },
    "/-/package/list": {
      "get": {
        "tags": ["Access"],
        "summary": "List User Packages",
        "description": "Lists packages a user has access to",
        "parameters": [
          {
            "in": "query",
            "name": "user",
            "required": false,
            "schema": {
              "type": "string"
            },
            "description": "Username to list packages for. If not specified, returns packages for the authenticated user."
          }
        ],
        "responses": {
          "200": {
            "description": "List of packages with access details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string",
                        "description": "Package name"
                      },
                      "permission": {
                        "type": "string",
                        "enum": ["read-only", "read-write"],
                        "description": "User's permission level"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Insufficient permissions"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "basicAuth": []
          }
        ]
      }
    },
    "/-/package/{pkg}/collaborators/{username}": {
      "put": {
        "tags": ["Access"],
        "summary": "Grant Package Access",
        "description": "Grants access to a package for a user",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name (including scope if applicable)"
          },
          {
            "in": "path",
            "name": "username",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Username to grant access to"
          }
        ],
        "requestBody": {
          "description": "Permission level to grant",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["permission"],
                "properties": {
                  "permission": {
                    "type": "string",
                    "enum": ["read-only", "read-write"],
                    "description": "Permission level to grant"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Access granted successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "Package name"
                    },
                    "collaborators": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string",
                        "enum": ["read-only", "read-write"]
                      },
                      "description": "Map of usernames to permission levels"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Insufficient permissions"
          },
          "404": {
            "description": "Package not found or user not found"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "basicAuth": []
          }
        ]
      },
      "delete": {
        "tags": ["Access"],
        "summary": "Revoke Package Access",
        "description": "Revokes a user's access to a package",
        "parameters": [
          {
            "in": "path",
            "name": "pkg",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Package name (including scope if applicable)"
          },
          {
            "in": "path",
            "name": "username",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Username to revoke access from"
          }
        ],
        "responses": {
          "200": {
            "description": "Access revoked successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "Package name"
                    },
                    "collaborators": {
                      "type": "object",
                      "additionalProperties": {
                        "type": "string",
                        "enum": ["read-only", "read-write"]
                      },
                      "description": "Map of remaining usernames to permission levels"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Insufficient permissions"
          },
          "404": {
            "description": "Package not found or user not found"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "basicAuth": []
          }
        ]
      }
    },
    "/-/search": {
      "get": {
        "tags": ["Search"],
        "summary": "Search Packages",
        "description": "Search for packages by text query. Returns packages matching the search criteria.",
        "parameters": [
          {
            "in": "query",
            "name": "text",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Search text to find matching packages"
          },
          {
            "$ref": "#/components/parameters/minimalJsonHeader"
          }
        ],
        "security": [],
        "responses": {
          "200": {
            "description": "Search results",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string",
                        "description": "Package name"
                      },
                      "tags": {
                        "type": "object",
                        "description": "Distribution tags for the package",
                        "additionalProperties": {
                          "type": "string"
                        },
                        "example": {
                          "latest": "1.0.0"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request, e.g., missing text parameter",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Query parameter is required"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
