import "dotenv/config";

import { VoyageAIClient, VoyageAIError } from "voyageai";

export class VoyageService {
  private voyage: VoyageAIClient;

  constructor() {
    this.voyage = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY,
    });
  }

  async rerank_documents(query: string, documents: string[], top_k: number) {
    try {
      const response = await this.voyage.rerank({
        query: query,
        documents: documents,
        returnDocuments: false,
        topK: top_k,
        model: "rerank-2",
      });
      return response.data;
    } catch (error) {
      if (error instanceof VoyageAIError) {
        console.log(error.statusCode);
        console.log(error.message);
      }
      throw error;
    }
  }

  async embed_query(query: string) {
    try {
      const response = await this.voyage.embed({
        input: query,
        model: "voyage-01",
        inputType: "query",
        truncation: true
      });
      if (response.data && response.data.length > 0) {
        return response.data[0].embedding;
      }
      return null;
    } catch (error) {
      if (error instanceof VoyageAIError) {
        console.log(error.statusCode);
        console.log(error.message);
      }
      throw error;
    }
  }

  async embed_document(content: string) {
    try {
      const response = await this.voyage.embed({
        input: [content],
        model: "voyage-01",
        inputType: "document",
        truncation: true
      });
      if (response.data && response.data.length > 0) {
        return response.data[0].embedding;
      }
      return null;
    } catch (error) {
      if (error instanceof VoyageAIError) {
        console.log(error.statusCode);
        console.log(error.message);
      }
      throw error;
    }
  }


  async batch_embed_documents(documents: string[]) {
    const BATCH_SIZE = 128
    let failed_count = 0
    const embeddings : (number[] | null)[] = []
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        try {
            const batch = documents.slice(i, i + BATCH_SIZE);
            const response = await this.voyage.embed({
                input: batch.map(doc => doc.replace(/\n/g, " ")),
                model: "voyage-3",
                inputType: "document",
                truncation: true,
            });
            if (response.data === undefined || response.data.length === 0) {
                console.log("No embeddings created");
                return null;
            }
            const batchEmbeddings = response.data.map(item => {
                if (!item.embedding) failed_count++;
                return item.embedding || null;
            });
            embeddings.push(...batchEmbeddings);
        } catch (error) {
            console.log("Error in batch_embed_documents", error);
            if (error instanceof VoyageAIError) {
                console.log(error.statusCode);
                console.log(error.message);
            }
        }
    }
    return embeddings;
  }
  
}
