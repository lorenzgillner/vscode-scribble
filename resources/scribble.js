//@ts-check

(function () {
    const vscode = acquireVsCodeApi();
	const scribbleArea = document.getElementById('scribbleArea');

	scribbleArea.addEventListener('keydown', e => {
		if (e.ctrlKey && e.key === 's') {
			saveScribble();
		}
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'saveScribbleCommand':
                {
                    saveScribble();
                    break;
                }
        }
    });

    function saveScribble() {
        vscode.postMessage({
			type: 'saveScribbleEvent',
			value: scribbleArea.value || '' // TODO use `this` instead
		});
    }
}());