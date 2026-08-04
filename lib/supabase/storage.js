"use client";

// Uploads to the public "images" Storage bucket (see supabase/migrations/0004_v2_schema.sql).
// Only staff can write (bucket RLS), so this is only ever called from admin-only upload UI.
// Returns a public URL — nothing is embedded as base64 in the database.
export async function uploadImage(supabase, file, folder = "uploads") {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}
