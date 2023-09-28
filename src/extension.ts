import * as vscode from 'vscode';
import * as fs from 'fs'; // TODO use vscode.workspace.fs instead of fs

/* default scribble file name */
const scribbleName = 'scribble.txt';

const squid = '🐙';

/* ... because vscode.workspace.workspaceFolders is too long */
const wsf = vscode.workspace.workspaceFolders;

/* uses the first workspace by default for now; TODO support for multi-root workspaces */
const localScribbleFolder = (wsf && wsf.length > 0) ? vscode.Uri.joinPath(wsf[0].uri, '.vscode') : undefined;

function touchScribble(uri: vscode.Uri) {
	const scribblePath = vscode.Uri.joinPath(uri, scribbleName);
	if (!fs.existsSync(uri.fsPath)) {
		fs.mkdirSync(uri.fsPath, { recursive: true });
	}
	fs.appendFileSync(scribblePath.fsPath, squid);
	return scribblePath;
}

function hasScribble(uri: vscode.Uri) {
	return fs.existsSync(vscode.Uri.joinPath(uri, scribbleName).fsPath);
}

function readScribble(uri: vscode.Uri) {
	return fs.readFileSync(uri.fsPath, 'utf-8');
}

export function activate(context: vscode.ExtensionContext) {
	/* default location in global storage (somewhere in your $HOME) */
	const globalScribbleFolder = context.globalStorageUri
	const globalScribblePath = vscode.Uri.joinPath(globalScribbleFolder, scribbleName);

	/* create global scribble if it doesn't exist yet */
	fs.existsSync(globalScribblePath.fsPath) || touchScribble(globalScribbleFolder);

	/* try to open local scribble, otherwise use global scribble */
	const scribblePath = (localScribbleFolder && hasScribble(localScribbleFolder)) ? vscode.Uri.joinPath(localScribbleFolder, scribbleName) : globalScribblePath;

	/* create new scribble instance */
	const provider = new ScribbleProvider(context.extensionUri, scribblePath);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScribbleProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.save', () => {
			provider.save();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.create', () => {
			provider.create();
		}));
}

class ScribbleProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'scribble.scribbleView';

	private _view?: vscode.WebviewView;
	private _text: string;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private _scribblePath: vscode.Uri
	) {
		this._text = readScribble(this._scribblePath);
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

		webviewView.webview.html = this._getScribbleArea(webviewView.webview);

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
			this.setScribble(this._text);
		});

		webviewView.onDidDispose(() => {
			this.setScribble(this._text);
		});
	}

	public getScribble() {
		this._callScribble('get');
	}

	public setScribble(arg: string) {
		this._callScribble('set', arg);
	}

	public save() {
		this._callScribble('get');
		fs.writeFile(this._scribblePath.fsPath, this._text, 'utf8', (err) => {
			if (err) {
				vscode.window.showErrorMessage(`Couldn't save scribble: ${err.message}`);
			} else {
				vscode.window.showInformationMessage('Scribble saved');
			}
		});
	}

	public create() {
		if (localScribbleFolder) {
			if (hasScribble(localScribbleFolder)) {
				vscode.window.showErrorMessage("Existing scribble found");
			} else {
				const newScribblePath = touchScribble(localScribbleFolder);
				if (this._view) {
					this._scribblePath = newScribblePath;
					this._text = squid;
					this.setScribble(this._text);
				}
			}
		} else {
			vscode.window.showErrorMessage("Can't create scribble in an empty workspace");
		}
	}

	private _callScribble(cmd: string, arg?: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: cmd, value: arg });
		}
	}

	private _getScribbleArea(webview: vscode.Webview) {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'res', 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'res', 'scribble.js'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
			</head>
			<body>
				<div id="scribbleWrapper">
					<textarea id="scribbleArea" placeholder="Type here">${this._text}</textarea>
				</div>
				<script src="${scriptUri}"/>
			</body>
			</html>`;
	}
}
