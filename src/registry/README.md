# **vlt** serverless registry (`vsr`)

> A modern, npm-compatible serverless registry that's fast, secure,
> and ridiculously easy to deploy.

`vsr` is a minimal yet powerful npm-compatible registry that
replicates core npm features while adding cutting-edge capabilities.
Built for the modern web, it runs seamlessly on Cloudflare's global
edge network.

<img src="https://github.com/user-attachments/assets/e76c6f8a-a078-4787-963c-8ec95a879731" alt="vsr api screenshot" />

## 🚀 Quick Start

### Local Development

Get up and running in seconds:

```bash
# Try it locally
npx @vltpkg/vsr

# Or install globally
npm install -g @vltpkg/vsr
vsr
```

**Boom!** 💥 Your registry is live at `http://localhost:1337`

### Deploy to Production

Deploy to Cloudflare Workers with one command:

```bash
# Deploy to production
vsr deploy --env=prod

# Or preview what would be deployed
vsr deploy --dry-run --env=prod
```

**That's it!** 🎉 Your registry is now running globally on
Cloudflare's edge network.

## ✨ Why Choose VSR?

- **⚡ Blazing Fast**: Edge-optimized with global CDN distribution
- **🔐 Secure by Default**: Package integrity validation and granular
  access control
- **💰 Cost Effective**: Generous free tier on Cloudflare (100k
  requests/day)
- **🛠 npm Compatible**: Drop-in replacement for existing workflows
- **📦 Zero Config**: Works out of the box, configure when you need to
- **🌍 Global Scale**: Deploy worldwide in under 5 minutes

## 🎯 Perfect For

- **Teams** who need private package management
- **Organizations** requiring granular access control
- **Developers** wanting fast, reliable package hosting
- **Companies** needing npm-compatible enterprise solutions

## 🏃‍♂️ Getting Started

### Local Development

```bash
# Start with defaults (port 1337)
vsr

# Or explicitly use dev command
vsr dev

# Custom port
vsr --port 3000

# Enable debug mode
vsr --debug

# Use config file
vsr --config ./vlt.json
```

### Production Deployment

Deploy to Cloudflare Workers in under 5 minutes:

#### Option 1: Using VSR Deploy Command (Recommended)

```bash
# Clone and setup
git clone https://github.com/vltpkg/vsr.git
cd vsr
vlt install

# Deploy to development environment
vsr deploy

# Deploy to production
vsr deploy --env=prod

# Preview deployment configuration
vsr deploy --dry-run --env=prod
```

#### Option 2: Using Wrangler Directly

```bash
# Clone and setup
git clone https://github.com/vltpkg/vsr.git
cd vsr
vlt install

# Deploy to production
wrangler deploy
```

The VSR deploy command offers better configuration management,
environment-specific settings, and integration with your `vlt.json`
configuration.

**Coming Soon**: One-click Cloudflare deployment button! 🎉

<img src="https://github.com/user-attachments/assets/528deda2-4c20-44c9-b057-f07c2e2e3c71" alt="Deploy to Cloudflare Workers" width="200" />

## ⚙️ Configuration

VSR is designed to work with zero configuration, but when you need
more control:

### Commands

| Command  | Description                        |
| -------- | ---------------------------------- |
| `dev`    | Start development server (default) |
| `deploy` | Deploy to Cloudflare Workers       |

### CLI Options

| Option     | Alias | Default | Description             |
| ---------- | ----- | ------- | ----------------------- |
| `--port`   | `-p`  | `1337`  | Server port             |
| `--config` | `-c`  | -       | Config file path        |
| `--debug`  | `-d`  | `false` | Debug mode              |
| `--daemon` | -     | `true`  | Local filesystem daemon |
| `--help`   | `-h`  | -       | Show help               |

### Deploy Options

| Option          | Default | Description                    |
| --------------- | ------- | ------------------------------ |
| `--env`         | `dev`   | Environment (dev/staging/prod) |
| `--db-name`     | -       | Override D1 database name      |
| `--bucket-name` | -       | Override R2 bucket name        |
| `--queue-name`  | -       | Override queue name            |
| `--dry-run`     | `false` | Preview deployment             |

### Advanced Configuration

Create a `vlt.json` file for shared configuration between VLT and VSR:

