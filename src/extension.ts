import * as vscode from 'vscode';
// import * as fs from 'fs';
// import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	const provider = new ScribbleProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ScribbleProvider.viewType, provider));
}

class ScribbleProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'scribble.scribbleView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: false,

			localResourceRoots: [
				this._extensionUri
			]
		};

		const scribbleFile = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'scribble.txt'));

		// const workspaceFolders = vscode.workspace.workspaceFolders;

		// if (workspaceFolders) {
		// 	const firstWorkspaceFolder = workspaceFolders[0];
		// 	const dotvscodeFolder = path.join(firstWorkspaceFolder.uri.fsPath, '.vscode');
		// 	const scribbleFile = path.join(dotvscodeFolder.uri.fsPath, 'scribble.txt');
		// } else {
		// 	const scribbleFile = path.join(context.extensionUri, 'resource', 'scribble.txt');
		// }

		webviewView.webview.html = this._getScribbleArea(webviewView.webview, scribbleFile);
	}

	private _getScribbleArea(webview: vscode.Webview, filepath: vscode.Uri) {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'style.css'));
		const notes = ''; // fs.readFileSync(filepath, 'utf-8');

		return `<link href="${styleUri}" rel="stylesheet"><textarea id="scribbleArea" placeholder="Type here">${notes}</textarea>`;
	}
}
