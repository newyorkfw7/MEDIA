document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Check credentials
    if (username === 'admin' && password === 'admin123') {
        window.location.href = '/media.html';
    } else {
        alert('Invalid username or password');
    }
});
