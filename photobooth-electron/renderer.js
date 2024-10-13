// renderer.js
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const countdownDisplay = document.getElementById('countdown');
let imageDisplay;
const capturedImages = []; // Array to store captured image Blobs
let isTakingPicture = false;

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

function startCountdown() {
    if (isTakingPicture) {
        return;
    }

    isTakingPicture = true;

    let countdown = 3;
    countdownDisplay.innerText = countdown;
    countdownDisplay.style.display = 'block';

    const instructions = document.querySelector('.instructions');
    if (instructions.style.display !== 'none') {
        instructions.style.display = 'none';
    }


    const interval = setInterval(() => {
        countdown--;
        countdownDisplay.innerText = countdown;

        if (countdown <= 0) {
            clearInterval(interval);
            countdownDisplay.style.display = 'none';
            captureImage();
            isTakingPicture = false;
        }
    }, 1000);
}

function captureImage() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert the captured image to a Blob
    canvas.toBlob((blob) => {
        if (blob) {
            capturedImages.push(blob); // Add the Blob to the array

            // If we have 3 images, upload them
            if (capturedImages.length === 3) {
                uploadImages(capturedImages);
                capturedImages.length = 0; // Clear the array after uploading
            }
        }
    }, 'image/png');

    // Convert canvas to data URL and display it
    const dataURL = canvas.toDataURL('image/png');
    showImage(dataURL);
}

function showImage(dataURL) {
    // Create a data URL for the image to display it
    const imageDisplay = document.querySelector('#overlayImage');
    imageDisplay.src = dataURL;
    imageDisplay.style.display = 'block';


    // Hide the image after 3 seconds
    setTimeout(() => {
        imageDisplay.style.display = 'none';
        window.electron.saveImage(dataURL);
    }, 3000);
}

// Function to upload images to a specified URL using FormData
async function uploadImages(images) {
    const formData = new FormData();

    // Append each image Blob to the FormData object
    images.forEach((image, index) => {
        formData.append(`image${index + 1}`, image, `image${index + 1}.png`);
    });

    try {
        const response = await fetch('https://your-upload-url.com/upload', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Upload successful:', result);
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

// Listen for image saved response
window.electron.onImageSaved((event, message) => {
    console.log(message);
});

// Listen for the start countdown signal from the main process
window.electron.onCountdownStart(() => {
    startCountdown();
});

video.addEventListener('click', startCountdown);
window.addEventListener('load', initCamera);
