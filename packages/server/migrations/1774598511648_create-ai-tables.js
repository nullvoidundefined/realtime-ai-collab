/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('ai_suggestions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    document_id: {
      type: 'uuid',
      notNull: true,
      references: 'documents(id)',
      onDelete: 'CASCADE',
    },
    requested_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    prompt_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "prompt_type IN ('continue','improve','summarize','expand')",
    },
    suggestion_text: { type: 'text', notNull: true, default: "''" },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'streaming'",
      check: "status IN ('streaming','pending','accepted','rejected','edited')",
    },
    resolved_by: { type: 'uuid', references: 'users(id)' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.sql(`
        CREATE TRIGGER ai_suggestions_updated_at
        BEFORE UPDATE ON ai_suggestions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

  pgm.createTable('document_versions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    document_id: {
      type: 'uuid',
      notNull: true,
      references: 'documents(id)',
      onDelete: 'CASCADE',
    },
    content_snapshot: { type: 'text', notNull: true },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('document_versions');
  pgm.dropTable('ai_suggestions');
};
