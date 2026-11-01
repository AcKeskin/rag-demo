import type { Chunk, SearchIndex } from "../src/core/types.ts";

export const chunk = (id: string, text: string, section = id): Chunk => ({
  id,
  title: "Doc",
  section,
  url: `https://example.com/#${id}`,
  text,
});

export const INDEX: SearchIndex = {
  version: 1,
  chunks: [
    chunk("webrtc", "Designed the WebRTC connection layer for streaming clients."),
    chunk("planets", "Procedural planets on the GPU with OpenGL compute shaders and C++."),
    chunk("android", "Android app in Java with Firebase push notifications."),
  ],
};
