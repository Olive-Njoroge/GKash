// Test OCR extraction directly
const fs = require('fs');
const path = require('path');

// Copy the OCR function from your authController
const axios = require('axios');
const FormData = require('form-data');

const extractTextFromImage = async (imageBuffer) => {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, 'image.jpg');
        formData.append('apikey', 'K87899142588957');
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('isTable', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2');

        console.log('Attempting OCR extraction...');
        
        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 30000,
            maxRedirects: 5
        });

        console.log('OCR Response status:', response.status);
        
        if (response.data.IsErroredOnProcessing) {
            console.error('OCR Error:', response.data.ErrorMessage);
            throw new Error(response.data.ErrorMessage || 'OCR processing failed');
        }

        const extractedText = response.data.ParsedResults[0]?.ParsedText || '';
        console.log('OCR extraction successful, text length:', extractedText.length);
        
        return extractedText;
    } catch (error) {
        console.error('OCR extraction error:', error.message);
        return 'OCR_EXTRACTION_FAILED';
    }
};

// Test function
const testOCR = async () => {
    console.log('=== OCR Test Tool ===');
    console.log('This tool helps debug OCR extraction');
    console.log('Place your ID image in this folder and rename it to "test-id.jpg"');
    
    const imagePath = path.join(__dirname, 'test-id.jpg');
    
    if (!fs.existsSync(imagePath)) {
        console.log('❌ No test image found. Please:');
        console.log('1. Copy your ID image to:', imagePath);
        console.log('2. Rename it to "test-id.jpg"');
        console.log('3. Run: node test-ocr.js');
        return;
    }
    
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        console.log('📸 Image loaded, size:', imageBuffer.length, 'bytes');
        
        const extractedText = await extractTextFromImage(imageBuffer);
        
        console.log('\n=== RAW OCR RESULT ===');
        console.log(extractedText);
        
        console.log('\n=== JSON FORMAT ===');
        console.log(JSON.stringify(extractedText, null, 2));
        
        console.log('\n=== LINE BY LINE ===');
        const lines = extractedText.split(/[\n\r]+/);
        lines.forEach((line, index) => {
            console.log(`${index + 1}: "${line.trim()}"`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

// Run the test
testOCR();