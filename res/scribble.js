(function () {
    // eslint-disable-next-line no-undef
    const vscode = acquireVsCodeApi();
	const scribbleArea = document.getElementById('scribbleArea');

	scribbleArea.addEventListener('keydown', event => {
		if (event.ctrlKey && event.key === 's') {
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
            case 'setScribbleCommand':
                {
                    scribbleArea.value = message.value;
                    break;
                }
            case 'getScribbleCommand':
                {
                    sendScribble();
                    break;
                }
        }
    });

    function saveScribble() {
        vscode.postMessage({
			type: 'saveScribbleEvent',
			data: scribbleArea.value
		});
    }

    function sendScribble() {
        vscode.postMessage({
            type: 'getScribbleEvent',
            data: scribbleArea.value
        });
    }
}());