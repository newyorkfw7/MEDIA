document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Funcionalidad del Sidebar
    const toggleSidebarButton = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    toggleSidebarButton.addEventListener('click', function() {
      sidebar.classList.toggle('closed');
    });

    // Cargar datos de media
    const response = await fetch('/media');
    const mediaList = await response.json();

    const mediaListContainer = document.getElementById('mediaList');

    // Crear la tabla
    const mediaTable = document.createElement('table');
    mediaTable.className = 'media-table';

    // Crear el encabezado de la tabla
    const headerRow = document.createElement('thead');
    const headerTitles = ['QR', 'Participation Number', 'Name', 'Email', 'Phone', 'Type', 'Instagram', 'Status', 'Day', 'Time', 'Register Status', 'Send Mail', 'Email Status'];

    const headerRowContent = document.createElement('tr');
    headerTitles.forEach(title => {
      const th = document.createElement('th');
      th.textContent = title;
      headerRowContent.appendChild(th);
    });

    headerRow.appendChild(headerRowContent);
    mediaTable.appendChild(headerRow);

    // Función para manejar el clic en el QR
    const handleQRClick = function(qrImgUrl) {
      const modalImg = document.getElementById('modalImg');
      modalImg.src = qrImgUrl;
      const modal = document.getElementById('qrModal');
      modal.style.display = 'block';
    };

    // Función para enviar correo con PDF adjunto
    const sendEmail = async function(media, emailStatusCell) {
      try {
        const response = await fetch('/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: media.emailAddress,
            participationNumber: media.participationNumber,
            name: media.fullName,
            phone: media.phoneNumber,
            type: media.type,
            instagram: media.instagramUsername,
            status: media.status,
            day: media.day,
            time: media.time,
            mediaId: media._id  // Añadimos el ID del media
          })
        });
        if (response.ok) {
          emailStatusCell.textContent = 'Sent';
          emailStatusCell.style.color = 'green';
        } else {
          emailStatusCell.textContent = 'Error';
          emailStatusCell.style.color = 'red';
        }
      } catch (error) {
        console.error('Error sending email:', error);
        emailStatusCell.textContent = 'Error';
        emailStatusCell.style.color = 'red';
      }
    };
    // Agregar cada media a la tabla
    mediaList.forEach((media) => {
      const mediaRow = document.createElement('tr');

      // QR Code
      const qrCell = document.createElement('td');
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`/mediaDetail.html?id=${media._id}`)}`;
      const qrImg = document.createElement('img');
      qrImg.src = qrUrl;
      qrImg.alt = 'QR Code';
      qrImg.className = 'qr-img'; // Clase para el estilo y el manejo del clic
      qrImg.addEventListener('click', () => handleQRClick(qrUrl)); // Evento de clic para mostrar el modal
      qrCell.appendChild(qrImg);

      // Participación Número
      const participationNumberCell = document.createElement('td');
      participationNumberCell.textContent = media.participationNumber;

      // Nombre
      const nameCell = document.createElement('td');
      nameCell.textContent = media.fullName;

      // Email
      const emailCell = document.createElement('td');
      emailCell.textContent = media.emailAddress;

      // Teléfono
      const phoneCell = document.createElement('td');
      phoneCell.textContent = media.phoneNumber;

      // Tipo
      const typeCell = document.createElement('td');
      typeCell.textContent = media.type;

      // Instagram
      const instagramCell = document.createElement('td');
      instagramCell.textContent = media.instagramUsername;

      // Estado
      const statusCell = document.createElement('td');
      statusCell.textContent = media.status;

      // Día
      const dayCell = document.createElement('td');
      dayCell.textContent = media.day;

      // Hora
      const timeCell = document.createElement('td');
      timeCell.textContent = media.time;

      // Estado de Registro
      const registerStatusCell = document.createElement('td');
      registerStatusCell.textContent = media.registerStatus || 'No Register';
      registerStatusCell.style.backgroundColor = media.registerStatus === 'REGISTER' ? 'green' : 'red';
      registerStatusCell.style.color = 'white';

      // Enviar Email
      const sendEmailCell = document.createElement('td');
      const sendEmailButton = document.createElement('button');
      sendEmailButton.textContent = 'SEND MAIL';
      sendEmailButton.addEventListener('click', () => sendEmail(media, emailStatusCell));
      sendEmailCell.appendChild(sendEmailButton);

      // Estado del Email
      const emailStatusCell = document.createElement('td');
      emailStatusCell.textContent = 'Pending';

      // Agregar celdas a la fila
      mediaRow.appendChild(qrCell);
      mediaRow.appendChild(participationNumberCell);
      mediaRow.appendChild(nameCell);
      mediaRow.appendChild(emailCell);
      mediaRow.appendChild(phoneCell);
      mediaRow.appendChild(typeCell);
      mediaRow.appendChild(instagramCell);
      mediaRow.appendChild(statusCell);
      mediaRow.appendChild(dayCell);
      mediaRow.appendChild(timeCell);
      mediaRow.appendChild(registerStatusCell);
      mediaRow.appendChild(sendEmailCell);
      mediaRow.appendChild(emailStatusCell);

      // Agregar fila a la tabla
      mediaTable.appendChild(mediaRow);
    });

    // Agregar la tabla al contenedor en el DOM
    mediaListContainer.appendChild(mediaTable);

    // Cerrar el modal cuando se haga clic en el botón de cerrar
    const closeModal = document.getElementsByClassName('close')[0];
    closeModal.onclick = function() {
      const modal = document.getElementById('qrModal');
      modal.style.display = 'none';
    };

    // Cerrar el modal cuando se haga clic fuera del contenido del modal
    window.onclick = function(event) {
      const modal = document.getElementById('qrModal');
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
  } catch (error) {
    console.error('Error fetching or displaying media data:', error);
  }
});
