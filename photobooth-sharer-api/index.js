const Koa = require('koa');
const Router = require('@koa/router');
const multer = require('@koa/multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
dotenv.config();

const app = new Koa();
const router = new Router();

// Configure AWS S3
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Endpoint to upload images
router.post('/upload', upload.array('images'), async (ctx) => {
    const uuid = uuidv4();
    const uploadPromises = ctx.files.map(file => {
        const fileStream = fs.createReadStream(file.path);
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: `${uuid}/${file.originalname}`,
            Body: fileStream
        };
        return s3.upload(uploadParams).promise();
    });

    try {
        await Promise.all(uploadPromises);
        // Clean up uploaded files
        ctx.files.forEach(file => fs.unlinkSync(file.path));
        ctx.body = { message: 'Files uploaded successfully', uuid };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: 'Error uploading files' };
    }
});

// Endpoint to render HTML with image links
router.get('/view/:uuid', async (ctx) => {
    const { uuid } = ctx.params;
    const params = {
        Bucket: BUCKET_NAME,
        Prefix: `${uuid}/`
    };

    try {
        const data = await s3.listObjectsV2(params).promise();
        const imageUrls = data.Contents.map(item => {
            const fileName = path.basename(item.Key);
            return {
                url: `/download/${uuid}/${fileName}`,
                name: fileName
            };
        });

        const html = `
            <html>
            <head>
                <title>Images for ${uuid}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
                <h1>Your scary images</h1>
                <ul>
                    ${imageUrls.map(image => `
                        <div>
                            <img src="${image.url}" alt="${image.name}" style="max-width: 300px;" />
                            <div><a href="${image.url}" download="${image.name}">Download</a></div>
                        </div>`).join('')}
                </ul>
            </body>
            </html>
        `;

        ctx.type = 'text/html';
        ctx.body = html;
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: 'Error fetching image list' };
    }
});

// Endpoint to download the image
router.get('/download/:uuid/:filename', async (ctx) => {
    const { uuid, filename } = ctx.params;
    const params = {
        Bucket: BUCKET_NAME,
        Key: `${uuid}/${filename}`
    };

    try {
        const data = await s3.getObject(params).promise();
        ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
        ctx.set('Content-Type', data.ContentType);
        ctx.body = data.Body;
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: 'Error downloading file' };
    }
});

// Use the routes defined
app.use(router.routes()).use(router.allowedMethods());

// Start the server
const start = async () => {
    const port = 3000;
    try {
        app.listen(port, () => {
            console.log(`Server listening on http://localhost:${port}`);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
