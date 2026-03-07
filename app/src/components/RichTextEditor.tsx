"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Minus,
  type LucideIcon,
} from "lucide-react";

function ToolbarButton({
  onClick,
  isActive,
  title,
  icon: Icon,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? "bg-holo/20 text-holo"
          : "text-space-400 hover:text-space-200 hover:bg-space-800/50"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/** Convert plain text to HTML for backward compatibility with existing guides */
function plainTextToHtml(text: string): string {
  if (!text.trim()) return "";
  if (text.trim().startsWith("<") && text.includes(">")) return text;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n\n+/);
  return paragraphs
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your guide here…",
  minHeight = "300px",
}: RichTextEditorProps) {
  const skipNextUpdate = useRef(false);
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value ? plainTextToHtml(value) : "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[300px] px-3 py-2.5 focus:outline-none",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      if (!skipNextUpdate.current) onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const html = value ? plainTextToHtml(value) : "";
    if (editor.getHTML() !== html) {
      skipNextUpdate.current = true;
      editor.commands.setContent(html, { emitUpdate: false });
      skipNextUpdate.current = false;
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-glass-border bg-space-900/60 overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b border-glass-border bg-space-900/40">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
          icon={Bold}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
          icon={Italic}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
          icon={UnderlineIcon}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
          icon={Strikethrough}
        />
        <div className="w-px h-6 bg-glass-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
          icon={Heading1}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
          icon={Heading2}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
          icon={Quote}
        />
        <div className="w-px h-6 bg-glass-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet list"
          icon={List}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered list"
          icon={ListOrdered}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
          icon={Minus}
        />
      </div>
      <div style={{ minHeight }} className="overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
