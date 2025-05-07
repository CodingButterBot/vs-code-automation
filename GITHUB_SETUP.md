# GitHub Setup Guide

This document outlines the steps to set up the VS Code MCP Extension on GitHub, making it available for community contributions and distribution.

## Repository Setup

1. **Create a GitHub Repository**:
   - Log in to GitHub
   - Click "New repository"
   - Name: `vscode-mcp-websocket` (or similar)
   - Description: "WebSocket server for Model Context Protocol (MCP) to control VS Code"
   - Choose public visibility
   - Initialize with README (we already have one)
   - Add .gitignore for Node
   - Add MIT License

2. **Initial Repository Structure**:
   ```
   vscode-mcp-websocket/
   ├── .vscode/             # VS Code settings
   ├── src/                 # Source code
   │   └── extension.ts     # Main extension code
   ├── .gitignore           # Git ignore file
   ├── COMMANDS.md          # Command documentation
   ├── EXAMPLE_USAGE.md     # Usage examples
   ├── LICENSE              # MIT License
   ├── package.json         # Extension manifest
   ├── README.md            # Project documentation
   ├── ROADMAP.md           # Development roadmap
   └── tsconfig.json        # TypeScript configuration
   ```

## Workflow Setup

3. **GitHub Actions for CI/CD**:
   Create `.github/workflows/ci.yml`:

   ```yaml
   name: CI/CD

   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v3
       - name: Setup Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '16.x'
       - name: Install dependencies
         run: npm ci
       - name: Lint
         run: npm run lint
       - name: Compile
         run: npm run compile
       - name: Run tests
         run: npm test
   ```

4. **Issue Templates**:
   Create `.github/ISSUE_TEMPLATE/`:
   
   - `bug_report.md`: Template for bug reports
   - `feature_request.md`: Template for feature requests

5. **Pull Request Template**:
   Create `.github/PULL_REQUEST_TEMPLATE.md` with guidelines for contributions

## Contribution Guidelines

6. **Create CONTRIBUTING.md**:
   
   ```markdown
   # Contributing to VS Code MCP WebSocket Extension

   Thank you for your interest in contributing to this project! Here are some guidelines to help you get started.

   ## Development Setup

   1. Fork and clone the repository
   2. Run `npm install` to install dependencies
   3. Run `npm run watch` to start the TypeScript compiler in watch mode
   4. Press F5 in VS Code to launch the extension in a development host

   ## Coding Guidelines

   - Follow the existing code style
   - Write JSDoc comments for public API
   - Include tests for new features
   - Update documentation as needed

   ## Pull Request Process

   1. Create a branch with a descriptive name
   2. Make your changes and commit them
   3. Push your branch and submit a pull request
   4. Wait for review and address any comments

   ## Release Process

   Project maintainers will handle versioning and publishing to the VS Code Marketplace.
   ```

## VS Code Marketplace Publishing

7. **Create Release Workflow**:
   Add to `.github/workflows/release.yml`:

   ```yaml
   name: Publish Extension

   on:
     release:
       types: [created]

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v3
       - uses: actions/setup-node@v3
         with:
           node-version: '16.x'
       - run: npm ci
       - run: npm run lint
       - run: npm run compile
       - run: npm test
       - name: Publish to VS Code Marketplace
         run: npx @vscode/vsce publish
         env:
           VSCE_PAT: ${{ secrets.VSCE_PAT }}
   ```

8. **Add Publishing Scripts to package.json**:
   
   ```json
   "scripts": {
     "vscode:prepublish": "npm run compile",
     "package": "npx @vscode/vsce package",
     "publish": "npx @vscode/vsce publish"
   }
   ```

## Documentation Updates

9. **Enhance README.md**:
   Add badges, installation instructions, and screenshots

10. **Create CHANGELOG.md**:
    Start tracking changes with semantic versioning

## Repository Security

11. **Add Security Policy**:
    Create `SECURITY.md` with vulnerability reporting instructions

12. **Add Code of Conduct**:
    Create `CODE_OF_CONDUCT.md` using the Contributor Covenant

## Getting Started Instructions

To publish this project to GitHub:

1. Initialize Git repository (if not already done):
   ```
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Connect to GitHub:
   ```
   git remote add origin https://github.com/yourusername/vscode-mcp-websocket.git
   git push -u origin main
   ```

3. Set up GitHub Pages (optional):
   Enable GitHub Pages in repository settings, pointing to the main branch

4. Set up repository secrets:
   - Add `VSCE_PAT` for VS Code marketplace publishing

5. Create initial release:
   - Tag the release: `git tag v0.1.0`
   - Push tags: `git push --tags`
   - Create a release on GitHub using the tag

## Community Building

- Announce the project on relevant forums and social media
- Create a project website or GitHub Pages site
- Consider creating a Discord server or discussion forum
- Actively respond to issues and pull requests
- Recognize and thank contributors

---

Following these steps will help establish a professional, community-friendly GitHub repository that's ready for collaboration and distribution via the VS Code Marketplace.