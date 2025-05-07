# VS Code Marketplace Publishing Guide

This document outlines the steps required to publish the VS Code MCP Extension to the Visual Studio Code Marketplace.

## Prerequisites

1. **Microsoft Account or Azure DevOps Account**
   - Required to access the Visual Studio Marketplace Publisher Dashboard

2. **Personal Access Token (PAT)**
   - Go to [Azure DevOps](https://dev.azure.com/)
   - Click on your profile picture > Personal access tokens
   - Create a new token with the "Marketplace (publish)" scope
   - Save this token securely - you'll need it for publishing

3. **Visual Studio Code Extension Manager (vsce)**
   - Install globally: `npm install -g @vscode/vsce`

## Creating a Publisher

1. **Create a Publisher Account**
   - Visit the [Visual Studio Marketplace Management Page](https://marketplace.visualstudio.com/manage)
   - Sign in with your Microsoft account
   - Click "New Publisher"
   - Fill in:
     - Publisher ID (unique identifier, e.g., `coding-butter`)
     - Display name
     - Email
     - Website URL (optional, but recommended - can be your GitHub repo)

## Preparing Your Extension

1. **Update `package.json`**
   - Ensure these fields are properly filled out:

   ```json
   {
     "name": "vscode-mcp-websocket",
     "displayName": "MCP WebSocket Server",
     "description": "WebSocket server for Model Context Protocol (MCP) to control VS Code",
     "version": "0.1.0",
     "publisher": "your-publisher-id",
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "https://github.com/your-username/vscode-mcp-websocket"
     },
     "engines": {
       "vscode": "^1.80.0"
     },
     "categories": [
       "Other"
     ],
     "keywords": [
       "websocket",
       "mcp",
       "automation",
       "remote",
       "ai"
     ],
     "icon": "images/icon.png",
     "galleryBanner": {
       "color": "#C80000",
       "theme": "dark"
     }
   }
   ```

2. **Create an Icon**
   - Create a 128x128 pixel PNG icon for your extension
   - Save it as `images/icon.png` in your project

3. **Update README.md**
   - Ensure your README.md is user-friendly and contains:
     - Clear description of what the extension does
     - Installation instructions
     - Features with screenshots/GIFs
     - Usage examples
     - Configuration options
     - Troubleshooting tips
     - Links to detailed documentation

4. **Create a CHANGELOG.md**
   - Document your versions and changes

## Publishing Process

1. **Package Your Extension**
   ```
   vsce package
   ```
   This creates a `.vsix` file.

2. **Test Your Packaged Extension**
   - Install it locally to test:
   ```
   code --install-extension your-extension-name-0.1.0.vsix
   ```

3. **Publish Your Extension**
   ```
   vsce publish
   ```
   - You'll be prompted for your Personal Access Token
   - Alternatively, use:
   ```
   vsce publish -p <your-pat>
   ```

4. **Automate Publishing with GitHub Actions** (recommended)
   - Use the GitHub workflow defined in GITHUB_SETUP.md
   - Add your PAT as a secret in your GitHub repository

## Updating Your Extension

1. **Update the Version Number**
   - In `package.json`, increment the version number following [SemVer](https://semver.org/)
   - Major version: Breaking changes
   - Minor version: New features, no breaking changes
   - Patch version: Bug fixes and minor changes

2. **Update CHANGELOG.md**
   - Document your changes

3. **Package and Publish Again**
   ```
   vsce publish
   ```

## Marketplace Features to Leverage

1. **Q&A Tab**
   - Monitor and respond to questions from users

2. **Rating & Reviews**
   - Encourage users to leave reviews
   - Address negative reviews promptly

3. **GitHub Integration**
   - Link issues and PRs to keep users informed of progress

4. **Statistics**
   - Monitor installs, ratings, and other metrics

## Marketing Your Extension

1. **Create a Demo GIF**
   - Show your extension in action
   - Add to README.md and marketplace description

2. **Write a Blog Post**
   - Explain the problem your extension solves
   - Share on relevant platforms (Dev.to, Medium, etc.)

3. **Share on Social Media**
   - Twitter, Reddit (r/vscode, r/programming)
   - VS Code Discord community

4. **Make a YouTube Demo**
   - Create a short video showing your extension's features

## Maintenance Best Practices

1. **Respond to Issues Promptly**
   - Check GitHub issues regularly
   - Acknowledge bug reports and feature requests

2. **Keep Dependencies Updated**
   - Regularly update npm dependencies
   - Test with the latest VS Code versions

3. **Be Clear About Support**
   - Document which VS Code versions you support
   - Specify any known limitations

## Resources

- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Marketplace](https://code.visualstudio.com/docs/editor/extension-marketplace)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [VS Code API Documentation](https://code.visualstudio.com/api/references/vscode-api)

---

Following this guide will help you successfully publish and maintain your VS Code MCP WebSocket extension on the Visual Studio Code Marketplace, making it available to millions of VS Code users worldwide.