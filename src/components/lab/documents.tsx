import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteDocument, listDocuments, uploadDocument, type LabDocument } from "@/lib/lab.functions";
import { cn } from "@/lib/utils";
import { LabError, NotConnected } from "./not-connected";

export const docsKey = (sid: string) => ["lab", "documents", sid];

export function useDocuments(sessionId: string) {
  return useQuery({
    queryKey: docsKey(sessionId),
    queryFn: () => listDocuments({ data: { sessionId } }),
    staleTime: 10_000,
  });
}

const MAX = 20 * 1024 * 1024;

async function toBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export function useUpload(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const done: LabDocument[] = [];
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error(`${file.name} is not a PDF.`);
        if (file.size > MAX) throw new Error(`${file.name} is larger than 20 MB.`);
        const res = await uploadDocument({ data: { sessionId, filename: file.name, base64: await toBase64(file) } });
        if (!res.ok) throw new Error(res.error);
        done.push(res.data);
      }
      return done;
    },
    onSuccess: (docs) => {
      qc.invalidateQueries({ queryKey: docsKey(sessionId) });
      toast.success(docs.length === 1 ? `${docs[0]!.filename} uploaded` : `${docs.length} PDFs uploaded`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });
}

export function UploadButton({ sessionId, multiple, onUploaded }: { sessionId: string; multiple?: boolean; onUploaded?: (d: LabDocument[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload(sessionId);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) upload.mutate(files, { onSuccess: (d) => onUploaded?.(d) });
        }}
      />
      <Button type="button" variant="soft" onClick={() => input.current?.click()} disabled={upload.isPending}>
        {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
        {upload.isPending ? "Uploading…" : multiple ? "Add PDFs" : "Upload a PDF"}
      </Button>
    </>
  );
}

export function DocumentPicker({
  sessionId,
  selectedId,
  onSelect,
}: {
  sessionId: string;
  selectedId: string | null;
  onSelect: (doc: LabDocument | null) => void;
}) {
  const { data, isLoading } = useDocuments(sessionId);
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading your documents…</p>;
  if (data && !data.ok) return data.notConfigured ? <NotConnected /> : <LabError message={data.error} />;
  const docs = data?.ok ? data.data.documents : [];

  return (
    <div className="space-y-3">
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No PDFs yet. Upload one to start — a short article or course handout works best.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {docs.map((d) => (
            <li key={d.id}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
                  selectedId === d.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50",
                )}
              >
                <button type="button" onClick={() => onSelect(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <FileText className={cn("size-5 shrink-0", selectedId === d.id ? "text-primary" : "text-muted-foreground")} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{d.filename}</span>
                    <span className="block text-xs text-muted-foreground">
                      {d.pages} page{d.pages === 1 ? "" : "s"} · {(d.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${d.filename}`}
                  disabled={deleting === d.id}
                  onClick={async () => {
                    setDeleting(d.id);
                    const res = await deleteDocument({ data: { sessionId, id: d.id } });
                    setDeleting(null);
                    if (!res.ok) { toast.error(res.error); return; }
                    if (selectedId === d.id) onSelect(null);
                    qc.invalidateQueries({ queryKey: docsKey(sessionId) });
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <UploadButton sessionId={sessionId} onUploaded={(d) => d[0] && onSelect(d[0])} />
    </div>
  );
}
