export type OpenAiTestStreamEvent = {
  type: string;
  delta?: string;
  response?: {
    status?: string;
    incomplete_details?: { reason?: string } | null;
    output_text?: string;
    output?: unknown;
    usage?: { input_tokens?: number; output_tokens?: number } | null;
  };
};

/** Official-shaped async iterable plus `finalResponse()` for provider tests. */
export function openaiEventStream(events: OpenAiTestStreamEvent[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
    async finalResponse() {
      const completed = [...events]
        .reverse()
        .find((event) => event.type === "response.completed");
      if (!completed?.response) {
        throw new Error("missing_completed_response");
      }
      return completed.response;
    },
  };
}

export function openaiJsonDeltas(
  json: string,
  chunkSize = 12,
): OpenAiTestStreamEvent[] {
  const events: OpenAiTestStreamEvent[] = [{ type: "response.created" }];
  for (let i = 0; i < json.length; i += chunkSize) {
    events.push({
      type: "response.output_text.delta",
      delta: json.slice(i, i + chunkSize),
    });
  }
  events.push({
    type: "response.completed",
    response: {
      status: "completed",
      output_text: json,
      usage: { input_tokens: 220, output_tokens: 90 },
    },
  });
  return events;
}
