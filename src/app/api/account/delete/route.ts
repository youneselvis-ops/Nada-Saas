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

  const { data: files } = await admin.storage.from("receipts").list(user.id);
  if (files && files.length > 0) {
    await admin.storage
      .from("receipts")
      .remove(files.map((file) => `${user.id}/${file.name}`));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
