
import { EMAIL_PATTERNS, PHONE_PATTERNS } from './constants';
import { cleanAndValidatePhone } from './phoneUtils';

export const extractContactInfo = (text: string) => {
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();

  const lines = cleanText.split('\n');
  const sections = {
    header: lines.slice(0, Math.min(10, lines.length)).join('\n'),
    contact: lines.slice(0, Math.min(20, lines.length)).join('\n'),
    full: cleanText
  };

  let emails: string[] = [];
  let phones: string[] = [];

  // Enhanced email extraction
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailsFound = cleanText.match(emailPattern) || [];
  emails = [...new Set(emailsFound)];

  // Enhanced phone extraction with multiple formats
  const phonePatterns = [
    /(?:(?:Phone|Mobile|Cell|Tel|Contact|Ph)(?:\s*[:.-])?\s*)?(\+?\d[\d\s-]{8,})/gi,
    /(\+\d{1,3}[-\s]?\d{10})/g,
    /(\d{3}[-\s]?\d{3}[-\s]?\d{4})/g,
    /(\+\d{1,3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{4})/g,
    /(\d{10})/g
  ];

  for (const pattern of phonePatterns) {
    let matches = cleanText.matchAll(pattern);
    for (const match of matches) {
      const phoneNumber = match[1]?.trim();
      if (phoneNumber) {
        const cleanedPhone = cleanAndValidatePhone(phoneNumber);
        if (cleanedPhone) {
          phones.push(cleanedPhone);
        }
      }
    }
  }

  // Filter valid emails
  const validEmails = [...new Set(emails)]
    .map(email => email.toLowerCase().trim())
    .filter(email => {
      return email.includes('@') && 
             email.includes('.') && 
             email.length >= 5 && 
             !email.includes('..') &&
             !email.startsWith('.') &&
             !email.endsWith('.') &&
             !email.includes('@.') &&
             !email.includes('.@') &&
             email.split('@')[1].includes('.') &&
             !/\s/.test(email);
    });

  // Filter valid phones
  const validPhones = [...new Set(phones)]
    .map(phone => cleanAndValidatePhone(phone))
    .filter(Boolean);

  return {
    email: validEmails[0] || '',
    phone: validPhones[0] || ''
  };
};
