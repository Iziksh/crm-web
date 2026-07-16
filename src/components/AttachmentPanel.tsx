import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Download, Trash2, Upload } from "lucide-react";
import {
  fetchAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
  type AttachmentEntityType,
} from "../api/attachments";
import "./AttachmentPanel.css";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPanel({
  entityType,
  entityId,
}: {
  entityType: AttachmentEntityType;
  entityId: number | null;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments } = useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: () => fetchAttachments(entityType, entityId as number),
    enabled: entityId != null,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(entityType, entityId as number, file),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: deleteAttachment, onSuccess: invalidate });

  if (entityId == null) {
    return (
      <div className="attachment-panel">
        <div className="attachment-header">
          <h4><Paperclip size={14} /> Attachments</h4>
        </div>
        <p className="attachment-empty">Save the record first to attach files.</p>
      </div>
    );
  }

  return (
    <div className="attachment-panel">
      <div className="attachment-header">
        <h4><Paperclip size={14} /> Attachments</h4>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMutation.mutate(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} />
          {uploadMutation.isPending ? "Uploading…" : "Upload"}
        </button>
      </div>

      {(!attachments || attachments.length === 0) && (
        <p className="attachment-empty">No attachments yet.</p>
      )}

      {attachments && attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((a) => (
            <div className="attachment-row" key={a.id}>
              <span className="attachment-name">{a.filename}</span>
              <span className="attachment-meta">{formatSize(a.fileSize)}</span>
              <span className="attachment-meta">{a.uploadedByName ?? "—"}</span>
              <span className="attachment-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => downloadAttachment(a.id, a.filename)}
                  title="Download"
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  onClick={() => deleteMutation.mutate(a.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
