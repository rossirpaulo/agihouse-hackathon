import { b } from "../baml_client/sync_client";
import { b as asyncB } from "../baml_client/async_client";
import type { Metadata } from "../baml_client/types";

export default class LLMService {
	async chat(message: string, rerankedResults: Metadata[]) {
		return await b.Chat(message, rerankedResults);
	}

	async chatStream(message: string, rerankedResults: Metadata[]) {
		return asyncB.stream.Chat(message, rerankedResults);
	}
}
