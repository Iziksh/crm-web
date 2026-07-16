import { apiFetch, apiUpload, apiDownload } from "./client";

export type AttachmentEntityType = "CONTACT" | "ACCOUNT" | "ACTIVITY" | "ATTENDANCE_REPORT";

export interface AttachmentResponse {
  id: number;
  filename: string;
  contentType: string;
  fileSize: number;
  uploadedByName: string | null;
  createdAt: string;
}

export function fetchAttachments(entityType: AttachmentEntityType, entityId: number) {
  return apiFetch<AttachmentResponse[]>(
    `/attachments/entity?entityType=${entityType}&entityId=${entityId}`,
  );
}

export function uploadAttachment(entityType: AttachmentEntityType, entityId: number, file: File) {
  return apiUpload<AttachmentResponse>("/attachments/upload", file, {
    entityType,
    entityId: String(entityId),
  });
}

export function downloadAttachment(id: number, filename: string) {
  return apiDownload(`/attachments/${id}/download`, filename);
}

export function deleteAttachment(id: number) {
  return apiFetch<void>(`/attachments/${id}`, { method: "DELETE" });
}
