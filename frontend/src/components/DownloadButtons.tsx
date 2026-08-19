import { Button, Stack } from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

interface Props {
  busy: boolean;
  onRegenerate: () => void;
  onDownload: (format: "docx" | "pdf") => void;
}

export default function DownloadButtons({ busy, onRegenerate, onDownload }: Props) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <Button variant="outlined" startIcon={<ReplayIcon />} onClick={onRegenerate} disabled={busy}>
        Regenerate
      </Button>
      <Button
        variant="contained"
        startIcon={<DescriptionOutlinedIcon />}
        onClick={() => onDownload("docx")}
        disabled={busy}
      >
        Download DOCX
      </Button>
      <Button
        variant="outlined"
        startIcon={<PictureAsPdfOutlinedIcon />}
        onClick={() => onDownload("pdf")}
        disabled={busy}
      >
        Download PDF
      </Button>
    </Stack>
  );
}
