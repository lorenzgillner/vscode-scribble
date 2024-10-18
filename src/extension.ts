import * as vscode from 'vscode';
import * as fs from 'fs';

/* default scribble file name */
const scribbleName = 'scribble.txt';

/* placeholder text */
const squid = '🐙';

/* encoder for writing text files */
const enc = new TextEncoder();

/* XXX When working on a remote machine, this path will be created in the local file tree! */
function touchScribble(uri: vscode.Uri) {
	const scribblePath = vscode.Uri.joinPath(uri, scribbleName);
	vscode.workspace.fs.stat(uri).then(undefined, () => {
		vscode.workspace.fs.createDirectory(uri);
	});
	vscode.workspace.fs.writeFile(uri, enc.encode(squid));
	return scribblePath;
}

function readScribble(uri: vscode.Uri) {
	return fs.readFileSync(uri.fsPath, 'utf-8');
}

export function activate(context: vscode.ExtensionContext) {
	/* default location in global extension storage (somewhere in your $HOME directory) */
	const globalPluginDir = context.globalStorageUri;
	const scribblePath = vscode.Uri.joinPath(globalPluginDir, scribbleName);
	
	/* create global scribble file if it doesn't exist yet */
	fs.existsSync(scribblePath.fsPath) || touchScribble(globalPluginDir);

	/* create new scribble instance */
	const provider = new ScribbleProvider(context.extensionUri, scribblePath);

	/* register extension and its commands */
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScribbleProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.save', () => {
			provider.save();
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
		_context: vscode.WebviewViewResolveContext,
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

		webviewView.webview.onDidReceiveMessage((event: { type: string; data: string; }) => {
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
		vscode.workspace.fs.writeFile(this._scribblePath, enc.encode(this._text)).then(() => {
			vscode.window.showInformationMessage('Scribble saved');
		},
			(reason) => {
				vscode.window.showErrorMessage(`Couldn't save scribble: ${reason}`);
			});
	}

	private _callScribble(cmd: string, arg?: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: cmd, value: arg });
		}
	}

	private _getScribbleArea(webview: vscode.Webview): string {
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
