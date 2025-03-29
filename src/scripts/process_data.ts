import fs from 'fs/promises';
import path from 'path';
import { SupabaseService } from '../services/supabase';
import { VoyageService } from '../services/voyage';

const DATA_DIR = path.join(__dirname, '..', 'data');

// Clean text by removing problematic characters
function cleanText(text: string): string {
  return text
    .replace(/\0/g, '') // Remove null characters
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Remove invalid Unicode characters
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\\u[0-9a-fA-F]{4}/g, '') // Remove Unicode escape sequences
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep only printable characters
    .trim();
}

async function getFilePairs(): Promise<{ content: string; metadata: string; title: string }[]> {
  const files = await fs.readdir(DATA_DIR);
  const pairs: { content: string; metadata: string; title: string }[] = [];
  
  // Find pairs of files (content and metadata)
  for (const file of files) {
    if (!file.endsWith('_metadata.txt')) {
      const contentPath = path.join(DATA_DIR, file);
      const metadataPath = path.join(DATA_DIR, file.replace('.txt', '_metadata.txt'));
      
      try {
        // Always read content file
        const content = await fs.readFile(contentPath, 'utf-8');
        
        // Try to read metadata file, use empty string if it doesn't exist
        let metadata = '';
        try {
          metadata = await fs.readFile(metadataPath, 'utf-8');
        } catch (metadataError) {
          console.log(`No metadata file found for ${file}, continuing with empty metadata`);
        }
        
        // Clean all text before adding to pairs
        pairs.push({
          content: cleanText(content),
          metadata: cleanText(metadata),
          title: cleanText(file.replace('.txt', ''))
        });
      } catch (error) {
        console.error(`Error reading files for ${file}:`, error);
      }
    }
  }
  
  return pairs;
}

async function main() {
  try {
    const supabase = new SupabaseService();
    const voyage = new VoyageService();
    
    console.log('Finding file pairs...');
    const pairs = await getFilePairs();
    console.log(`Found ${pairs.length} file pairs`);
    
    for (const pair of pairs) {
      console.log(`\nProcessing: ${pair.title}`);
      
      try {
        // Store the file record
        const fileId = await supabase.storeFile({
          title: pair.title,
          metadata: pair.metadata,
          created_at: new Date()
        });
        
        console.log('File record stored with ID:', fileId);
        
        // Chunk and clean the content
        const chunks = supabase.chunkText(pair.content).map(cleanText);
        console.log(`Generated ${chunks.length} chunks`);
        
        // Batch process embeddings
        console.log('Generating embeddings in batches...');
        const embeddings = await voyage.batch_embed_documents(chunks);
        
        if (!embeddings) {
          console.error('Failed to generate embeddings for', pair.title);
          continue;
        }
        
        // Store embeddings
        console.log('Storing embeddings...');
        for (let i = 0; i < chunks.length; i++) {
          const embedding = embeddings[i];
          if (embedding && Array.isArray(embedding)) {
            await supabase.storeEmbedding(fileId, chunks[i], embedding);
            console.log(`Stored embedding ${i + 1}/${chunks.length}`);
          } else {
            console.error(`Failed to generate embedding for chunk ${i + 1}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${pair.title}:`, error);
        continue; // Continue with next file if one fails
      }
    }
    
    console.log('\nFinished processing all files!');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

main();