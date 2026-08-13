// Quick test of the direct PDF text extractor
import { extractPdfText } from '../lib/pdfTextExtract'

const minimalPDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length 88>>stream\nBT /F1 12 Tf 100 700 Td (John Smith) Tj ET\nBT /F1 12 Tf 100 680 Td (Software Engineer) Tj 0 -20 Td (5 years experience) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000298 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n450\n%%EOF'
)

const imagePDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</XObject<</Img 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/XObject/Subtype/Image/Width 1/Height 1/ColorSpace/DeviceGray/BitsPerComponent 8/Length 1>>stream\n\x00\nendstream\nendobj\n5 0 obj<</Length 50>>stream\nq 612 0 0 792 0 0 cm /Img Do Q\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000133 00000 n \n0000000288 00000 n \n0000000391 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n496\n%%EOF'
)

console.log('--- Text PDF ---')
console.log('Result:', JSON.stringify(extractPdfText(minimalPDF)))
console.log('Length:', extractPdfText(minimalPDF).length)

console.log('\n--- Image PDF ---')
console.log('Result:', JSON.stringify(extractPdfText(imagePDF)))
console.log('Length:', extractPdfText(imagePDF).length)