```json
{
  "registry": {
    "port": 4000,
    "debug": true,
    "telemetry": false,
    "deploy": {
      "sentry": {
        "dsn": "https://your-sentry-dsn@sentry.io/project-id"
      },
      "environments": {
        "prod": {
          "databaseName": "vsr-prod-database",
          "bucketName": "vsr-prod-bucket",
          "queueName": "vsr-prod-cache-refresh-queue",
          "sentry": {
            "environment": "production"
          }
        }
      }
    }
  }
}
```

📚 **[Learn More About Configuration →](info/CONFIGURATION.md)**  
🚀 **[Deployment Guide →](DEPLOY.md)**

## 🌟 Key Features

### Core Registry Features

- ✅ **npm-compatible API** - Drop-in replacement
- ✅ **Semver range resolution** - Smart version handling
- ✅ **Scoped packages** - Full `@scope/package` support
- ✅ **Dist-tag management** - Version tagging and lifecycle
- ✅ **Search & discovery** - Find packages fast

### Security & Access Control

- 🔐 **[Granular access tokens](info/GRANULAR_ACCESS_TOKENS.md)** -
  Fine-grained permissions
- 🛡️ **Package integrity validation** - Tamper detection
- 🔒 **Manifest confusion protection** - Security by design

### Performance & Reliability

- ⚡ **Edge-optimized responses** - Global performance
- 📦 **Minimal JSON responses** - Faster installs
- 🔄 **Background data refresh** - Always up-to-date
- 🌐 **Upstream proxying** - Seamless package access

### Developer Experience

- 📖 **Interactive API docs** - Built-in Scalar documentation
- 🛠️ **Rich CLI interface** - Powerful command-line tools
- ⚙️ **Flexible configuration** - Adapt to your workflow

## 📊 How It Compares

VSR stands out in the registry landscape:

- **vs npm**: Private, customizable, edge-deployed
- **vs Verdaccio**: Serverless, zero-maintenance, global scale
- **vs GitHub Packages**: More flexible, better performance
- **vs Enterprise solutions**: Open source, cost-effective

📈 **[See Detailed Comparisons →](info/COMPARISONS.md)**

## 💻 Requirements

### Production

- **Cloudflare Account** (free tier available)
  - Workers: 100k requests/day
  - D1 Database: 5GB storage + 5M reads/day
  - R2 Storage: 10GB + 10M reads/day

### Development

- Node.js (latest LTS)
- VLT package manager
- Git

## 🔗 API Access

Once running, access your registry:

- **Registry API**: `http://localhost:1337`
- **Interactive Docs**: `http://localhost:1337/-/docs`
- **Filesystem Daemon**: `http://localhost:3000` (if enabled)

The API includes complete npm compatibility plus enhanced features
like URL-encoded semver ranges and optimized install responses.

## 🛣️ What's Next?

We're actively developing exciting features:

- 🌐 **Web UI** for package management
- 👥 **User management** with web authentication
- 🏢 **Enterprise features** and integrations
- 📊 **Analytics & insights** dashboard

🗺️ **[View Full Roadmap →](info/ROADMAP.md)**

## 🤝 Contributing

We welcome contributions! VSR is built with modern tools and follows
best practices:

- **TypeScript** for type safety
- **Comprehensive testing** with 100% coverage
- **Clean architecture** with separated concerns
- **Detailed documentation** and examples

🔧 **[Contributing Guide →](info/CONTRIBUTING.md)**

## 📚 Documentation

- **[Configuration Guide](info/CONFIGURATION.md)** - Advanced setup
  and options
- **[Deployment Guide](DEPLOY.md)** - Deploy to Cloudflare Workers
- **[Access Control](info/GRANULAR_ACCESS_TOKENS.md)** - Security and
  permissions
- **[Testing Guide](info/TESTING.md)** - Running and writing tests
- **[Project Structure](info/PROJECT_STRUCTURE.md)** - Codebase
  overview
- **[Database Setup](info/DATABASE_SETUP.md)** - Storage configuration

## 💬 Support

Need help? We've got you covered:

- 📖 **Documentation** - Comprehensive guides and examples
- 🐛 **Issues** - Report bugs and request features
- 💬 **Discussions** - Community support and questions

🆘 **[Get Support →](info/USER_SUPPORT.md)**

## 📄 License

VSR is licensed under the
**[Functional Source License](https://fsl.software)**
([FSL-1.1-MIT](LICENSE.md)) - free for most use cases, with commercial
restrictions that convert to MIT after two years.

---

**Ready to revolutionize your package management?** 🚀  
[Get started](#-quick-start) •
[Deploy to production](#production-deployment) •
[Join the community](info/USER_SUPPORT.md)
