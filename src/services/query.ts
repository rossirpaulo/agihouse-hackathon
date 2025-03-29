import { createClient } from "@supabase/supabase-js";
import { VoyageService } from "./voyage";
import type { Metadata } from "../baml_client/types";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface MatchResult {
	id: string; // uuid
	file_id: string; // uuid
	embedding: number[];
	text: string;
	title: string;
	metadata: string;
	similarity: number;
}

export async function queryEmbeddings(
	query: string,
	threshold: number,
	limit: number,
): Promise<MatchResult[] | null> {
	try {
		const voyageService = new VoyageService();
		const queryEmbedding = await voyageService.embed_query(query);

		if (!queryEmbedding) {
			throw new Error("Failed to generate query embedding");
		}

		const { data: matches, error } = await supabase.rpc("query_embeddings", {
			query_embedding: queryEmbedding,
			match_threshold: threshold,
			match_count: limit,
		});

		if (error) {
			console.error("Error in queryEmbeddings:", error);
			return null;
		}

		return matches;
	} catch (error) {
		console.error("Error in queryEmbeddings:", error);
		return null;
	}
}

export async function searchAndRerank(
	query: string,
	threshold: number,
	limit: number,
): Promise<Metadata[] | null> {
	try {
		const matches = await queryEmbeddings(query, threshold, limit);

		if (!matches || matches.length === 0) return null;

		const voyageService = new VoyageService();
		const reranked = await voyageService.rerank_documents(
			query,
			matches.map((m) => m.text),
			limit,
		);

		if (!reranked) return null;

		// Map reranked results
		const rerankedResults = reranked
			.map((result) => {
				const idx = result.index;
				if (idx === undefined) return null;
				const match = matches[idx];

				return {
					title: match.title,
					file_id: match.file_id,
					chunk: match.text,
					metadata: match.metadata,
					similarity: match.similarity,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.sort((a, b) => b.similarity - a.similarity);

		return rerankedResults;
	} catch (error) {
		console.error("Error in searchAndRerank:", error);
		return null;
	}
}
