import { b } from "../baml_client/sync_client";
import { b as asyncB } from "../baml_client/async_client";

export default class LLMService {
	async chat(message: string) {
		return await b.Chat(message);
	}

	async chatStream(message: string) {
		return asyncB.stream.Chat(message);
	}
}
