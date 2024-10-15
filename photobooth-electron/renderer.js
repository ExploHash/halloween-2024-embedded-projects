// renderer.js
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const countdownDisplay = document.getElementById('countdown');
let imageDisplay;
const capturedImages = []; // Array to store captured image Blobs
let isTakingPicture = false;
const countdownFrom = 5;
const showImageMs = 3000;
let isInEndScreen = false;
let isShowingImage = false;
let endscreenCountdown = 30;
let endCountdownInterval;
let isProcessingImage = false;
let showImageTimeout;
let isShowingPreparing = false;
let isUploading = false;
const apiUrl = "https://halloween-photobooth.huisbitches.com";

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: 1920,
            height: 1080,
            frameRate: 30
        }
    });
    video.srcObject = stream;
}

function startCountdown() {
    if (isTakingPicture) {
        return;
    }

    if (isShowingPreparing) {
        return;
    }

    if(isInEndScreen) {
        const endInstructions = document.querySelector('#end-instructions');
        endInstructions.style.opacity = 0;
        isInEndScreen = false;
        const firstInstructions = document.querySelector('#first-instructions');
        firstInstructions.style.opacity = 1;

        clearInterval(endCountdownInterval);

        // Clear the qr code
        document.getElementById("qr-code").innerHTML = '';
        endscreenCountdown = 30;

        return;
    }

    if (isShowingImage) {
        clearTimeout(showImageTimeout);
        const imageDisplay = document.querySelector('#overlayImage');
        imageDisplay.style.display = 'none';
        isShowingImage = false;
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
            }, 50);
        }
    }, 1000);
}

function captureImage() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL and display it
    const dataURL = canvas.toDataURL('image/png');
    showImage(dataURL);
    
    // Convert the captured image to a Blob
    canvas.toBlob((blob) => {
        if (blob) {
            capturedImages.push(blob); // Add the Blob to the array

            // If we have 3 images, upload them
            if (capturedImages.length === 3) {
                isUploading = true;
                uploadImages(capturedImages);
                capturedImages.length = 0; // Clear the array after uploading
            }
        }
    }, 'image/png');

    window.electron.saveImage(dataURL);
}

function showImage(dataURL) {
    isShowingImage = true;
    // Create a data URL for the image to display it
    const imageDisplay = document.querySelector('#overlayImage');
    imageDisplay.src = dataURL;
    imageDisplay.style.display = 'block';


    // Hide the image after 3 seconds
    showImageTimeout = setTimeout(() => {
        imageDisplay.style.display = 'none';
        if(capturedImages.length !== 0) {
            const everyInstructions = document.querySelector('#every-instructions');
            everyInstructions.style.opacity = 1;
            everyInstructions.innerHTML = `<h1>Press the button to start the countdown (${capturedImages.length + 1}/3)</h1>`;
        } else {
            if (isUploading) {
                isShowingPreparing = true;
                const preparingInstructions = document.querySelector('#preparing-instructions');
                preparingInstructions.style.opacity = 1;
            } else {
                showEndScreen();
            }
        }
        isShowingImage = false;
    }, showImageMs);
}

function showEndScreen() {
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

            document.getElementById("qr-code").innerHTML = '';
        }
        restartCountdown.innerText = endscreenCountdown;
    }, 1000);
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
        isUploading = false;

        if (isShowingPreparing) {
            isShowingPreparing = false;
            showEndScreen();

            const preparingInstructions = document.querySelector('#preparing-instructions');
            preparingInstructions.style.opacity = 0;
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
