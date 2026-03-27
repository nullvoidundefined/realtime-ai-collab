/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
    pgm.createTable("documents", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        owner_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
        title: { type: "varchar(255)", notNull: true, default: "'Untitled'" },
        content: { type: "text", notNull: true, default: "''" },
        share_token: { type: "varchar(64)", unique: true },
        created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
        updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    });

    pgm.sql(`
        CREATE TRIGGER documents_updated_at
        BEFORE UPDATE ON documents
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    pgm.createTable("document_collaborators", {
        document_id: { type: "uuid", notNull: true, references: "documents(id)", onDelete: "CASCADE" },
        user_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
        permission: { type: "varchar(20)", notNull: true, check: "permission IN ('edit','view','suggest')" },
    });

    pgm.addConstraint("document_collaborators", "document_collaborators_pkey", "PRIMARY KEY (document_id, user_id)");
};

export const down = (pgm) => {
    pgm.dropTable("document_collaborators");
    pgm.dropTable("documents");
};
