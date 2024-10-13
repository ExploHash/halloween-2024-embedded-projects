// renderer.js
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const countdownDisplay = document.getElementById('countdown');
let imageDisplay;
const capturedImages = []; // Array to store captured image Blobs
let isTakingPicture = false;
const countdownFrom = 1;
const showImageMs = 500;
let isInEndScreen = false;
let endscreenCountdown = 60;
let endCountdownInterval;
const apiUrl = "http://192.168.42.155:3000";

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

function startCountdown() {
    if (isTakingPicture) {
        return;
    }
    if(isInEndScreen) {
        const endInstructions = document.querySelector('#end-instructions');
        endInstructions.style.opacity = 0;
        isInEndScreen = false;

        const firstInstructions = document.querySelector('#first-instructions');
        firstInstructions.style.opacity = 1;

        clearInterval(endCountdownInterval);

        return;
    }

    isTakingPicture = true;

    let countdown = countdownFrom;
    countdownDisplay.innerText = countdown;
    countdownDisplay.style.display = 'block';

    const instructions = document.querySelector('#first-instructions');
    if (instructions.style.opacity !== 0) {
        instructions.style.opacity = 0;
    }

    const everyInstructions = document.querySelector('#every-instructions');
    if (everyInstructions.style.opacity !== 0) {
        everyInstructions.style.opacity = 0;
    }


    const interval = setInterval(() => {
        countdown--;
        countdownDisplay.innerText = countdown;

        if (countdown <= 0) {
            clearInterval(interval);
            setTimeout(() => {
                countdownDisplay.style.display = 'none';
                captureImage();
                isTakingPicture = false;
            }, 100);
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
        if(capturedImages.length !== 0) {
            const everyInstructions = document.querySelector('#every-instructions');
            everyInstructions.style.opacity = 1;
            everyInstructions.innerHTML = `<h1>Press the button to start the countdown (${capturedImages.length + 1}/3)</h1>`;
        } else {
            const endInstructions = document.querySelector('#end-instructions');
            endInstructions.style.opacity = 1;
            isInEndScreen = true;

            endCountdownInterval = setInterval(() => {
                endscreenCountdown--;
                const restartCountdown = document.querySelector('#restart-countdown');

                if (endscreenCountdown <= 0) {
                    clearInterval(endCountdownInterval);
                    endscreenCountdown = 30;
                    const firstInstructions = document.querySelector('#first-instructions');
                    firstInstructions.style.opacity = 1;

                    const endInstructions = document.querySelector('#end-instructions');
                    endInstructions.style.opacity = 0;
                }
                restartCountdown.innerText = endscreenCountdown;

            }, 1000);


        }
    }, showImageMs);
}

// Function to upload images to a specified URL using FormData
async function uploadImages(images) {
    const formData = new FormData();

    images.forEach((image, index) => {
        formData.append('images', image, `image-${index}.png`);
    });

    try {
        const response = await fetch(apiUrl + "/upload", {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            console.log('Images uploaded successfully');
            // Update qr code with received uuid
            const data = await response.json();
            document.getElementById("qr-code").innerHTML = '';
            new QRCode(document.getElementById("qr-code"), `${apiUrl}/view/${data.uuid}`);
        } else {
            console.error('Error uploading images');
        }
    } catch (error) {
        console.error('Error uploading images:', error);
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
