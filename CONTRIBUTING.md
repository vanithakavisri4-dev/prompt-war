# Contributing to ArenaFlow AI

Thank you for your interest in contributing to ArenaFlow AI! This document provides guidelines for contributing to this project.

## 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Make** your changes
5. **Test** by opening `tests/test.html` in a browser
6. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
7. **Push** to your branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

## 📋 Development Guidelines

### Code Style
- Follow the `.editorconfig` settings (2-space indentation, UTF-8)
- Use `'use strict'` in all JavaScript modules
- Use JSDoc comments for all public functions
- Use named constants instead of magic numbers
- Follow the IIFE module pattern used across the codebase

### JavaScript Conventions
- Use `const` and `let` — never `var`
- Use template literals for string interpolation
- Always sanitize user input via `ArenaUtils.sanitize()` before DOM insertion
- Wrap external API calls in try-catch with graceful fallbacks
- Use `crypto.getRandomValues()` instead of `Math.random()` for security-sensitive values

### Accessibility
- All interactive elements must have `aria-label` or visible labels
- Use semantic HTML5 elements (`<nav>`, `<main>`, `<section>`, etc.)
- Maintain WCAG 2.1 AA compliance
- Test with keyboard navigation and screen readers

### Testing
- Add tests for new features in `tests/test.html`
- Include edge case and boundary value tests
- Test both success and failure paths

## 🔒 Security

- Never commit API keys or secrets
- Report security vulnerabilities privately to the maintainers
- Follow the Content Security Policy defined in `index.html`

## 📝 Commit Message Convention

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style/formatting (no logic change)
- `refactor:` — Code refactoring
- `test:` — Adding/updating tests
- `chore:` — Build/tooling changes

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
