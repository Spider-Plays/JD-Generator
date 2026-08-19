import { useRef } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

interface Props {
  value: string;
  extracting: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
}

export default function JDInput({ value, extracting, disabled, onChange, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Source JD
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Paste the job description, or upload a DOCX, PDF, or TXT file.
      </Typography>

      <TextField
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste your JD here..."
        fullWidth
        multiline
        minRows={10}
        disabled={disabled || extracting}
      />

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

      <Stack direction="row" justifyContent="flex-start" sx={{ mt: 1.5 }}>
        <Button
          variant="text"
          startIcon={<UploadFileOutlinedIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || extracting}
        >
          {extracting ? "Reading file..." : "Upload JD"}
        </Button>
      </Stack>
    </Box>
  );
}
