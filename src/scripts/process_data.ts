import fs from 'fs/promises';
import path from 'path';
import { SupabaseService } from '../services/supabase';
import { VoyageService } from '../services/voyage';

const DATA_DIR = path.join(__dirname, '..', 'data');

async function getFilePairs(): Promise<{ content: string; metadata: string; title: string }[]> {
  const files = await fs.readdir(DATA_DIR);
  const pairs: { content: string; metadata: string; title: string }[] = [];
  
  // Find pairs of files (content and metadata)
  for (const file of files) {
    if (!file.endsWith('_metadata.txt')) {
      const contentPath = path.join(DATA_DIR, file);
      const metadataPath = path.join(DATA_DIR, file.replace('.txt', '_metadata.txt'));
      
      try {
        const [content, metadata] = await Promise.all([
          fs.readFile(contentPath, 'utf-8'),
          fs.readFile(metadataPath, 'utf-8')
        ]);
        
        pairs.push({
          content,
          metadata,
          title: file.replace('.txt', '')
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
      
      // Store the file record
      const fileId = await supabase.storeFile({
        title: pair.title,
        metadata: pair.metadata,
        created_at: new Date()
      });
      
      console.log('File record stored with ID:', fileId);
      
      // Chunk the content
      const chunks = supabase.chunkText(pair.content);
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
    }
    
    console.log('\nFinished processing all files!');
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();