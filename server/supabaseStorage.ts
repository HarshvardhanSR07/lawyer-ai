const DOCUMENT_BUCKET = "lawyer-ai-documents";
let bucketReady: Promise<void> | null = null;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Document storage is not configured. Add matching Supabase URL and service-role credentials in project settings.");
  }
  return { url, serviceRoleKey };
}

async function ensureBucket() {
  if (bucketReady) return bucketReady;
  bucketReady = (async () => {
    const { url, serviceRoleKey } = getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: DOCUMENT_BUCKET, name: DOCUMENT_BUCKET, public: false }),
    });
    if (!response.ok && response.status !== 409) {
      const detail = await response.text();
      throw new Error(`Unable to prepare secure document storage (${response.status}): ${detail || response.statusText}`);
    }
  })();
  return bucketReady;
}

export async function storeLegalDocument(input: { ownerId: number; filename: string; mimeType: string; bytes: Buffer }) {
  await ensureBucket();
  const { url, serviceRoleKey } = getSupabaseConfig();
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  const objectKey = `${input.ownerId}/${Date.now()}-${safeName}`;
  const response = await fetch(`${url}/storage/v1/object/${DOCUMENT_BUCKET}/${encodeURIComponent(objectKey)}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "content-type": input.mimeType,
      "x-upsert": "false",
    },
    body: new Uint8Array(input.bytes),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Unable to save the document securely (${response.status}): ${detail || response.statusText}`);
  }
  return { bucket: DOCUMENT_BUCKET, objectKey };
}
