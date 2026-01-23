# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

As SpecCheck is currently in active development, security updates are applied to the latest version only.

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to the maintainers with:

1. **Description**: A clear description of the vulnerability
2. **Impact**: The potential impact of the vulnerability
3. **Reproduction**: Steps to reproduce the issue
4. **Affected Components**: Which parts of the codebase are affected
5. **Suggested Fix**: If you have a suggested fix, please include it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will assess the vulnerability and determine severity
- **Communication**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical issues within 7 days
- **Credit**: We will credit you in our release notes (unless you prefer anonymity)

## Security Considerations

### On-Device Processing

SpecCheck is designed with privacy-first architecture:

- Camera frame processing occurs entirely on-device
- ML inference runs locally using TensorFlow Lite
- Images are never transmitted to external servers
- Only anonymized component identifiers are sent for LLM reasoning

### Data Handling

- **Local Data**: Scan history and cached datasheets are stored in local SQLite
- **Community Submissions**: User-submitted data is voluntary and contains only what users choose to share
- **No Tracking**: No purchase history, browsing data, or location tracking

### Backend Security

- API endpoints are rate-limited
- Authentication required for write operations
- Input validation on all endpoints
- No sensitive data stored without encryption

### Third-Party Services

- Cloudflare Workers for serverless backend
- Supabase for community database
- Claude API for LLM reasoning (receives only component IDs, not images)

## Security Best Practices for Contributors

When contributing to SpecCheck:

1. **Never commit secrets**: API keys, credentials, or tokens should never be in code
2. **Validate input**: All user input must be validated and sanitized
3. **Minimize data**: Only collect and transmit necessary data
4. **Use secure dependencies**: Keep dependencies updated and monitor for vulnerabilities
5. **Follow privacy principles**: Maintain the on-device-first approach

## Dependency Security

We use automated tools to monitor dependencies:

- Regular `npm audit` checks
- Dependency updates tracked in pull requests
- Known vulnerabilities addressed promptly

## Scope

This security policy applies to:

- The SpecCheck mobile application (`apps/mobile`)
- The SpecCheck backend API (`apps/backend`)
- Shared type definitions (`packages/shared-types`)
- Official documentation and configurations

Out of scope:
- Third-party dependencies (report to their respective maintainers)
- User-submitted community content
- Unofficial forks or modifications

## Security Updates

Security updates will be announced through:

- GitHub Security Advisories
- Release notes in CHANGELOG.md
- GitHub Discussions (for non-critical updates)

Thank you for helping keep SpecCheck and its users safe.
