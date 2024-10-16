const countdownFrom = 5;
const showImageMs = 3000;
const apiUrl = "https://halloween-photobooth.huisbitches.com";

const capturedImages = []; // Array to store captured image Blobs
let isTakingPicture = false;
let isInEndScreen = false;
let isShowingImage = false;
let endscreenCountdown = 30;
let endCountdownInterval;
let isProcessingImage = false;
let showImageTimeout;
let isShowingPreparing = false;
let isUploading = false;

async function initCamera() {
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: 1920,
            height: 1080,
            frameRate: 30
        }
    });
    video.srcObject = stream;
}

function buttonPressed() {
    // If we are already taking a picture or showing the preparing screen, return
    if (isTakingPicture || isShowingPreparing || isShowingImage) {
        return;
    }

    // If we are showing the end screen, hide it
    if (isInEndScreen) {
        hideEndScreen();
        showFirstInstructions();
        return;
    }

    startCountdown();
}

function startCountdown() {
    isTakingPicture = true;

    // Reset and show the countdown
    let countdown = countdownFrom;
    showCountdown();
    updateCountdown(countdown);

    // Hide first and every instructions
    hideFirstInstructions();
    hideEveryInstructions();

    const interval = setInterval(() => {
        updateCountdown(--countdown);

        if (countdown <= 0) {
            clearInterval(interval);
            setTimeout(() => {
                hideCountdown();
                captureImage();
                isTakingPicture = false;
            }, 50);
        }
    }, 1000);
}

function captureImage() {
    // Draw the video frame to the canvas
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
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
                uploadImages(capturedImages);
                capturedImages.length = 0; // Clear the array after uploading
            }
        }
    }, 'image/png');

    window.electron.saveImage(dataURL);
}

function showImage(dataURL) {
    isShowingImage = true;
    showOverlayImage(dataURL);

    // Hide the image after 3 seconds
    showImageTimeout = setTimeout(() => {
        hideOverlayImage();

        // If we have captured 3 images, show the preparing screen
        if(capturedImages.length === 0) {
            if (isUploading) {
                showPreparingInstructions();
            } else {
                showEndScreen();
            }
        } else {
            showEveryInstructions();
        }
    }, showImageMs);
}

function showEndScreen() {
    const endInstructions = document.querySelector('#end-instructions');
    endInstructions.style.opacity = 1;
    isInEndScreen = true;

    endCountdownInterval = setInterval(() => {
        updateEndScreenCountdown();

        if (endscreenCountdown <= 0) {
            hideEndScreen();
            showFirstInstructions();
        }
    }, 1000);
}

function showOverlayImage(dataURL) {
    const imageDisplay = document.querySelector('#overlayImage');
    imageDisplay.style.display = 'block';
    imageDisplay.src = dataURL;
}

function hideOverlayImage() {
    clearTimeout(showImageTimeout);
    const imageDisplay = document.querySelector('#overlayImage');
    imageDisplay.style.display = 'none';
    isShowingImage = false;
}

function showFirstInstructions() {
    const firstInstructions = document.querySelector('#first-instructions');
    firstInstructions.style.opacity = 1;
}

function hideFirstInstructions() {
    const firstInstructions = document.querySelector('#first-instructions');
    firstInstructions.style.opacity = 0;
}

function hideEndScreen() {
    const endInstructions = document.querySelector('#end-instructions');
    endInstructions.style.opacity = 0;
    isInEndScreen = false;
    clearInterval(endCountdownInterval);
    // Clear the qr code
    document.getElementById("qr-code").innerHTML = '';
    endscreenCountdown = 30;
}

function showCountdown() {
    const countdownDisplay = document.getElementById('countdown');
    countdownDisplay.style.display = 'block';
}

function hideCountdown() {
    const countdownDisplay = document.getElementById('countdown');
    countdownDisplay.style.display = 'none';
}

function updateCountdown(countdown) {
    const countdownDisplay = document.getElementById('countdown');
    countdownDisplay.innerText = countdown;
}

function hideEveryInstructions() {
    const everyInstructions = document.querySelector('#every-instructions');
    everyInstructions.style.opacity = 0;
}

function showEveryInstructions() {
    const everyInstructions = document.querySelector('#every-instructions');
    everyInstructions.style.opacity = 1;
    everyInstructions.innerHTML = `<h1>Press the button to start the countdown (${capturedImages.length + 1}/3)</h1>`;
}

function showPreparingInstructions() {
    const preparingInstructions = document.querySelector('#preparing-instructions');
    preparingInstructions.style.opacity = 1;
    isShowingPreparing = true;
}

function hidePreparingInstructions() {
    const preparingInstructions = document.querySelector('#preparing-instructions');
    preparingInstructions.style.opacity = 0;
    isShowingPreparing = false;
}

function updateEndScreenCountdown() {
    const restartCountdown = document.querySelector('#restart-countdown');
    restartCountdown.innerText = --endscreenCountdown;
}

// Function to upload images to a specified URL using FormData
async function uploadImages(images) {
    isUploading = true;
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
window.electron.onButtonPressed(() => {
    buttonPressed();
});

video.addEventListener('click', buttonPressed);
window.addEventListener('load', initCamera);
