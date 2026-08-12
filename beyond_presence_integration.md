# Beyond Presence Live-Avatar Integration Notes

## Verified Integration Contract

Beyond Presence authenticates server-side REST requests through an `x-api-key` header. The lightweight account validation endpoint is `GET https://api.bey.dev/v1/auth/verify`; avatar metadata is available at `GET https://api.bey.dev/v1/avatars/{id}`. [1] [2]

The assistant must create or select an **agent**, not only an avatar, before it can create a live call. An agent requires `name`, `avatar_id`, and `system_prompt`; it can optionally carry language, greeting, session-length, knowledge files, capabilities, LLM, and TTS configuration. [3]

For a custom web experience, the server creates a call using `POST https://api.bey.dev/v1/calls` with an `agent_id`. The response contains a time-limited `livekit_url` and `livekit_token`. The browser connects to that room with the LiveKit client SDK, after which the agent joins automatically. [4] [5]

For a lower-customization option, an already-created Beyond Presence agent may be displayed using `https://bey.chat/{agent-id}` in an iframe. [6]

Session-specific RAG context can be passed by creating a lightweight disposable agent just before a call. This supports the assistant's uploaded-document context without revealing the external-service credential to the browser. [7]

An agent may use the provider's managed OpenAI integration or an OpenAI-compatible external endpoint. The latter requires an external API configuration with `type: "openai_compatible_llm"`, a name, URL, and API key; the agent then references the returned external-API identifier as `llm.api_id`, along with model and temperature. [8] [9]

Creating an agent returns HTTP 201. A valid base-agent payload needs `name`, `avatar_id`, and `system_prompt`; language, greeting, session length, managed OpenAI model, and `knowledge_file_ids` are optional. The agent-list endpoint returns `{ data, has_more, next_cursor? }`, so LawyerAI can first reuse a matching persistent base agent for the selected avatar and only create one if no match exists. [9] [10]

## Implementation Decision

Use a server endpoint to retrieve the selected avatar and create a short-lived agent containing the legal-assistant guardrails and retrieved document context. The endpoint then creates a call and returns only the LiveKit URL/token to the authenticated browser. The browser uses those temporary credentials to render the photorealistic avatar and manage microphone, video, and screen-sharing tracks.

For typed questions, the browser publishes a LiveKit text stream with `room.localParticipant.sendText(text, { topic: "lk.chat" })`. The interface receives final transcription segments from the room and presents them in the same conversation thread as typed messages. [11] [12]

## References

[1]: https://docs.bey.dev/get-started/api "Beyond Presence API authentication"
[2]: https://docs.bey.dev/api-reference/avatars/retrieve-avatar.md "Retrieve Avatar"
[3]: https://docs.bey.dev/api-reference/agents/create-agent.md "Create Agent"
[4]: https://docs.bey.dev/api-reference/calls/create-call.md "Create Call"
[5]: https://docs.bey.dev/integrations/web/livekit-client-sdk.md "LiveKit Client SDK"
[6]: https://docs.bey.dev/integrations/web/iframe-embedding.md "iframe Embedding"
[7]: https://docs.bey.dev/concepts/agents/just-in-time-context.md "Just-in-Time Context"
[8]: https://docs.bey.dev/api-reference/external-apis/create-external-api-configuration.md "Create External API Configuration"
[9]: https://docs.bey.dev/api-reference/agents/create-agent.md "Create Agent"
[10]: https://docs.bey.dev/api-reference/agents/list-agents "List Agents"
[11]: https://docs.livekit.io/agents/build/text/ "LiveKit agent text"
[12]: https://docs.livekit.io/transport/data/text-streams/ "LiveKit text streams"
