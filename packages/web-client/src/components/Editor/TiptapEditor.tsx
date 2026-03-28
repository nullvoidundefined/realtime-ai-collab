'use client';

import { useEffect, useRef, useState } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { Socket } from 'socket.io-client';

import EditorToolbar from './EditorToolbar';
import styles from './TiptapEditor.module.scss';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  documentId: string;
  socket: Socket | null;
}

export default function TiptapEditor({
  content,
  onChange,
  documentId,
  socket,
}: TiptapEditorProps) {
  const isRemoteUpdate = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      if (isRemoteUpdate.current) return;
      const text = editor.getText();
      onChange(text);
      socket?.emit('edit', { documentId, content: text });
    },
  });

  // Listen for remote edits
  useEffect(() => {
    if (!socket || !editor) return;

    function handleEdit({
      content: remoteContent,
    }: {
      content: string;
      userId: string;
    }) {
      if (!editor) return;
      isRemoteUpdate.current = true;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(remoteContent);
      editor.commands.setTextSelection({ from, to });
      isRemoteUpdate.current = false;
    }

    socket.on('edit', handleEdit);
    return () => {
      socket.off('edit', handleEdit);
    };
  }, [socket, editor]);

  // Update editor when content prop changes (initial load)
  useEffect(() => {
    if (!editor) return;
    if (editor.getText() !== content) {
      isRemoteUpdate.current = true;
      editor.commands.setContent(content);
      isRemoteUpdate.current = false;
    }
  }, [content, editor]);

  return (
    <div className={styles.editorWrapper}>
      {isMounted && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className={styles.editor} />
    </div>
  );
}
