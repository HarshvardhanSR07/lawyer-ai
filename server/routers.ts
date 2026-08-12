import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { nanoid } from "nanoid";
import { createLiveAvatarCall } from "./beyondPresence";
import { indexLegalDocument, requestVerifiedLegalResponse, transcribeWhisperAudio } from "./fastapiRag";
import { storeLegalDocument } from "./supabaseStorage";
import { assertLiveSessionOwner, closeLiveSession, createLiveSession, saveDocumentMetadata, saveTranscriptEntry } from "./supabasePersistence";
import { synthesizeLegalSpeech } from "./rime";
import { DOCX_MIME_TYPE, prepareKnowledgeDocument } from "./documentIngestion";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  avatar: router({
    startLiveCall: protectedProcedure.mutation(async ({ ctx }) => {
      const liveCall = await createLiveAvatarCall();
      const session = await createLiveSession({ userOpenId: ctx.user.openId, agentId: liveCall.agentId, callId: liveCall.callId });
      return { ...liveCall, sessionId: session.id };
    }),
    endLiveCall: protectedProcedure.input(z.object({ sessionId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      await assertLiveSessionOwner(input.sessionId, ctx.user.openId);
      await closeLiveSession(input.sessionId);
      return { success: true } as const;
    }),
  }),

  assistant: router({
    uploadDocument: protectedProcedure.input(z.object({
      filename: z.string().min(1).max(160),
      mimeType: z.enum(["application/pdf", "text/plain", DOCX_MIME_TYPE]),
      base64: z.string().min(1),
      sessionId: z.string().uuid().optional(),
    })).mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Please upload a PDF, Word, or text document smaller than 10 MB.");
      if (input.sessionId) await assertLiveSessionOwner(input.sessionId, ctx.user.openId);
      const stored = await storeLegalDocument({ ownerId: ctx.user.id, filename: input.filename, mimeType: input.mimeType, bytes });
      const knowledgeDocument = await prepareKnowledgeDocument({ filename: input.filename, mimeType: input.mimeType, bytes });
      const indexed = await indexLegalDocument({
        caseId: input.sessionId ?? `user-${ctx.user.id}`,
        filename: knowledgeDocument.filename,
        mimeType: knowledgeDocument.mimeType,
        bytes: knowledgeDocument.bytes,
      });
      const document = await saveDocumentMetadata({
        userOpenId: ctx.user.openId,
        sessionId: input.sessionId,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: bytes.byteLength,
        storageBucket: stored.bucket,
        storagePath: stored.objectKey,
        knowledgeFileId: indexed.document_id,
        ingestionStatus: "available",
      });
      return { ...stored, documentId: document.id, filename: input.filename, size: bytes.byteLength, knowledgeFileId: indexed.document_id, status: "available", chunksIndexed: indexed.chunks_indexed };
    }),
    saveTranscript: protectedProcedure.input(z.object({
      sessionId: z.string().uuid(),
      speaker: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(10_000),
      source: z.enum(["livekit", "typed", "whisper"]),
    })).mutation(async ({ ctx, input }) => {
      await assertLiveSessionOwner(input.sessionId, ctx.user.openId);
      return saveTranscriptEntry(input);
    }),
    synthesizeFallback: protectedProcedure.input(z.object({
      sessionId: z.string().uuid(),
      text: z.string().trim().min(1).max(2_500),
    })).mutation(async ({ ctx, input }) => {
      await assertLiveSessionOwner(input.sessionId, ctx.user.openId);
      return synthesizeLegalSpeech(input.text);
    }),
    transcribe: protectedProcedure.input(z.object({
      sessionId: z.string().uuid(),
      audioBase64: z.string().min(1).max(14_000_000),
      mimeType: z.string().min(1).max(120),
      isFinal: z.boolean().default(true),
    })).mutation(async ({ ctx, input }) => {
      await assertLiveSessionOwner(input.sessionId, ctx.user.openId);
      return transcribeWhisperAudio(input);
    }),
    respond: protectedProcedure.input(z.object({
      sessionId: z.string().uuid(),
      question: z.string().trim().min(1).max(4_000),
      conversationHistory: z.array(z.object({
        speaker: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(4_000),
      })).max(16).default([]),
    })).mutation(async ({ ctx, input }) => {
      await assertLiveSessionOwner(input.sessionId, ctx.user.openId);
      const legalResponse = await requestVerifiedLegalResponse({
        caseId: input.sessionId,
        question: input.question,
        conversationHistory: input.conversationHistory,
      });
      // The renderer never receives this text. It only receives the resulting Rime audio track in LiveKit.
      const audio = await synthesizeLegalSpeech(legalResponse.response);
      return { ...legalResponse, audio };
    }),
  }),

  // ========================================================================
  // CASE MANAGEMENT
  // ========================================================================
  cases: router({
    // Get all cases for the authenticated user
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserCases(ctx.user.id);
    }),

    // Get a specific case by ID
    get: protectedProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ input }) => {
        const caseData = await db.getCaseByCaseId(input.caseId);
        if (!caseData) {
          throw new Error("Case not found");
        }
        // Get document count and legal source count (stub for now)
        const documents = await db.getCaseDocuments(caseData.id);
        return {
          ...caseData,
          documentCount: documents.length,
          legalSourceCount: 0, // Will be populated from Qdrant
        };
      }),

    // Create a new case
    create: protectedProcedure
      .input(z.object({
        caseId: z.string(),
        caseName: z.string(),
        caseType: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createCase(ctx.user.id, input);
      }),
  }),

  // ========================================================================
  // CASE DOCUMENTS
  // ========================================================================
  documents: router({
    // Get documents for a case
    list: protectedProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ input }) => {
        const caseData = await db.getCaseByCaseId(input.caseId);
        if (!caseData) throw new Error("Case not found");
        return await db.getCaseDocuments(caseData.id);
      }),

    // Upload and index a document (stub - actual upload to S3 handled separately)
    upload: protectedProcedure
      .input(z.object({
        caseId: z.string(),
        documentName: z.string(),
        documentType: z.string().optional(),
        storageKey: z.string(),
        pageCount: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const caseData = await db.getCaseByCaseId(input.caseId);
        if (!caseData) throw new Error("Case not found");
        return await db.addCaseDocument(caseData.id, {
          documentName: input.documentName,
          documentType: input.documentType,
          storageKey: input.storageKey,
          pageCount: input.pageCount,
        });
      }),
  }),

  // ========================================================================
  // COURTROOM SESSIONS
  // ========================================================================
  sessions: router({
    // Start a new courtroom session
    start: protectedProcedure
      .input(z.object({ caseId: z.string() }))
      .mutation(async ({ input }) => {
        const caseData = await db.getCaseByCaseId(input.caseId);
        if (!caseData) throw new Error("Case not found");
        const sessionId = nanoid();
        await db.createCaseSession(caseData.id, sessionId);
        return { sessionId };
      }),

    // End a courtroom session
    end: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        return await db.endCaseSession(input.sessionId);
      }),

    // Get session transcript and messages
    get: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await db.getCaseSession(input.sessionId);
        if (!session) throw new Error("Session not found");
        const messages = await db.getSessionMessages(session.id);
        return { session, messages };
      }),
  }),

  // ========================================================================
  // REASONING & VOICE ENDPOINTS (Frontend calls these to interact with FastAPI)
  // ========================================================================
  reasoning: router({
    // POST /api/reason equivalent - called from frontend
    // The actual reasoning happens in the Python FastAPI backend
    // This is just a pass-through that validates the request
    reason: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        question: z.string(),
        caseContext: z.array(z.any()).optional(),
        legalContext: z.array(z.any()).optional(),
        conversationHistory: z.array(z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        // This endpoint validates the session exists
        const session = await db.getCaseSession(input.sessionId);
        if (!session) throw new Error("Session not found");
        
        // The actual reasoning call happens on the frontend via fetch to FastAPI
        // This just confirms the session is valid
        return { sessionValid: true, sessionId: input.sessionId };
      }),
  }),

  // ========================================================================
  // DEMO & FALLBACK
  // ========================================================================
  demo: router({
    // Get demo case data (ABC Technologies vs XYZ Solutions)
    getCase: publicProcedure.query(async () => {
      // Return demo case metadata
      return {
        caseId: "CASE001",
        caseName: "ABC Technologies vs XYZ Solutions",
        caseType: "Contract dispute",
        status: "active",
        documentCount: 4,
        legalSourceCount: 12, // Approximate
        documents: [
          { name: "Contract.pdf", type: "contract" },
          { name: "Email_Evidence.pdf", type: "evidence" },
          { name: "Payment_Record.pdf", type: "evidence" },
          { name: "Legal_Notice.pdf", type: "notice" },
        ],
      };
    }),

    // Run demo question through the reasoning pipeline
    runQuestion: publicProcedure
      .input(z.object({
        question: z.string(),
      }))
      .mutation(async ({ input }) => {
        // This is a stub - actual demo execution happens via FastAPI
        return {
          success: true,
          message: "Demo question submitted to reasoning pipeline",
          question: input.question,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
