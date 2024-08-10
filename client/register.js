document.addEventListener('DOMContentLoaded', function() {
  const daySelect = document.getElementById('day');
  const timeSelect = document.getElementById('time');

  // Manejo del envío del formulario
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Validar campos de día y hora
    const day = formData.get('day');
    const time = formData.get('time');

    if (!day || !time) {
      alert('Please select both day and time.');
      return;
    }

    try {
      const response = await fetch('/register', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Si el registro fue exitoso, redirigir a media.html
      window.location.href = '/media.html';
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while registering. Please try again.');
    }
  });
});

