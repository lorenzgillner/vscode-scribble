(function () {
    // eslint-disable-next-line no-undef
    const vscode = acquireVsCodeApi();
	const scribbleArea = document.getElementById('scribbleArea');

	scribbleArea.addEventListener('keydown', event => {
		if (event.ctrlKey && event.key === 's') {
			saveScribble();
		}
    });

    scribbleArea.addEventListener('focusout', () => {
        sendScribble();
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'saveScribble':
                {
                    saveScribble();
                    break;
                }
            case 'setScribble':
                {
                    scribbleArea.value = message.value;
                    break;
                }
            case 'getScribble':
                {
                    sendScribble();
                    break;
                }
        }
    });

    function saveScribble() {
        vscode.postMessage({
			type: 'saveScribble',
			data: scribbleArea.value
		});
    }

    function sendScribble() {
        vscode.postMessage({
            type: 'sendScribble',
            data: scribbleArea.value
        });
    }
}());