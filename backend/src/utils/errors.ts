export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export const USER_ERRORS = {
  noTemplate: "Please upload your company JD template first.",
  noJd: "Please paste or upload a JD.",
  aiFailure: "We couldn't generate the JD right now. Please try again.",
  unsupportedFile: "Please upload a DOCX, PDF or TXT file.",
  emptyDocument: "We couldn't read meaningful content from this file.",
  fileTooLarge: "Please upload a file smaller than 10 MB.",
  notFound: "The requested item was not found.",
  missingAiKey: "The AI service is not configured. Add an API key on the server and try again.",
};
