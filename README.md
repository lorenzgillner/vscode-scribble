# Scribble

Take notes in VS Code, just like in the Geany IDE.

## Build

```sh
cd vscode-scribble
npm run compile
vsce package
```

## Install

```sh
code --install-extension scribble-<version>.vsix
```

 Don't forget to add `.scribble` to your `.gitignore`; you probably don't want your notes to end up in some public repo :^)