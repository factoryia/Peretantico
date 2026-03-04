"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const sendEmail = async (to: string, subject: string, _html: string) => {
  // Placeholder para envío de correos
  // Anteriormente se usaba nodemailer
  console.log(`[Simulación] Enviando correo a ${to}: ${subject}`);
  return { success: true, messageId: "simulated-id" };
};

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
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${args.token}</span>
        </div>
        <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
        <p>El código expirará en 15 minutos.</p>
      </div>
    `;
    
    await sendEmail(args.email, subject, html);
  },
});
