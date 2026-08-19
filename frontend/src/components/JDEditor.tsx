import { useEffect } from "react";
import { Box, Divider, IconButton, Paper, Stack, Tooltip } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import TitleIcon from "@mui/icons-material/Title";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

interface Props {
  html: string;
  onChange: (html: string) => void;
}

export default function JDEditor({ html, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: html,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "jd-editor",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (html !== editor.getHTML()) {
      editor.commands.setContent(html, false);
    }
  }, [editor, html]);

  if (!editor) return null;

  return (
    <Paper sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={0.5} sx={{ px: 1, py: 0.75 }}>
        <Tooltip title="Bold">
          <IconButton size="small" onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Italic">
          <IconButton size="small" onClick={() => editor.chain().focus().toggleItalic().run()}>
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Heading">
          <IconButton size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <TitleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Bullets">
          <IconButton size="small" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Numbered list">
          <IconButton size="small" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <FormatListNumberedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider />
      <Box sx={{ px: 2.5, py: 2, minHeight: 280 }}>
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}
