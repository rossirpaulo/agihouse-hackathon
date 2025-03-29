import { b } from "../baml_client/sync_client";

export default class LLMService {
	async chat(message: string) {
		return await b.Chat(message);
	}
}
