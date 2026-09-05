"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";

export default function NewReceiptPage() {
  const t = useTranslations("capture");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t("error"));
      setUploading(false);
      return;
    }

    const receiptId = crypto.randomUUID();
    const imagePath = `${user.id}/${receiptId}`;

    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(`${imagePath}/${i}.jpg`, compressed, {
            contentType: "image/jpeg",
          });
        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await supabase.from("receipts").insert({
        id: receiptId,
        user_id: user.id,
        image_path: imagePath,
        status: "pending",
      });
      if (insertError) throw insertError;
    } catch {
      setError(t("error"));
      setUploading(false);
      return;
    }

    fetch(`/api/receipts/${receiptId}/extract`, { method: "POST" }).catch(() => {});
    router.push(`/receipts/${receiptId}/processing`);
  }

  return (
    <main className="flex min-h-svh flex-col gap-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-medium text-ink">{t("title")}</h1>
        <p className="mt-2 text-fade">{t("subtitle")}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        {t("addPhoto")}
      </Button>

      {files.length > 0 ? (
        <ul className="flex flex-col gap-2 border-t border-sand pt-4">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between border-b border-sand py-2"
            >
              <span className="truncate text-ink">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="min-h-11 px-3 text-sm text-jamaica"
              >
                {t("removePhoto")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-sm text-jamaica">{error}</p> : null}

      <Button
        variant="positive"
        disabled={files.length === 0 || uploading}
        onClick={handleSubmit}
        className="mt-auto"
      >
        {uploading ? t("uploading") : t("submit")}
      </Button>
    </main>
  );
}
