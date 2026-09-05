import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Storage.list() is not recursive: images live one level below the
  // user's own prefix, at `{user_id}/{receipt_id}/{n}.jpg`. Listing
  // `user.id` directly only returns the per-receipt pseudo-folders, not the
  // files inside them, so each receipt's own image_path (the same value
  // the extract route already lists from) has to be walked individually to
  // collect real object keys before removal.
  const { data: receipts } = await admin
    .from("receipts")
    .select("image_path")
    .eq("user_id", user.id);

  const imagePaths: string[] = [];
  for (const receipt of receipts ?? []) {
    const { data: files } = await admin.storage
      .from("receipts")
      .list(receipt.image_path);
    for (const file of files ?? []) {
      imagePaths.push(`${receipt.image_path}/${file.name}`);
    }
  }
  if (imagePaths.length > 0) {
    await admin.storage.from("receipts").remove(imagePaths);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
