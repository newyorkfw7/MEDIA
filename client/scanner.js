document.addEventListener('DOMContentLoaded', () => {
    const scanner = new Instascan.Scanner({ video: document.getElementById('preview') });
    const resultElement = document.getElementById('result');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');

    let isScanning = false;

    scanner.addListener('scan', (content) => {
        resultElement.textContent = `Scanned QR Code: ${content}`;
        window.location.href = `detailMedia.html?id=${encodeURIComponent(content)}`;
    });

    startButton.addEventListener('click', () => {
        if (!isScanning) {
            Instascan.Camera.getCameras().then((cameras) => {
                if (cameras.length > 0) {
                    scanner.start(cameras[0]);
                    startButton.disabled = true;
                    stopButton.disabled = false;
                    isScanning = true;
                } else {
                    alert('No cameras found.');
                }
            }).catch((e) => {
                console.error(e);
                alert('Error accessing cameras.');
            });
        }
    });

    stopButton.addEventListener('click', () => {
        if (isScanning) {
            scanner.stop();
            startButton.disabled = false;
            stopButton.disabled = true;
            isScanning = false;
        }
    });
});
