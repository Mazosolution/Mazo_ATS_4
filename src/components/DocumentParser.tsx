
import { supabase } from "@/integrations/supabase/client";
import type { ParsedDocument, ParsedResume } from '@/types';
import { BATCH_SIZE } from '@/utils/parser/constants';
import { extractContactInfo } from '@/utils/parser/contactExtractor';
import { extractName } from '@/utils/parser/nameExtractor';
import { getTextFromFile } from '@/utils/parser/documentTextExtractor';

export const parseDocument = async (file: File, type: 'resume' | 'jd'): Promise<ParsedDocument | ParsedResume> => {
  try {
    console.log('Starting to parse document:', file.name, 'type:', file.type);
    const text = await getTextFromFile(file);
    console.log('Successfully extracted text from file:', file.name);
    
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        const { data, error } = await supabase.functions.invoke('parse-document', {
          body: { documentText: text, documentType: type }
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }

        console.log('Successfully parsed document with Supabase function:', data);

        if (type === 'resume') {
          const contactInfo = extractContactInfo(text);
          const name = extractName(text);
          return {
            title: data.title || '',
            name: name || data.name || '',
            email: contactInfo.email || data.email || '',
            phone: contactInfo.phone || data.phone || '',
            skills: Array.isArray(data.skills) ? data.skills : [data.skills].filter(Boolean),
            experience: data.experience?.toString() || '',
            education: data.education || '',
            responsibilities: []
          } as ParsedResume;
        } else {
          return {
            title: data.title || '',
            skills: Array.isArray(data.skills) ? data.skills : [data.skills].filter(Boolean),
            experience: data.experience?.toString() || '',
            responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [data.responsibilities].filter(Boolean)
          };
        }
      } catch (error) {
        console.error('Error in parse attempt:', error);
        lastError = error;
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Error parsing document:', error);
    throw error;
  }
};

export const processBatch = async <T extends File>(
  files: T[],
  type: 'resume' | 'jd',
  onProgress?: (progress: number) => void
): Promise<ParsedDocument[]> => {
  const results: ParsedDocument[] = [];
  const totalFiles = files.length;
  
  console.log(`Starting batch processing of ${files.length} files`);
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(file => parseDocument(file, type));
    
    try {
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          console.log(`Successfully processed ${batch[index].name}`);
        } else {
          console.error(`Failed to parse ${batch[index].name}:`, result.reason);
        }
      });
      
      if (onProgress) {
        const progress = Math.min(((i + batch.length) / totalFiles) * 100, 100);
        onProgress(progress);
      }
      
      if (i + BATCH_SIZE < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
  
  console.log(`Batch processing complete. Processed ${results.length} out of ${files.length} files`);
  return results;
};

export default {
  parseDocument,
  processBatch,
};
