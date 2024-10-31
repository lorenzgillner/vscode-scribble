(function () {
    // eslint-disable-next-line no-undef
    const vscode = acquireVsCodeApi();
    const $scribbleArea = document.getElementById('scribbleArea');

    $scribbleArea.addEventListener('input', () => {
        getScribbleContent();
    });

    // Handle messages sent from the extension to this webview
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'set':
                {
                    $scribbleArea.value = message.value;
                    break;
                }
            case 'get':
                {
                    getScribbleContent();
                    break;
                }
        }
    });

    window.addEventListener('load', () => {
        $scribbleArea.focus();
    });

    function getScribbleContent() {
        vscode.postMessage({
            type: 'get',
            data: $scribbleArea.value
        });
    }
}());