
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure worker using URL
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const getTextFromFile = async (file: File): Promise<string> => {
  try {
    if (file.type === 'application/pdf') {
      console.log('Processing PDF file:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      
      try {
        console.log('Starting PDF parsing with pdf.js');
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Extract text from all pages with enhanced handling
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          
          // Get text content with detailed layout information
          const content = await page.getTextContent({
            includeMarkedContent: true
          });
          
          // Sort items by their vertical position first, then horizontal
          const items = content.items.sort((a: any, b: any) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) < 5) { // Items on roughly the same line
              return a.transform[4] - b.transform[4]; // Sort by x position
            }
            return yDiff;
          });
          
          let lastY = 0;
          let lineText = '';
          
          // Process each text item
          items.forEach((item: any) => {
            const y = item.transform[5];
            const text = item.str.trim();
            
            // Skip empty items
            if (!text) return;
            
            // Check if we're on a new line
            if (lastY && Math.abs(y - lastY) > 5) {
              fullText += lineText.trim() + '\n';
              lineText = '';
            }
            
            // Add space between words if needed
            if (lineText && !lineText.endsWith(' ') && !text.startsWith(' ')) {
              lineText += ' ';
            }
            
            lineText += text;
            lastY = y;
          });
          
          // Add the last line
          if (lineText.trim()) {
            fullText += lineText.trim() + '\n';
          }
        }
        
        // Clean up the extracted text
        fullText = fullText
          .replace(/[\r\n]{3,}/g, '\n\n') // Remove excessive newlines
          .replace(/[^\S\r\n]+/g, ' ') // Normalize spaces
          .replace(/[-‐‑‒–—―]+/g, '-') // Normalize hyphens
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
          .trim();
        
        console.log('PDF parsing complete, extracted text length:', fullText.length);
        return fullText;
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        throw new Error(`Failed to parse PDF: ${pdfError.message}`);
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('Processing DOCX file:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (file.type === 'application/msword') {
      throw new Error('DOC format is not supported, please convert to DOCX or PDF');
    }
    
    throw new Error(`Unsupported file type: ${file.type}`);
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${file.name}: ${error.message}`);
  }
};
