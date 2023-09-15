import * as vscode from 'vscode';
import * as fs from 'fs';

const dotVscode = '.vscode';
const scribbleName = 'scribble.txt';

function dotVscodeExists() {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	return workspaceFolders && workspaceFolders.length > 0 &&
		fs.existsSync(vscode.Uri.joinPath(workspaceFolders[0].uri, dotVscode).fsPath);
}

export function activate(context: vscode.ExtensionContext) {
	const scribbleFilePath = (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.vscode', 'scribble.txt') : vscode.Uri.joinPath(context.extensionUri, 'resources', scribbleName);

	const provider = new ScribbleProvider(context.extensionUri, scribbleFilePath);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScribbleProvider.viewType, provider));

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('scribble.createLocalScribble', () => {
	// 		provider.createLocalScribble();
	// 	}));
	
	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.saveScribble', () => {
			provider.saveScribble();
		}));
}

class ScribbleProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'scribble.scribbleView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _scribbleFilePath: vscode.Uri
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
						fs.writeFile(this._scribbleFilePath.fsPath, data.value, 'utf8', (err) => {
							if (err) {
								vscode.window.showErrorMessage("Couldn't save scribble");
							} else {
								vscode.window.showInformationMessage('Scribble saved!');
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

	// public createLocalScribble() {
	// 	if (dotVscodeExists()) {
	// 		const localScribblePath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, dotVscode, scribbleName);
	// 		vscode.workspace.fs.writeFile(localScribblePath, new Uint8Array).then(undefinedl, (reason) => {
	// 			vscode.window.showErrorMessage(reason);
	// 		});
	// 	} else {
	// 		vscode.window.showErrorMessage("Can't create scribble without a valid workspace");
	// 	}
	// }

	private _getScribbleArea(webview: vscode.Webview) {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'scribble.js'));
		const scribbleText = fs.readFileSync(this._scribbleFilePath.fsPath, 'utf-8'); // TODO feedback on failure

		// TODO this
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
			</head>
			<body>
				<textarea id="scribbleArea" placeholder="Type here">${scribbleText}</textarea>
				<script src="${scriptUri}"/>
			</body>
			</html>`;
	}
}
