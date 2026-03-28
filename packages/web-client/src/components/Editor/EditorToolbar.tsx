'use client';

import type { Editor } from '@tiptap/react';

import styles from './EditorToolbar.module.scss';

interface EditorToolbarProps {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className={styles.toolbar}>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${styles.button} ${editor.isActive('bold') ? styles.active : ''}`}
        title='Bold (Ctrl+B)'
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${styles.button} ${editor.isActive('italic') ? styles.active : ''}`}
        title='Italic (Ctrl+I)'
      >
        <em>I</em>
      </button>
      <div className={styles.divider} />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`${styles.button} ${editor.isActive('heading', { level: 1 }) ? styles.active : ''}`}
        title='Heading 1'
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${styles.button} ${editor.isActive('heading', { level: 2 }) ? styles.active : ''}`}
        title='Heading 2'
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${styles.button} ${editor.isActive('heading', { level: 3 }) ? styles.active : ''}`}
        title='Heading 3'
      >
        H3
      </button>
      <div className={styles.divider} />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${styles.button} ${editor.isActive('bulletList') ? styles.active : ''}`}
        title='Bullet List'
      >
        •
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${styles.button} ${editor.isActive('orderedList') ? styles.active : ''}`}
        title='Ordered List'
      >
        1.
      </button>
    </div>
  );
}
