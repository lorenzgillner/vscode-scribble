import * as vscode from 'vscode';
import * as fs from 'fs';

/* default scratchpad file name */
const scratchpadName = 'scribble.txt';

/* placeholder text */
const squid = '🐙';

/* undefined if no folder is open */
const wsf = vscode.workspace.workspaceFolders;

/* uses the first workspace by default (for now); TODO support multi-root workspaces? */
const dotVscodeDir = (wsf && wsf.length > 0) ? vscode.Uri.joinPath(wsf[0].uri, '.vscode') : undefined;

/* encoder for writing text files */
const enc = new TextEncoder();

/* XXX When working on a remote machine, this path will be created in the local file tree! */
function touchScratchpad(uri: vscode.Uri) {
	const scratchpadPath = vscode.Uri.joinPath(uri, scratchpadName);
	vscode.workspace.fs.stat(uri).then(undefined, (reason) => {
		vscode.workspace.fs.createDirectory(uri);
	});
	vscode.workspace.fs.writeFile(uri, enc.encode(squid));
	return scratchpadPath;
}

function hasScratchpad(uri: vscode.Uri) {
	/* can we do better than that? */
	try {
		vscode.workspace.fs.stat(vscode.Uri.joinPath(uri, scratchpadName));
		return true;
	} catch {
		return false;
	}
}

function readScratchpad(uri: vscode.Uri) {
	return fs.readFileSync(uri.fsPath, 'utf-8');	
}

export function activate(context: vscode.ExtensionContext) {
	/* default location in global storage (somewhere in your $HOME) */
	const globalPluginDir = context.globalStorageUri;
	const globalScratchpadPath = vscode.Uri.joinPath(globalPluginDir, scratchpadName);
	
	/* create global scratchpad file if it doesn't exist yet */
	fs.existsSync(globalScratchpadPath.fsPath) || touchScratchpad(globalPluginDir);

	/* try to open local scratchpad, otherwise use global scratchpad */
	const scratchpadPath = (dotVscodeDir && hasScratchpad(dotVscodeDir)) ? vscode.Uri.joinPath(dotVscodeDir, scratchpadName) : globalScratchpadPath;

	/* create new scratchpad instance */
	const provider = new ScratchpadProvider(context.extensionUri, scratchpadPath);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScratchpadProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('scratchpad.save', () => {
			provider.save();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('scratchpad.create', () => {
			provider.create();
		}));
}

class ScratchpadProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'scratchpad.scratchpadView';

	private _view?: vscode.WebviewView;
	private _text: string;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private _scratchpadPath: vscode.Uri
	) {
		this._text = readScratchpad(this._scratchpadPath);
		// vscode.window.showInformationMessage(this._scratchpadPath.toString());
		// vscode.window.showInformationMessage(this._text);
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getScratchpadArea(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(event => {
			switch (event.type) {
				case 'get':
					{
						this._text = event.data;
						break;
					}
			}
		});

		webviewView.onDidChangeVisibility(() => {
			this.setScratchpad(this._text);
		});

		webviewView.onDidDispose(() => {
			this.setScratchpad(this._text);
		});
	}

	public getScratchpad() {
		this._callScratchpad('get');
	}

	public setScratchpad(arg: string) {
		this._callScratchpad('set', arg);
	}

	public save() {
		this._callScratchpad('get');
		vscode.workspace.fs.writeFile(this._scratchpadPath, enc.encode(this._text)).then(() => {
			vscode.window.showInformationMessage('Scratchpad saved');
		},
			(reason) => {
				vscode.window.showErrorMessage(`Couldn't save scratchpad: ${reason}`);
			});
	}

	public create() {
		if (dotVscodeDir) {
			if (hasScratchpad(dotVscodeDir)) {
				vscode.window.showErrorMessage("Existing scratchpad found");
			} else {
				const newScratchpadPath = touchScratchpad(dotVscodeDir);
				if (this._view) {
					this._scratchpadPath = newScratchpadPath;
					this._text = squid;
					this.setScratchpad(this._text);
				}
			}
		} else {
			vscode.window.showErrorMessage("Can't create scratchpad in an empty workspace");
		}
	}

	private _callScratchpad(cmd: string, arg?: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: cmd, value: arg });
		}
	}

	private _getScratchpadArea(webview: vscode.Webview): string {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'res', 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'res', 'scratchpad.js'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
			</head>
			<body>
				<div id="scratchpadWrapper">
					<textarea id="scratchpadArea" placeholder="Type here">${this._text}</textarea>
				</div>
				<script src="${scriptUri}"/>
			</body>
			</html>`;
	}
}
