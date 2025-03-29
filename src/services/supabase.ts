import { createClient } from '@supabase/supabase-js';
import { Article, FileRecord, EmbeddingRecord } from '../types/article';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {

  // insert file record
  async storeFile(file: Omit<FileRecord, 'id'>): Promise<string> {
    const { data, error } = await supabase
      .from('files')
      .insert({
        title: file.title,
        metadata: file.metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  // insert embedding record
  async storeEmbedding(fileId: string, text: string, embedding: number[]): Promise<void> {
    const { error } = await supabase
      .from('embeddings')
      .insert({
        file_id: fileId,
        text,
        embedding,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Function to chunk text into smaller pieces for embeddings
  chunkText(text: string, maxChunkSize: number = 2000): string[] {
    const sentences = text.split(/[.!?]+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
