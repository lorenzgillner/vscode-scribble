import * as vscode from 'vscode';
import * as fs from 'fs'; // TODO use vscode.workspace.fs instead of fs

const scribbleName = 'scribble.txt';

function touchScribble(uri: vscode.Uri) {
	const scribblePath = vscode.Uri.joinPath(uri, scribbleName).fsPath;
	if (!fs.existsSync(uri.fsPath)) {
		fs.mkdirSync(uri.fsPath, {recursive: true});
	}
	fs.appendFileSync(scribblePath, '');
}

export function activate(context: vscode.ExtensionContext) {
	const globalScribblePath = vscode.Uri.joinPath(context.globalStorageUri, scribbleName);

	/* create global scribble if it doesn't exist yet */
	fs.existsSync(globalScribblePath.fsPath) || touchScribble(context.globalStorageUri);

	/* try to open local scribble, fallback to global scribble */
	const wsFolders = vscode.workspace.workspaceFolders;
	const localScribblePath = vscode.Uri.joinPath(wsFolders[0].uri, '.vscode', scribbleName);
	const scribblePath = (wsFolders && wsFolders.length > 0 && fs.existsSync(localScribblePath.fsPath)) ? localScribblePath : globalScribblePath;

	/* create new scribble window */
	const provider = new ScribbleProvider(context.extensionUri, scribblePath);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScribbleProvider.viewType, provider));
	
	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.saveScribble', () => {
			provider.saveScribble();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('scribble.createScribble', () => {
			provider.createScribble(context);
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

	// TODO this without context
	public createScribble(context: vscode.ExtensionContext) {
		if (context.storageUri) {
			const localScribblePath = vscode.Uri.joinPath(context.storageUri, scribbleName);

			if (fs.existsSync(localScribblePath.fsPath)) {
				vscode.window.showErrorMessage("Existing scribble found");
			} else {
				touchScribble(localScribblePath);
				this._scribblePath = localScribblePath;
				if (this._view) {
					this._view.webview.postMessage({ type: 'createScribbleCommand' });
				}
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
