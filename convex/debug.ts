import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";

/**
 * Debug query to inspect the complete runtime state of a WhatsApp contact.
 * Useful for diagnosing thread persistence issues.
 * 
 * Returns:
 * - botSession: Active bot session for the contact
 * - conversations: Recent conversations for the contact  
 * - botApplicant: Applicant record for the contact
 * - profile: Profile resolved from phone number
 * - agentThread: Thread from the agent component (if threadId available)
 * - correlation data: threadId, status, updatedAt, etc.
 */
export const inspectContactThreads = internalQuery({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    // Normalize phone number - strip whatsapp: prefix if present
    const normalizedPhone = args.phoneNumber.replace(/^whatsapp:/, "");
    // Some records store with whatsapp: prefix, some without - try both
    const contactIdVariants = [normalizedPhone, args.phoneNumber];
    const phoneVariants = [normalizedPhone, args.phoneNumber.replace(/^\+/, "")];
    const primaryContactId = normalizedPhone;

    // 1. Find botApplicant by phone number (try all variants)
    let botApplicant = await ctx.db
      .query("botApplicants")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();
    
    // If not found, try with + prefix stripped
    if (!botApplicant) {
      botApplicant = await ctx.db
        .query("botApplicants")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneVariants[1]))
        .first();
    }

    // 2. Find botSessions for this contact (try both contactId variants)
    let botSessions = await ctx.db
      .query("botSessions")
      .withIndex("by_contact", (q) => q.eq("contactId", primaryContactId))
      .collect();
    
    // Also try with whatsapp: prefix if not found
    if (botSessions.length === 0) {
      botSessions = await ctx.db
        .query("botSessions")
        .withIndex("by_contact", (q) => q.eq("contactId", contactIdVariants[1]))
        .collect();
    }
    
    const activeSession = botSessions.length > 0 
      ? botSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0]
      : null;

    // 3. Find conversations for this contact (try both contactId variants)
    let conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", primaryContactId))
      .collect();

    // Also try with whatsapp: prefix if not found  
    if (conversations.length === 0) {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", contactIdVariants[1]))
        .collect();
    }
    
    const activeConversation = conversations.length > 0
      ? conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0]
      : null;

    // 4. Find profile by phone number
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();

    // 5. Determine the current threadId from various sources
    const threadIdFromSession = activeSession?.threadId;
    const threadIdFromConversation = activeConversation?.threadId;
    const currentThreadId = threadIdFromSession || threadIdFromConversation;

    // 6. Attempt to fetch the agent thread (if threadId exists)
    let agentThread = null;
    let agentThreadError = null;
    
    if (currentThreadId) {
      try {
        agentThread = await ctx.runQuery(components.agent.threads.getThread, { 
          threadId: currentThreadId 
        });
      } catch (error) {
        agentThreadError = error instanceof Error ? error.message : String(error);
      }
    }

    // 7. Build executive summary
    const summary = {
      hasSession: !!activeSession,
      hasConversation: !!activeConversation,
      hasApplicant: !!botApplicant,
      hasProfile: !!profile,
      hasThreadId: !!currentThreadId,
      threadIdSources: {
        fromSession: threadIdFromSession,
        fromConversation: threadIdFromConversation,
        resolved: currentThreadId,
      },
      sessionState: activeSession?.state || null,
      conversationStatus: activeConversation?.status || null,
      sessionUpdatedAt: activeSession?.updatedAt || null,
      conversationUpdatedAt: activeConversation?.updatedAt || null,
    };

    // Determine overall status
    let status: "healthy" | "warning" | "critical" = "healthy";
    const issues: string[] = [];

    if (!currentThreadId) {
      status = "warning";
      issues.push("No threadId found in session or conversation");
    }

    if (activeSession && threadIdFromSession && !threadIdFromConversation) {
      status = "warning";
      issues.push("ThreadId exists in session but not persisted to conversation");
    }

    if (threadIdFromConversation && threadIdFromSession && threadIdFromConversation !== threadIdFromSession) {
      status = "critical";
      issues.push("MISMATCH: ThreadId differs between session and conversation!");
    }

    if (!activeSession && !activeConversation) {
      status = "critical";
      issues.push("No session or conversation found for contact");
    }

    return {
      status,
      executive_summary: summary,
      issues,
      artifacts: {
        contactId: primaryContactId,
        phoneNumber: normalizedPhone,
        botApplicant: botApplicant ? {
          _id: botApplicant._id,
          contactId: botApplicant.contactId,
          state: botApplicant.state,
          fullName: botApplicant.fullName,
          documentNumber: botApplicant.documentNumber,
          createdAt: botApplicant.createdAt,
          updatedAt: botApplicant.updatedAt,
        } : null,
        botSession: activeSession ? {
          _id: activeSession._id,
          contactId: activeSession.contactId,
          profileId: activeSession.profileId,
          threadId: activeSession.threadId,
          serviceId: activeSession.serviceId,
          state: activeSession.state,
          currentFieldIndex: activeSession.currentFieldIndex,
          createdAt: activeSession.createdAt,
          updatedAt: activeSession.updatedAt,
        } : null,
        conversations: conversations.slice(0, 5).map(c => ({
          _id: c._id,
          contactId: c.contactId,
          status: c.status,
          threadId: c.threadId,
          lastMessageAt: c.lastMessageAt,
          lastMessagePreview: c.lastMessagePreview,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        profile: profile ? {
          _id: profile._id,
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
          documentNumber: profile.documentNumber,
          userId: profile.userId,
        } : null,
        agentThread: agentThread ? {
          threadId: (agentThread as { threadId?: string }).threadId || currentThreadId,
          title: (agentThread as { title?: string }).title,
          _creationTime: (agentThread as { _creationTime?: number })._creationTime,
          status: (agentThread as { status?: string }).status,
          summary: (agentThread as { summary?: string }).summary,
          userId: (agentThread as { userId?: string }).userId,
        } : null,
        agentThreadError,
      },
      next_recommended: [
        !currentThreadId ? "Create a new thread for this contact" : null,
        threadIdFromSession && !threadIdFromConversation ? "Ensure threadId is persisted to conversation table" : null,
        status === "critical" ? "Review conversation creation flow" : null,
      ].filter(Boolean),
      risks: [
        "Agent threads are managed by Convex Agent Framework - cannot query by contactId directly",
        "ThreadId must be explicitly persisted to conversations table for cross-session continuity",
        "If session is reset but conversation threadId remains, there will be inconsistency",
      ],
      skill_resolution: {
        canQueryAgentThreads: true,
        canListThreadsByContactId: false, // Limitation: no index by contactId in agent component
        limitationReason: "Convex Agent Framework threads are identified by threadId only. To list all threads for a user, would need a custom index table.",
      },
    };
  },
});

export const inspectUser = internalQuery({
  args: { email: v.optional(v.string()), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    let user = null;
    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else if (args.email) {
      user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), args.email))
        .first();
    }

    if (!user) return { error: "User not found" };

    const userId = user._id;
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
      
    const roles = await Promise.all(
        userRoles.map((ur) => ctx.db.get(ur.roleId))
    );

    return {
      user,
      profile,
      authAccounts,
      roles
    };
  },
});
