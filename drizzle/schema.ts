import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Cases table: stores courtroom cases with metadata.
 * Each case belongs to a user and contains evidence documents.
 */
export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: varchar("caseId", { length: 64 }).notNull().unique(), // Demo: "CASE001"
  caseName: varchar("caseName", { length: 255 }).notNull(), // "ABC Technologies vs XYZ Solutions"
  caseType: varchar("caseType", { length: 128 }), // "Contract dispute"
  status: mysqlEnum("status", ["active", "archived", "completed"]).default("active").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

/**
 * Case documents: PDFs uploaded for a specific case.
 * Each document is indexed into Qdrant's case_knowledge collection.
 */
export const caseDocuments = mysqlTable("case_documents", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  documentName: varchar("documentName", { length: 255 }).notNull(), // "Contract.pdf"
  documentType: varchar("documentType", { length: 64 }), // "contract", "evidence", "notice"
  storageKey: varchar("storageKey", { length: 512 }).notNull(), // S3 key
  pageCount: int("pageCount"),
  indexedAt: timestamp("indexedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseDocument = typeof caseDocuments.$inferSelect;
export type InsertCaseDocument = typeof caseDocuments.$inferInsert;

/**
 * Case sessions: tracks individual courtroom sessions for a case.
 * Each session has a transcript and reasoning history.
 */
export const caseSessions = mysqlTable("case_sessions", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
  transcript: text("transcript"), // JSON array of { speaker, text, timestamp }
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type CaseSession = typeof caseSessions.$inferSelect;
export type InsertCaseSession = typeof caseSessions.$inferInsert;

/**
 * Session messages: individual turns in a courtroom session.
 * Stores both user utterances and AI responses with reasoning metadata.
 */
export const sessionMessages = mysqlTable("session_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  speaker: mysqlEnum("speaker", ["user", "lawyerai"]).notNull(),
  text: text("text").notNull(),
  // For AI responses: store reasoning metadata
  legalSources: json("legalSources"), // Array of { source, section, document_name, page_number, relevance_score }
  evidenceSources: json("evidenceSources"), // Array of { document_name, page_number, clause }
  confidence: mysqlEnum("confidence", ["high", "medium", "low"]),
  verificationStatus: mysqlEnum("verificationStatus", ["approved", "flagged"]),
  reasoningSummary: text("reasoningSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SessionMessage = typeof sessionMessages.$inferSelect;
export type InsertSessionMessage = typeof sessionMessages.$inferInsert;
