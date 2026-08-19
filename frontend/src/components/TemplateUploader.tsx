import { useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { TemplateInfo } from "../types/jd";

interface Props {
  template: TemplateInfo | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}

export default function TemplateUploader({ template, uploading, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Company Template
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {template?.isBuiltIn
          ? "The IGS JD format is saved as the default, including the company header and footer images."
          : "Upload a sample JD that represents your company format. It stays saved until you replace it."}
      </Typography>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUpload(file);
        }}
      />

      {template ? (
        <Stack spacing={1.5}>
          <Alert icon={<CheckCircleOutlineIcon fontSize="inherit" />} severity="success">
            Template: {template.name}
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {template.isBuiltIn ? "Default IGS format with header and footer images" : template.fileName} ·{" "}
              {template.isBuiltIn ? "saved" : `uploaded ${new Date(template.createdAt).toLocaleDateString()}`}
            </Typography>
          </Alert>

          {template.sections.length > 0 ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Detected sections
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {template.sections.map((section) => (
                  <Chip key={`${section.order}-${section.title}`} label={section.title} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No headings were detected. The AI will still use the template wording and layout as a reference.
            </Typography>
          )}

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadOutlinedIcon />}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Replace template
            </Button>
            {template.isBuiltIn ? null : (
              <Button color="inherit" startIcon={<DeleteOutlineIcon />} onClick={onDelete} disabled={uploading}>
                Remove
              </Button>
            )}
          </Stack>
        </Stack>
      ) : (
        <Button
          variant="outlined"
          startIcon={<CloudUploadOutlinedIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload template"}
        </Button>
      )}
    </Box>
  );
}
