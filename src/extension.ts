import * as vscode from 'vscode';
import * as fs from 'fs';

/* default scribble file name */
const scribbleName = 'scribble.txt';

function writeFile(path: vscode.Uri, text: string) {
	fs.writeFile(path.fsPath, Buffer.from(text), (error) => {
		if (error) {
			vscode.window.showErrorMessage(`Couldn't save scribble: ${error}`);
		} else {
			vscode.window.showInformationMessage('Scribbe saved');
		}
	});
}

export async function activate(context: vscode.ExtensionContext) {
	/* default location in global extension storage (somewhere in your $HOME directory) */
	const globalPluginDir = context.globalStorageUri;
	const scribblePath = vscode.Uri.joinPath(globalPluginDir, scribbleName);

	/* read file from disk, if it exists */
	const scribbleText = fs.existsSync(scribblePath.fsPath) ? fs.readFileSync(scribblePath.fsPath).toString() : '';

	/* create new scribble instance */
	const provider = new ScribbleProvider(context.extensionUri, scribblePath, scribbleText);

	/* register extension and its commands */
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScribbleProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.save', () => {
			provider.saveScribble();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.copy', () => {
			provider.copyScribble();
		}));
}

class ScribbleProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'scribble.scribbleView';

	private view!: vscode.WebviewView;

	public constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly scribblePath: vscode.Uri,
		private scribbleText: string
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this.view = webviewView;

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
						this.scribbleText = event.data;
						break;
					}
			}
		});

		webviewView.onDidChangeVisibility(() => {
			this._setScribble();
		});

		webviewView.onDidDispose(() => {
			this._setScribble();
		});
	}

	private _getScribble() {
		this._callScribble('get');
	}

	private _setScribble() {
		this._callScribble('set', this.scribbleText);
	}

	private _callScribble(cmd: string, arg?: string) {
		if (this.view) {
			this.view.webview.postMessage({ type: cmd, value: arg });
		}
	}

	private _getScribbleArea(webview: vscode.Webview): string {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'res', 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'res', 'scribble.js'));

		/* I really dislike this */
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
			</head>
			<body>
				<div id="scribbleWrapper">
					<textarea id="scribbleArea" placeholder="Type here">${this.scribbleText}</textarea>
				</div>
				<script src="${scriptUri}"/>
			</body>
			</html>`;
	}

	public saveScribble() {
		this._getScribble();
		writeFile(this.scribblePath, this.scribbleText);
	}

	public copyScribble() {
		this._getScribble();
		vscode.env.clipboard.writeText(this.scribbleText);
		vscode.window.showInformationMessage('Scribble copied to clipboard');
	}
}
