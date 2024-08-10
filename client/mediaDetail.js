document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const mediaId = urlParams.get('id');



    if (mediaId) {
        try {
            const response = await fetch(`/media/${mediaId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const media = await response.json();
            displayMediaDetails(media);
        } catch (error) {
            console.error('Error:', error);
            const detailsDiv = document.getElementById('mediaDetails');
            detailsDiv.textContent = 'Error loading media details. Please try again later.';
        }
    } else {
        console.error('No media ID provided');
        const detailsDiv = document.getElementById('mediaDetails');
        detailsDiv.textContent = 'No media ID provided. Unable to load details.';
    }
});

function displayMediaDetails(media) {
    const detailsDiv = document.getElementById('mediaDetails');
    detailsDiv.className = 'media-details-container';

    const dataContainer = document.createElement('div');
    dataContainer.className = 'data-container';

    const participationNumber = document.createElement('div');
    participationNumber.className = 'participation-number';
    participationNumber.textContent = `Participation Number: ${media.participationNumber || 'N/A'}`;

    const name = document.createElement('h3');
    name.textContent = media.fullName;

    dataContainer.appendChild(participationNumber);
    dataContainer.appendChild(name);

    const dataElements = [
        { label: 'Type', value: media.type },
        { label: 'Date & Time', value: `${media.day} For ${media.time}` },
    ];

    dataElements.forEach(el => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${el.label}:</strong> ${el.value}`;
        dataContainer.appendChild(p);
    });

    const qrAndLogoContainer = document.createElement('div');
    qrAndLogoContainer.className = 'qr-and-logo-container';

    const qrCodeContainer = document.createElement('div');
    qrCodeContainer.className = 'qr-code-container';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`/mediaDetail.html?id=${media._id}`)}`;
    const qrImg = new Image();
    qrImg.crossOrigin = 'Anonymous';
    qrImg.src = qrCodeUrl;

    qrImg.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = qrImg.width;
        canvas.height = qrImg.height;
        ctx.drawImage(qrImg, 0, 0);

        const qrDataURL = canvas.toDataURL('image/png');
        const qrCodeImg = document.createElement('img');
        qrCodeImg.src = qrDataURL;
        qrCodeImg.alt = 'QR Code';
        qrCodeImg.className = 'qr-img';
        qrCodeContainer.appendChild(qrCodeImg);

        const logoContainer = document.createElement('div');
        logoContainer.className = 'logo-container';
        const logoImg = new Image();
        logoImg.src = 'https://runway7.fashion/wp-content/uploads/2024/07/R7FEMAIL.png';
        logoImg.alt = 'Runway 7 Fashion Logo';
        logoImg.className = 'logo-img';
        

        logoImg.onload = () => {
            logoContainer.appendChild(logoImg);
            qrAndLogoContainer.appendChild(qrCodeContainer);
            qrAndLogoContainer.appendChild(logoContainer);
            dataContainer.appendChild(qrAndLogoContainer);
            detailsDiv.appendChild(dataContainer);
        };

        logoImg.onerror = () => {
            console.error('Error loading logo image');
        };
    };

    const registerButton = document.createElement('button');
    registerButton.textContent = 'REGISTER';
    registerButton.className = 'register-button';
    registerButton.addEventListener('click', async () => {
        try {
            console.log(`Sending PUT request to /media/${media._id}/register`);
            const response = await fetch(`/media/${media._id}/register`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                console.log('Register status updated successfully');
                registerButton.textContent = 'REGISTERED';
                registerButton.style.backgroundColor = 'green';
                registerButton.style.color = 'white';
            } else {
                console.error('Error updating register status');
            }
        } catch (error) {
            console.error('Error updating register status:', error);
        }
    });

    dataContainer.appendChild(registerButton);
}

document.getElementById('capture').addEventListener('click', async () => {
    try {
        const ticketElement = document.getElementById('ticket');
        const urlParams = new URLSearchParams(window.location.search);
        const mediaId = urlParams.get('id');

        if (!mediaId) {
            throw new Error('No media ID found');
        }

        // Ocultar el botón de registro
        const registerButton = document.querySelector('.register-button');
        if (registerButton) {
            registerButton.style.display = 'none';
        }
        

        // Captura el div del ticket
        const canvas = await html2canvas(ticketElement);
        const imgData = canvas.toDataURL('image/png');

        // Mostrar el botón de registro nuevamente
        if (registerButton) {
            registerButton.style.display = 'block';
        }

        console.log('Enviando datos al servidor...');
        const response = await fetch('/save-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imgData: imgData, mediaId: mediaId }),
        });

        console.log('Respuesta del servidor:', response.status);
        const responseText = await response.text();
        console.log('Contenido de la respuesta:', responseText);

        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log('PDF guardado:', result.filename);
            alert('PDF guardado exitosamente en el servidor');
        } else {
            console.error('Error al guardar el PDF:', responseText);
            alert(`Error al guardar el PDF en el servidor: ${responseText}`);
        }
    } catch (error) {
        console.error('Error en el cliente:', error);
        alert(`Error al comunicarse con el servidor: ${error.message}`);
    }
});



