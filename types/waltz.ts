export interface QaLogRow {
  errorNumber: string;
  note: string;
}

export interface ReconciliationResult {
  location: {
    number: string;
    name: string;
  };
  rows: QaLogRow[];
}

export interface UploadedFileIds {
  orderFileId: string;
  shopDrawingFileId: string;
}

export interface AnalyzeRequestBody extends UploadedFileIds {
  systemPromptBody?: string;
}
