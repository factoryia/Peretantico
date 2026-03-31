import { Email } from "@convex-dev/auth/providers/Email";

const RESEND_API_URL = "https://api.resend.com/emails";

// Generate cryptographically secure 6-digit numeric code
function generateNumericCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  // Get 6 digits by taking modulo of the random value
  const num = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  return String(Math.abs(num) % 1000000).padStart(6, "0");
}

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.RESEND_FROM_EMAIL,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    // Generate 6-digit numeric code for better UX
    return generateNumericCode();
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim() || "Peretantico <notificaciones@peretanticoapiv1.cloudnova.win>";
    
    if (!apiKey) {
      throw new Error("RESEND_API_KEY no configurada");
    }

    const subject = "Restablecer contraseña - Peretantico";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Restablecer contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Utiliza el siguiente código para continuar:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${token}</span>
        </div>
        <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
        <p>El código expirará en 15 minutos.</p>
      </div>
    `;

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, html }),
    });

    const data = (await response.json()) as { id?: string; message?: string; error?: { message?: string } };

    if (!response.ok) {
      const error = data.error?.message ?? data.message ?? response.statusText;
      console.error("[ResendOTP] error enviando correo", { to: email, error });
      throw new Error(JSON.stringify(error));
    }
  },
});