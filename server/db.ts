import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, cases, caseDocuments, caseSessions, sessionMessages } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// CASE QUERIES
// ============================================================================

export async function createCase(userId: number, caseData: {
  caseId: string;
  caseName: string;
  caseType?: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(cases).values({
    userId,
    ...caseData,
  });
  return result;
}

export async function getCaseById(caseId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCaseByCaseId(caseId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(cases).where(eq(cases.caseId, caseId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserCases(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(cases).where(eq(cases.userId, userId));
}

// ============================================================================
// CASE DOCUMENT QUERIES
// ============================================================================

export async function addCaseDocument(caseId: number, docData: {
  documentName: string;
  documentType?: string;
  storageKey: string;
  pageCount?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(caseDocuments).values({
    caseId,
    ...docData,
  });
}

export async function getCaseDocuments(caseId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(caseDocuments).where(eq(caseDocuments.caseId, caseId));
}

export async function markDocumentIndexed(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(caseDocuments)
    .set({ indexedAt: new Date() })
    .where(eq(caseDocuments.id, documentId));
}

// ============================================================================
// CASE SESSION QUERIES
// ============================================================================

export async function createCaseSession(caseId: number, sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(caseSessions).values({
    caseId,
    sessionId,
  });
}

export async function getCaseSession(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(caseSessions).where(eq(caseSessions.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function endCaseSession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(caseSessions)
    .set({ status: "completed", endedAt: new Date() })
    .where(eq(caseSessions.sessionId, sessionId));
}

// ============================================================================
// SESSION MESSAGE QUERIES
// ============================================================================

export async function addSessionMessage(sessionId: number, messageData: {
  speaker: "user" | "lawyerai";
  text: string;
  legalSources?: any;
  evidenceSources?: any;
  confidence?: "high" | "medium" | "low";
  verificationStatus?: "approved" | "flagged";
  reasoningSummary?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(sessionMessages).values({
    sessionId,
    ...messageData,
  });
}

export async function getSessionMessages(sessionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(sessionMessages).where(eq(sessionMessages.sessionId, sessionId));
}
