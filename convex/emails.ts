"use node";

import { anyApi } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "Peretantico <notificaciones@peretantico.com>";

type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

type RequestSummary = {
  applicationNumber: string;
  requestStatus: string;
  entryDate: number;
  isPrioritized: boolean;
  distributorId?: Id<"distributors">;
  title?: string;
  serviceName?: string;
  applicantName?: string;
  applicantPhone?: string;
  distributorName?: string;
  distributorPhone?: string;
  applicationScore?: number;
  observations?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidEmail(email?: string | null) {
  return Boolean(email && email.includes("@"));
}

function buildRequestSummaryHtml(request: RequestSummary) {
  const statusColor =
    request.requestStatus === "Finalizada"
      ? "#16a34a"
      : request.requestStatus === "EnProceso"
        ? "#2563eb"
        : request.requestStatus === "Atendida"
          ? "#7c3aed"
          : "#ea580c";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="margin-bottom: 16px;">Solicitud ${escapeHtml(request.applicationNumber)}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 8px 0;"><strong>Estado</strong></td>
          <td style="padding: 8px 0;">
            <span style="background:${statusColor};color:#fff;padding:4px 10px;border-radius:999px;font-size:12px;">
              ${escapeHtml(request.requestStatus)}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Fecha</strong></td>
          <td style="padding: 8px 0;">${escapeHtml(new Date(request.entryDate).toLocaleString("es-CO"))}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Prioridad</strong></td>
          <td style="padding: 8px 0;">${request.isPrioritized ? "Prioritaria" : "Normal"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Servicio</strong></td>
          <td style="padding: 8px 0;">${escapeHtml(request.serviceName ?? "Sin servicio")}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Solicitante</strong></td>
          <td style="padding: 8px 0;">${escapeHtml(request.applicantName ?? "Sin nombre")}</td>
        </tr>
        ${request.applicantPhone ? `
        <tr>
          <td style="padding: 8px 0;"><strong>Teléfono</strong></td>
          <td style="padding: 8px 0;">${escapeHtml(request.applicantPhone)}</td>
        </tr>` : ""}
        ${request.distributorName ? `
        <tr>
          <td style="padding: 8px 0;"><strong>Repartidor</strong></td>
          <td style="padding: 8px 0;">${escapeHtml(request.distributorName)}</td>
        </tr>` : ""}
        ${request.distributorPhone ? `
        <tr>
          <td style="padding: 8px 0;"><strong>Tel. repartidor</strong></td>
          <td style="padding: 8px 0;">${escapeHtml(request.distributorPhone)}</td>
        </tr>` : ""}
        ${request.title ? `
        <tr>
          <td style="padding: 8px 0;"><strong>Título</strong></td>
          <td style="padding: 8px 0;">${escapeHtml(request.title)}</td>
        </tr>` : ""}
      </table>
      ${typeof request.applicationScore === "number" ? `<p><strong>Calificación:</strong> ${escapeHtml(request.applicationScore)}/5</p>` : ""}
      ${request.observations ? `<p><strong>Observaciones:</strong> ${escapeHtml(request.observations)}</p>` : ""}
      <p style="font-size:12px;color:#6b7280;margin-top:24px;">Correo generado automáticamente por Peretantico.</p>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!isValidEmail(to)) {
    console.warn("[emails] destinatario inválido, se omite", { to });
    return { success: false, error: "invalid-recipient" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

  if (!apiKey) {
    console.warn("[emails] RESEND_API_KEY no configurada, se omite envío real", { to, subject });
    return { success: false, error: "missing-resend-api-key" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    const data = (await response.json()) as { id?: string; message?: string; error?: { message?: string } };

    if (!response.ok) {
      const error = data.error?.message ?? data.message ?? response.statusText;
      console.error("[emails] error enviando con Resend", { to, subject, error });
      return { success: false, error };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("[emails] fallo de red enviando correo", { to, subject, error });
    return { success: false, error: String(error) };
  }
}

async function sendBulkEmails(recipients: Array<string | null | undefined>, subject: string, html: string) {
  const uniqueRecipients = [...new Set(recipients.filter(isValidEmail))] as string[];
  for (const recipient of uniqueRecipients) {
    await sendEmail(recipient, subject, html);
  }
}

async function getRequestSummary(ctx: ActionCtx, requestId: Id<"requests">) {
  const request = await ctx.runQuery(anyApi.requests.get, { id: requestId });
  if (!request) {
    return null;
  }

  return {
    applicationNumber: request.applicationNumber,
    requestStatus: request.requestStatus,
    entryDate: request.entryDate,
    isPrioritized: request.isPrioritized,
    distributorId: request.distributorId,
    title: request.title,
    serviceName: request.service?.name,
    applicantName: request.applicant?.fullName,
    applicantPhone: request.applicant?.phoneNumber,
    distributorName: request.distributor?.title,
    distributorPhone: request.distributor?.phoneNumber,
    applicationScore: request.applicationScore,
    observations: request.observations,
  } satisfies RequestSummary;
}

export const notifyNewRequest = internalAction({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const [admins, summary] = await Promise.all([
      ctx.runQuery(anyApi.users.listAdminNotificationEmails, {}),
      getRequestSummary(ctx, args.requestId),
    ]);

    if (!summary || admins.length === 0) {
      return;
    }

    const subject = `Nueva solicitud registrada: ${summary.applicationNumber}`;
    const html = `<h1>Nueva solicitud registrada</h1>${buildRequestSummaryHtml(summary)}`;
    await sendBulkEmails(admins, subject, html);
  },
});

export const notifyDistributorAssignment = internalAction({
  args: {
    requestId: v.id("requests"),
    distributorId: v.id("distributors"),
  },
  handler: async (ctx, args) => {
    const [admins, summary, distributorEmail] = await Promise.all([
      ctx.runQuery(anyApi.users.listAdminNotificationEmails, {}),
      getRequestSummary(ctx, args.requestId),
      ctx.runQuery(anyApi.distributors.getNotificationEmail, { distributorId: args.distributorId }),
    ]);

    if (!summary) {
      return;
    }

    await sendBulkEmails(
      admins,
      `Repartidor asignado: ${summary.applicationNumber}`,
      `<h1>Asignación de repartidor</h1><p>Se asignó un repartidor a la solicitud.</p>${buildRequestSummaryHtml(summary)}`,
    );

    if (distributorEmail) {
      await sendEmail(
        distributorEmail,
        `Nueva solicitud asignada: ${summary.applicationNumber}`,
        `<h1>Tenés una nueva solicitud asignada</h1>${buildRequestSummaryHtml(summary)}`,
      );
    }
  },
});

export const notifyRequestStatusChange = internalAction({
  args: {
    requestId: v.id("requests"),
    oldStatus: v.string(),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.oldStatus === args.newStatus) {
      return;
    }

    const summary = await getRequestSummary(ctx, args.requestId);
    if (!summary) {
      return;
    }

    summary.requestStatus = args.newStatus;

    const [admins, distributorEmail] = await Promise.all([
      ctx.runQuery(anyApi.users.listAdminNotificationEmails, {}),
      summary.distributorId
        ? ctx.runQuery(anyApi.distributors.getNotificationEmail, { distributorId: summary.distributorId as never })
        : Promise.resolve(null),
    ]);

    const html = `
      <h1>Estado de solicitud actualizado</h1>
      <p><strong>Estado anterior:</strong> ${escapeHtml(args.oldStatus)}</p>
      <p><strong>Nuevo estado:</strong> ${escapeHtml(args.newStatus)}</p>
      ${buildRequestSummaryHtml(summary)}
    `;

    await sendBulkEmails(admins, `Cambio de estado: ${summary.applicationNumber}`, html);

    if (distributorEmail) {
      await sendEmail(distributorEmail, `Estado actualizado: ${summary.applicationNumber}`, html);
    }
  },
});

export const notifyRequestScoreOrObservations = internalAction({
  args: {
    requestId: v.id("requests"),
    hasScoreChange: v.boolean(),
    hasObservationsChange: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.hasScoreChange && !args.hasObservationsChange) {
      return;
    }

    const [admins, summary] = await Promise.all([
      ctx.runQuery(anyApi.users.listAdminNotificationEmails, {}),
      getRequestSummary(ctx, args.requestId),
    ]);

    if (!summary || admins.length === 0) {
      return;
    }

    const details = [
      args.hasScoreChange && typeof summary.applicationScore === "number"
        ? `<p><strong>Calificación:</strong> ${escapeHtml(summary.applicationScore)}/5</p>`
        : "",
      args.hasObservationsChange && summary.observations
        ? `<p><strong>Observaciones:</strong> ${escapeHtml(summary.observations)}</p>`
        : "",
    ].join("");

    await sendBulkEmails(
      admins,
      `Solicitud calificada: ${summary.applicationNumber}`,
      `<h1>Actualización de calificación u observaciones</h1>${details}${buildRequestSummaryHtml(summary)}`,
    );
  },
});

export const sendResetEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (_ctx, args) => {
    const subject = "Restablecer contraseña - Peretantico";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Restablecer contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Utiliza el siguiente código para continuar:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${escapeHtml(args.token)}</span>
        </div>
        <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
        <p>El código expirará en 15 minutos.</p>
      </div>
    `;

    await sendEmail(args.email, subject, html);
  },
});
