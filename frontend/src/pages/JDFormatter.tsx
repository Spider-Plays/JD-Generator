import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import TemplateUploader from "../components/TemplateUploader";
import JDInput from "../components/JDInput";
import JDEditor from "../components/JDEditor";
import DownloadButtons from "../components/DownloadButtons";
import {
  deleteTemplate,
  downloadJd,
  extractSourceJd,
  generateJd,
  getActiveTemplate,
  uploadTemplate,
} from "../services/api";
import { generatedJdToHtml, htmlToJobTitle, type TemplateInfo } from "../types/jd";

export default function JDFormatterPage() {
  const [template, setTemplate] = useState<TemplateInfo | null>(null);
  const [sourceJd, setSourceJd] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getActiveTemplate()
      .then(setTemplate)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load the saved template.");
      });
  }, []);

  async function handleTemplateUpload(file: File) {
    setError("");
    setUploadingTemplate(true);
    try {
      const uploaded = await uploadTemplate(file);
      setTemplate(uploaded);
      setSuccess("Company template uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the template.");
    } finally {
      setUploadingTemplate(false);
    }
  }

  async function handleTemplateDelete() {
    if (!template) return;
    setError("");
    try {
      const restored = await deleteTemplate(template.templateId);
      setTemplate(restored);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the template.");
    }
  }

  async function handleSourceUpload(file: File) {
    setError("");
    setExtracting(true);
    try {
      const text = await extractSourceJd(file);
      setSourceJd(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the JD file.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate() {
    if (!template) {
      setError("Please upload your company JD template first.");
      return;
    }
    if (!sourceJd.trim()) {
      setError("Please paste or upload a JD.");
      return;
    }

    setError("");
    setGenerating(true);
    try {
      const generated = await generateJd(template.templateId, sourceJd.trim());
      setEditorHtml(generated.html?.trim() ? generated.html : generatedJdToHtml(generated));
      setHasGenerated(true);
      setSuccess("JD generated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't generate the JD right now. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(format: "docx" | "pdf") {
    if (!editorHtml.trim()) return;
    setError("");
    setDownloading(true);
    try {
      await downloadJd(format, htmlToJobTitle(editorHtml), editorHtml, template?.templateId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the file.");
    } finally {
      setDownloading(false);
    }
  }

  const busy = generating || downloading;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          JD Formatter
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 0.75 }}>
          Convert any JD into your company's standard format.
        </Typography>
      </Box>

      <Stack spacing={3}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <TemplateUploader
            template={template}
            uploading={uploadingTemplate}
            onUpload={handleTemplateUpload}
            onDelete={handleTemplateDelete}
          />
        </Paper>

        <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <JDInput
            value={sourceJd}
            extracting={extracting}
            disabled={generating}
            onChange={setSourceJd}
            onUpload={handleSourceUpload}
          />

          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              size="large"
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeOutlinedIcon />}
              onClick={handleGenerate}
              disabled={busy || extracting || uploadingTemplate}
            >
              {generating ? "Generating JD..." : "Generate JD"}
            </Button>
          </Box>
        </Paper>

        {hasGenerated ? (
          <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Generated JD
            </Typography>
            <JDEditor html={editorHtml} onChange={setEditorHtml} />
            <Box sx={{ mt: 2.5 }}>
              <DownloadButtons busy={busy} onRegenerate={handleGenerate} onDownload={handleDownload} />
            </Box>
          </Paper>
        ) : null}
      </Stack>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3500}
        onClose={() => setSuccess("")}
        message={success}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
}
