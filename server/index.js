// indexedDB.JS/
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream'); // Usar Readable stream en lugar de PassThrough
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4000;

const pdfDir = path.join(__dirname, 'pdf');
if (!fs.existsSync(pdfDir)){
    fs.mkdirSync(pdfDir);
}



app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/save-pdf', (req, res) => {
  const { imgData, mediaId } = req.body;
  if (!imgData || !mediaId) {
      console.error('No se recibieron datos de imagen o ID de media');
      return res.status(400).json({ success: false, error: 'No se recibieron datos de imagen o ID de media' });
  }

  const base64Data = imgData.replace(/^data:image\/png;base64,/, "");
  
  const filename = `ticket_${mediaId}.pdf`;
  const filePath = path.join(pdfDir, filename);

  // Crear el PDF
  const pdf = new PDFDocument();
  const stream = fs.createWriteStream(filePath);

  pdf.pipe(stream);

  try {
      pdf.image(Buffer.from(base64Data, 'base64'), {
          fit: [500, 500],
          align: 'center',
          valign: 'center'
      });

      pdf.end();

      stream.on('finish', () => {
          console.log(`PDF guardado exitosamente: ${filename}`);
          res.json({ success: true, filename: filename });
      });

      stream.on('error', (err) => {
          console.error('Error al guardar el PDF:', err);
          res.status(500).json({ success: false, error: 'Error al guardar el PDF' });
      });
  } catch (error) {
      console.error('Error al procesar la imagen:', error);
      res.status(500).json({ success: false, error: 'Error al procesar la imagen' });
  }
});


// Middleware para manejar JSON y datos de formulario
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Carpeta donde se guardarán los archivos
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre del archivo
  }
});

// Middleware para manejar la carga de archivos
const upload = multer({ storage });

// Configura la opción strictQuery
mongoose.set('strictQuery', true); // O false, dependiendo de tu preferencia

// Conectarse a MongoDB
const mongoURI = "mongodb+srv://media:87513011@media.muxl9.mongodb.net/?retryWrites=true&w=majority&appName=MEDIA";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);  // Detener la aplicación si no se puede conectar a la base de datos
});


// Model schema
const modelSchema = new mongoose.Schema({
  participationNumber: { type: String, unique: true },
  fullName: String,
  emailAddress: String,
  phoneNumber: String,
  type: String,
  day: String,
  time: String,
  instagramUsername: String,
  status: { type: String, default: 'pending' },
  registerStatus: { type: String, default: 'No Register' } // Nuevo campo para el estado de registro
});

const Media = mongoose.model('Media', modelSchema);

// Endpoint para registrar un nuevo media
app.post('/register', upload.single('profilePicture'), async (req, res) => {
  const { fullName, emailAddress, phoneNumber, type, instagramUsername, day, time } = req.body;
  console.log('Datos recibidos:', { fullName, emailAddress, phoneNumber, type, instagramUsername, day, time });

  try {
    const participationNumber = await generateParticipationNumber();
    const newMedia = new Media({
      participationNumber,
      fullName,
      emailAddress,
      phoneNumber,
      type,
      instagramUsername,
      day,
      time
    });
    await newMedia.save();
    res.status(201).json({ message: 'Media registered successfully', participationNumber });
  } catch (err) {
    console.error('Error registering media:', err);
    res.status(500).json({ error: 'An error occurred while registering the media' });
  }
});

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../client')));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para obtener todos los media
app.get('/media', async (req, res) => {
  try {
    const media = await Media.find().select('-__v'); // Excluye el campo __v si no lo necesitas
    console.log('Media enviados:', media); // Añade este log
    res.json(media);
  } catch (error) {
    console.error('Error al obtener media:', error);
    res.status(500).json({ success: false, message: 'Error fetching media' });
  }
});

// Ruta para obtener un media por ID
app.get('/media/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/login.html'));
});

