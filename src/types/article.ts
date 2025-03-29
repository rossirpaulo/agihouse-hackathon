export interface Article {
  title: string;
  content: string;
  created_at: Date;
}

// file is title 
export interface FileRecord {
  id: string;
  created_at: Date;
  title: string,
  metadata: string
}

export interface EmbeddingRecord {
  id: string;
  created_at: Date;
  file_id: string;
  embedding: number[];
  text: string;
}
