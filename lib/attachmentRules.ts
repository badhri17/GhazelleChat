// Attachment rules and helper utilities shared between server & client
// 2025-06-16 – synced with current vendor docs

export type SupportedMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/pdf"; // NEW – now allowed on some models

interface ModelPolicy {
  allowedMimeTypes: SupportedMime[];
  maxFileSizeMB: number; // per-file limit
  maxFiles?: number; // optional per-request limit
}

// ────────────────────────────────────────────────────────────
// Vendor-specific rules (see comments & citations)
// ────────────────────────────────────────────────────────────
export const ATTACHMENT_POLICIES: Record<string, ModelPolicy> = {
  /*────────────────── OpenAI ──────────────────*/
  // GPT-4o & 4o-mini: only images (no PDF support as of 2025-06)
  "gpt-4o": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSizeMB: 10,
  },
  "gpt-4o-mini": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSizeMB: 5,
  },

  /*────────────────── Anthropic – Claude 3.5/4 ──────────────────*/
  // Vision models now accept PDFs (max 32 MB, ≤100 pages) :contentReference[oaicite:0]{index=0}
  "claude-3-5-sonnet-latest": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxFileSizeMB: 32, // Anthropic docs: 32 MB total; use same per-file
  },
  "claude-sonnet-4-20250514": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxFileSizeMB: 32,
  },
  "claude-opus-4-20250514": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxFileSizeMB: 32,
  },

  /*────────────────── Google – Gemini ──────────────────*/
  // PDFs formally supported on Flash & Flash-Lite (≤50 MB, ≤1 000 pages) :contentReference[oaicite:1]{index=1}
  "gemini-pro": {
    // no official PDF support yet
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSizeMB: 10,
  },
  "gemini-2.5-pro": {
    // ditto – stick to images only
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSizeMB: 10,
  },
  "gemini-2.0-flash": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxFileSizeMB: 50,
    maxFiles: 3000, // per Google doc (images & PDFs share this cap)
  },
  "gemini-2.0-flash-lite": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxFileSizeMB: 50,
    maxFiles: 3000,
  },

  /*────────────────── Meta – Llama (text-only) ──────────────────*/
  "llama-3.1-70b-versatile": {
    allowedMimeTypes: [],
    maxFileSizeMB: 0,
  },
};

/*──── helper utils stay unchanged … ─────────────────────────*/
export function getPolicyForModel(model: string): ModelPolicy {
  return (
    ATTACHMENT_POLICIES[model] || { allowedMimeTypes: [], maxFileSizeMB: 0 }
  );
}

export interface AttachmentMetaInput {
  mimeType: string;
  size: number; // bytes
}

export function validateAttachment(
  model: string,
  a: AttachmentMetaInput
): string | null {
  const p = getPolicyForModel(model);
  if (!p.allowedMimeTypes.includes(a.mimeType as SupportedMime))
    return `Attachments of type ${a.mimeType} are not supported by ${model}.`;

  if (p.maxFileSizeMB && a.size > p.maxFileSizeMB * 1024 * 1024)
    return `File exceeds ${p.maxFileSizeMB} MB limit for ${model}.`;

  return null;
}

export function validateAttachments(
  model: string,
  list: AttachmentMetaInput[]
): string | null {
  for (const att of list) {
    const err = validateAttachment(model, att);
    if (err) return err;
  }
  return null;
}
