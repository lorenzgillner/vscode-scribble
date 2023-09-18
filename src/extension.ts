import * as vscode from 'vscode';
import * as fs from 'fs';

const globalScribbleName = 'scribble.txt';
const localScribbleName = `.${globalScribbleName}`;

export function activate(context: vscode.ExtensionContext) {
	const wsFolders = vscode.workspace.workspaceFolders;
	const scribblePath = (wsFolders && wsFolders.length > 0 && fs.existsSync(vscode.Uri.joinPath(wsFolders[0].uri, localScribbleName).fsPath)) ? vscode.Uri.joinPath(wsFolders[0].uri, localScribbleName) : vscode.Uri.joinPath(context.extensionUri, 'resources', globalScribbleName);

	const provider = new ScribbleProvider(context.extensionUri, scribblePath);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScribbleProvider.viewType, provider));
	
	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.saveScribble', () => {
			provider.saveScribble();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.createScribble', () => {
			provider.createScribble();
		}));
}

class ScribbleProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'scribble.scribbleView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private _scribblePath: vscode.Uri
	) { }

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

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'saveScribbleEvent':
					{
						fs.writeFile(this._scribblePath.fsPath, data.value, 'utf8', (err) => {
							if (err) {
								vscode.window.showErrorMessage("Couldn't save scribble");
							} else {
								vscode.window.showInformationMessage('Scribble saved');
							}
						});
						break;
					}
			}
		});
	}

	public saveScribble() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'saveScribbleCommand' });
		}
	}

	public createScribble() {
		const wsFolders = vscode.workspace.workspaceFolders;

		if (wsFolders && wsFolders.length > 0) {
			const scribblePath = vscode.Uri.joinPath(wsFolders[0].uri, localScribbleName);
			if (!fs.existsSync(scribblePath.fsPath)) {
				vscode.workspace.fs.writeFile(scribblePath, new Uint8Array).then(undefined, (reason) => {
					vscode.window.showErrorMessage(reason);
				});
				this._scribblePath = scribblePath;
				if (this._view) {
					this._view.webview.postMessage({ type: 'createScribbleCommand' });
				}
			} else {
				vscode.window.showErrorMessage("Existing scribble found");
			}
		} else {
			vscode.window.showErrorMessage("Can't create scribble in an empty workspace");
		}
	}

	// TODO update on local scribble deletion

	private _getScribbleArea(webview: vscode.Webview) {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'scribble.js'));
		const scribbleText = fs.readFileSync(this._scribblePath.fsPath, 'utf-8'); // TODO feedback on failure

		// TODO this
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
			</head>
			<body>
				<div id="scribbleWrapper">
					<textarea id="scribbleArea" placeholder="Type here">${scribbleText}</textarea>
				</div>
				<script src="${scriptUri}"/>
			</body>
			</html>`;
	}
}
