# Scribble

Take notes in VS Code/Codium, just like in the [Geany IDE](https://www.geany.org/):

![Scribble area in the Geany IDE](assets/geany_scribble.png)

This extension adds a panel that mimics the functionality of Geany's "Scribble" feature:

![Extension screenshot](assets/vscode_scribble.png)

## Why?

https://github.com/Microsoft/vscode/issues/58774

## Installation

[Download](https://github.com/lorenzgillner/vscode-scribble/releases/latest) or [build](#build) the package, then install it via the extension manager ("View" > "Extensions" > "Views and More Actions..." > "Install from VSCIX...") or from the command line:

```sh
code --install-extension scribble-<version>.vsix
```

## Building from source

Clone the source code and enter the source directory. Make sure that an *up-to-date* version of `npm` is installed, since it will take care of the remaining steps:

```sh
git clone https://github.com/lorenzgillner/vscode-scribble
cd vscode-scribble
npm install      # install dependencies
npm run release  # build the VSIX package
```

## Key bindings

Shortcut | Description
--- | ---
**[ctrl]+[s]** | Save your current scribble

## PSA

Don't forget to add `.scribble.txt` to your `.gitignore` if you are using a local scribble file; you probably don't want your notes to end up in some public repo 🫠