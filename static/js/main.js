// DOM Elements
const fileInput = document.getElementById('pdf-file');
const fileUploadArea = document.getElementById('file-upload-area');
const fileChosen = document.getElementById('file-chosen');
const fileSize = document.getElementById('file-size');
const uploadForm = document.getElementById('upload-form');
const convertBtn = document.getElementById('convert-btn');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultSection = document.getElementById('result-section');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const downloadLink = document.getElementById('download-link');
const newConversionBtn = document.getElementById('new-conversion-btn');
const errorMessage = document.getElementById('error-message');

// Variables
let progressInterval;

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    resultSection.style.display = 'none';
    progressSection.style.display = 'none';
}

function resetUI() {
    resultSection.style.display = 'none';
    errorMessage.style.display = 'none';
    progressBar.style.width = '0%';
}

function resetConvertButton() {
    convertBtn.disabled = false;
    convertBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i> Convert to Word';
}

function clearProgressSimulation() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
}

function simulateProgress() {
    let progress = 0;
    progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
    }, 200);
}

function showResult(result) {
    progressSection.style.display = 'none';
    resultSection.style.display = 'block';
    
    if (result.success) {
        resultIcon.innerHTML = '<i class="fas fa-check-circle text-success"></i>';
        resultTitle.textContent = 'Conversion Successful!';
        resultTitle.className = 'result-title text-success';
        resultMessage.textContent = result.message + ' Your file is ready to download.';
        resultMessage.className = 'result-message text-success';
        
        downloadLink.href = result.download_url;
        downloadLink.download = result.filename;
        downloadLink.style.display = 'inline-block';
        newConversionBtn.style.display = 'inline-block';
        
        // Auto-cleanup old files
        fetch('/cleanup', { method: 'POST' });
    } else {
        resultIcon.innerHTML = '<i class="fas fa-times-circle text-danger"></i>';
        resultTitle.textContent = 'Conversion Failed';
        resultTitle.className = 'result-title text-danger';
        resultMessage.textContent = result.message;
        resultMessage.className = 'result-message text-danger';
        downloadLink.style.display = 'none';
        newConversionBtn.style.display = 'inline-block';
    }
    
    resetConvertButton();
}

// Event Handlers
function updateFileInfo() {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileChosen.textContent = file.name;
        fileChosen.classList.add('file-name');
        
        // Display file size
        const size = formatFileSize(file.size);
        fileSize.textContent = `(${size})`;
        
        // Hide error message
        errorMessage.style.display = 'none';
    } else {
        fileChosen.textContent = 'No file chosen';
        fileChosen.classList.remove('file-name');
        fileSize.textContent = '';
    }
}

// File upload area click handler
fileUploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Drag and drop functionality
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    fileUploadArea.classList.add('dragover');
}

function unhighlight() {
    fileUploadArea.classList.remove('dragover');
}

fileUploadArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        fileInput.files = files;
        updateFileInfo();
    }
}

// File input change handler
fileInput.addEventListener('change', updateFileInfo);

// Form submission handler
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!fileInput.files.length) {
        showError('Please select a PDF file first');
        return;
    }

    // Check file size (50MB limit)
    const file = fileInput.files[0];
    if (file.size > 50 * 1024 * 1024) {
        showError('File size exceeds 50MB limit. Please select a smaller file.');
        return;
    }

    // Reset UI
    resetUI();
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Converting...';
    progressSection.style.display = 'block';

    // Show progress animation
    simulateProgress();

    try {
        const formData = new FormData();
        formData.append('pdf_file', file);
        
        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        // Stop progress simulation
        clearProgressSimulation();
        progressBar.style.width = '100%';
        progressText.textContent = 'Conversion complete!';
        
        // Show result after a brief delay
        setTimeout(() => {
            showResult(result);
        }, 500);
        
    } catch (error) {
        clearProgressSimulation();
        showError('Network error. Please check your connection and try again.');
        resetConvertButton();
    }
});

// New conversion button handler
newConversionBtn.addEventListener('click', function() {
    // Reset everything
    fileInput.value = '';
    fileChosen.textContent = 'No file chosen';
    fileChosen.classList.remove('file-name');
    fileSize.textContent = '';
    resultSection.style.display = 'none';
    errorMessage.style.display = 'none';
    convertBtn.disabled = false;
});

// Auto-cleanup on page load
window.addEventListener('load', function() {
    fetch('/cleanup', { method: 'POST' });
});

// Initialize
updateFileInfo();