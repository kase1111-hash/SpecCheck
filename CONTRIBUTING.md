# Contributing to SpecCheck

Thank you for your interest in contributing to SpecCheck! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- For mobile development: Expo CLI, iOS Simulator (macOS) or Android Emulator

### Setting Up the Development Environment

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/SpecCheck.git
   cd SpecCheck
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build shared types:
   ```bash
   npm run types:build
   ```

4. Start the mobile app:
   ```bash
   npm run mobile:start
   ```

5. Start the backend development server:
   ```bash
   npm run backend:dev
   ```

## Project Structure

This is a monorepo with the following structure:

- `apps/mobile` - React Native/Expo mobile application
- `apps/backend` - Cloudflare Workers backend
- `packages/shared-types` - Shared TypeScript type definitions
- `docs/` - Project documentation

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
- Check existing issues to avoid duplicates
- Gather relevant information (device, OS version, app version)

When submitting a bug report:
- Use a clear, descriptive title
- Describe the steps to reproduce the issue
- Include expected vs actual behavior
- Attach screenshots or logs if applicable

### Suggesting Features

Feature requests are welcome! When suggesting a feature:
- Explain the problem your feature would solve
- Describe the proposed solution
- Consider how it fits with SpecCheck's core mission: verifying tech claims

### Submitting Code Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards (see below)

3. **Write or update tests** for your changes

4. **Run the test suite**:
   ```bash
   npm run test
   ```

5. **Run linting**:
   ```bash
   npm run lint
   ```

6. **Commit your changes** with a clear commit message:
   ```bash
   git commit -m "Add: brief description of your change"
   ```

7. **Push to your fork** and create a Pull Request

### Commit Message Format

Use clear, descriptive commit messages:

- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for updates to existing features
- `Remove:` for removed features or code
- `Docs:` for documentation changes
- `Test:` for test-related changes
- `Refactor:` for code refactoring

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define types in `packages/shared-types` for shared structures
- Avoid `any` types; use proper typing

### Code Style

- Run `npm run lint` before committing
- Follow existing patterns in the codebase
- Keep functions focused and small
- Add comments for complex logic

### Testing

- Write tests for new functionality
- Maintain or improve test coverage
- Tests should be deterministic and not depend on external services

### Privacy First

SpecCheck has a strong privacy commitment. When contributing:
- Keep image processing on-device
- Never send raw images to external services
- Only send minimal, anonymized data when necessary
- Document any data that leaves the device

## Contributing to the Component Database

SpecCheck relies on a database of component datasheets. You can help by:

1. **Adding new components**: Submit datasheets for components not yet in the database
2. **Verifying data**: Confirm accuracy of existing component specs
3. **Improving recognition**: Help train the ML model with labeled images

See the [Data Contribution Guidelines](docs/DataStructures.md) for data format requirements.

## Development Resources

- [Architecture Overview](Architecture.md)
- [Codebase Structure](docs/CodebaseStructure.md)
- [Data Flow](docs/DataFlow.md)
- [Error Handling](docs/ErrorHandling.md)
- [Performance Guidelines](docs/Performance.md)
- [Privacy Architecture](docs/Privacy.md)

## Pull Request Process

1. Ensure all tests pass and linting is clean
2. Update documentation if needed
3. Add a clear description of changes in your PR
4. Link any related issues
5. Request review from maintainers
6. Address review feedback

PRs will be merged once they:
- Pass CI checks
- Receive approval from at least one maintainer
- Have no unresolved discussions

## Community Guidelines

- Be respectful and constructive
- Focus on the technical merits of contributions
- Help others learn and grow

## Questions?

If you have questions about contributing:
- Open a discussion in GitHub Discussions
- Check existing documentation
- Review closed issues and PRs for context

## License

By contributing to SpecCheck, you agree that your contributions will be licensed under the MIT License.