// Ruta para actualizar el estado de registro de un medio
app.put('/media/:id/register', async (req, res) => {
  try {
    const mediaId = req.params.id;
    console.log(`Received request to update register status for media ID: ${mediaId}`);
    const updatedMedia = await Media.findByIdAndUpdate(
      mediaId,
      { registerStatus: 'REGISTER' },
      { new: true }
    );
    if (!updatedMedia) {
      return res.status(404).json({ message: 'Media not found' });
    }
    res.json(updatedMedia);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para enviar un correo con PDF adjunto
app.post('/send-email', async (req, res) => {
  const { email, participationNumber, name, phone, type, instagram, status, day, time, mediaId } = req.body;

  try {
    // Buscar el archivo PDF correspondiente
    const pdfFilename = `ticket_${mediaId}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).send('PDF not found');
    }

    // Leer el archivo PDF
    const pdfBuffer = fs.readFileSync(pdfPath);


    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'r7nyfw@gmail.com',
        pass: 'ugxulskgqiuwehcz'
      }
    });

    const emailTemplate = `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

<head>
	<title></title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
	<link href="https://fonts.googleapis.com/css2?family=Lato:wght@100;200;300;400;500;600;700;800;900" rel="stylesheet" type="text/css"><!--<![endif]-->
	<style>
		@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;700&display=swap');
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
			font-family: 'Outfit', sans-serif;
			font-size: 20px;
			line-height: 1.1;
		}



  .botones-container {
    display: flex;
    justify-content: center;
  }

  .boton {
  	font-family: 'Outfit', Arial, sans-serif; /* Aplicar la fuente Outfit al texto */
  	 font-weight: bold; /* Aplicar negrita */
    color: #000;
    font-size: 15px;
    margin-top: 80px;
    padding: 10px 40px;
    margin: 10px;
    background-color: white;
    border-radius: 10px;
    color: #000;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
    transition: background-color 0.3s, color 0.3s, border-color 0.3s;
  }

  .boton:hover {
    background-color: #000;
    color: white;
  }

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		.desktop_hide,
		.desktop_hide table {
			mso-hide: all;
			display: none;
			max-height: 0px;
			overflow: hidden;
		}

		.image_block img+div {
			display: none;
			
		}

		h1{
			margin-bottom: -0px;
		}

		#footer{
			background-color: #000000;
			color: white;
		}

		#footer p{
			text-align: center;
			font-size: 13px;
			padding: 40px 40px;
		}

		@media (max-width:620px) {
			.desktop_hide table.icons-inner {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.mobile_hide {
				display: none;
			}

			.row-content {
				width: 100% !important;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}
		}
	</style>
</head>

<body class="body" style="margin: 0; background-color: #ffffff; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
		<tbody>
			<tr>
				<td>
					<table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; background-color: #ffffff; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
												
													<table class="image_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="width:100%;">
																<div class="alignment" align="center" style="line-height:10px">
																	<div style="max-width: 600px;"><img src="https://runway7.fashion/wp-content/uploads/2024/08/CABECERA.jpg" style="display: block; height: auto; border: 0; width: 100%;" width="600" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>

												
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<div class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
						<h1 class="h1">Congratulations, ${name} <br>
							Enjoy your Media Pass</h1>	
					</div>
					<table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 630px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; background-color: #ffffff; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-lessft: 0px;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-left:15px;padding-right:15px;width:100%;">
																<div class="alignment" align="center" style="line-height:10px">
																	<div style="max-width: 640px;"><a href="" target="_blank" style="outline:none" tabindex="-1"><img src="https://runway7.fashion/wp-content/uploads/2024/08/CUERPO.png" style="display: block; height: auto; border: 0; width: 100%;" width="640" alt="I'm an image" title="I'm an image" height="auto"></a></div>
																</div>
															</td>
														</tr>
													</table>
													
												</td>
											</tr>
										</tbody>
									</table>
									<div class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 600px; margin: 0 auto;" width="500">
										<div id="footer" class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; background-color: #000; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-lessft: 0px;">
											<p>EVENT LOCATION: PARAMOUNT HOTEL 235 W 46TH STREET, NEW YORK, NY 10036 <br>
												10 Times Square, Suite 5049 <br>
												New York, NY 10018 <br>
												events@runway7fashion.com <br>
												Copyright © 2024 Runway 7 Fashion, All rights reserved.</p>
										</div>
										
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</td>
			</tr>
		</tbody>
	</table><!-- End -->
</body>

</html>
`;

    // Enviar correo
    await transporter.sendMail({
      from: 'info@runway7fashion.com',
      to: email,
      subject: 'Your Media Details',
      html: emailTemplate,
      attachments: [{
        filename: 'media-details.pdf',
        content: pdfBuffer
      }]
    });

    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending email');
  }
});

// Función para generar el número de participación
async function generateParticipationNumber() {
  const lastMedia = await Media.findOne().sort({ participationNumber: -1 });
  if (!lastMedia || !lastMedia.participationNumber) {
    return '0001';
  }
  const lastNumber = parseInt(lastMedia.participationNumber, 10);
  if (lastNumber >= 9000) {
    throw new Error('Se ha alcanzado el número máximo de participaciones');
  }
  return (lastNumber + 1).toString().padStart(4, '0');
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
