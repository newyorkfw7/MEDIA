const express = require('express');
const fs = require('fs');
const path = require('path');
const pdfMake = require('pdfmake');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch'); // Asegúrate de tener esta dependencia
const { v4: uuidv4 } = require('uuid'); // Para generar nombres únicos para los archivos

const app = express();
app.use(express.json());

const printer = new pdfMake.Printer({
    Roboto: {
        normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, 'fonts/Roboto-Bold.ttf'),
        italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, 'fonts/Roboto-BoldItalic.ttf')
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'r7nyfw@gmail.com',
        pass: 'yourpassword'
    }
});

app.post('/send-pdf', async (req, res) => {
    const media = req.body;
    const participationNumber = media.participationNumber || 'N/A';
    const name = media.fullName || 'N/A';
    const phone = media.phone || 'N/A';
    const type = media.type || 'N/A';
    const instagram = media.instagram || 'N/A';
    const status = media.status || 'N/A';
    const day = media.day || 'N/A';
    const time = media.time || 'N/A';

    // Generar QR code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`http://localhost:3000/mediaDetail.html?id=${media._id}`)}`;
    const qrCodeResponse = await fetch(qrCodeUrl);
    const qrCodeBuffer = await qrCodeResponse.buffer();

    // Logo en base64
    const logoUrl = 'https://runway7.fashion/wp-content/uploads/2024/07/R7FEMAIL.png';
    const base64Logo = await getBase64Image(logoUrl);

    const docDefinition = {
        pageSize: { width: 450, height: 'auto' },
        pageMargins: [20, 20, 20, 20],
        content: [
            { text: 'NYFW', style: 'title1' },
            { text: '2024', style: 'title2' },
            { text: `Participation Number: ${participationNumber}`, style: 'subheader' },
            { text: name, style: 'name' },
            { text: `Type: ${type}`, style: 'text' },
            { text: `Phone: ${phone}`, style: 'text' },
            { text: `Instagram: ${instagram}`, style: 'text' },
            { text: `Status: ${status}`, style: 'text' },
            { text: `Day: ${day}`, style: 'text' },
            { text: `Time: ${time}`, style: 'text' },
            {
                columns: [
                    {
                        width: 'auto',
                        stack: [
                            { image: qrCodeBuffer.toString('base64'), width: 150, height: 150, style: 'qrCode' }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { image: `data:image/png;base64,${base64Logo}`, width: 100, height: 'auto', style: 'logo' }
                        ],
                        alignment: 'right'
                    }
                ],
                margin: [0, 20, 0, 0]
            },
            { text: 'REGISTER', style: 'registerButton' }
        ],
        styles: {
            title1: {
                fontSize: 48,
                bold: true,
                font: 'Playfair',
                alignment: 'center',
                margin: [0, 20, 0, 0]
            },
            title2: {
                fontSize: 60,
                bold: true,
                font: 'Playfair',
                alignment: 'center',
                margin: [0, 0, 0, 20]
            },
            subheader: {
                fontSize: 24,
                font: 'Outfit',
                margin: [0, 20, 0, 10]
            },
            name: {
                fontSize: 30,
                font: 'Outfit',
                margin: [0, 0, 0, 10],
                alignment: 'center'
            },
            text: {
                fontSize: 16,
                font: 'Outfit',
                margin: [0, 5, 0, 5]
            },
            qrCode: {
                margin: [0, 20, 0, 20]
            },
            logo: {
                margin: [0, 20, 0, 20]
            },
            registerButton: {
                fontSize: 16,
                font: 'Outfit',
                alignment: 'center',
                color: 'white',
                fillColor: 'black',
                bold: true,
                margin: [0, 20, 0, 20],
                borderRadius: 12
            }
        }
    };

    // Crear el PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const fileName = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, fileName);
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.end();

    pdfDoc.on('end', async () => {
        const mailOptions = {
            from: 'r7nyfw@gmail.com',
            to: 'recipient@example.com', // Aquí puedes poner el correo del destinatario
            subject: 'Media Details',
            text: 'Please find attached the media details for your participation.',
            attachments: [
                {
                    filename: fileName,
                    path: filePath
                }
            ]
        };

        try {
            await transporter.sendMail(mailOptions);
            fs.unlinkSync(filePath); // Borra el archivo PDF después de enviarlo
            res.status(200).send('Email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error);
            res.status(500).send('Failed to send email');
        }
    });
});

function getBase64Image(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(res => res.buffer())
            .then(buffer => {
                resolve(buffer.toString('base64'));
            })
            .catch(err => reject(err));
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
