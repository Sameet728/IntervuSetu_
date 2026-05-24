const { Resend } = require("resend");
const fs = require("fs");

// Lazily initialize — avoids crash when key is a placeholder at startup
let _resend = null;
const getResend = () => {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("your_")) {
      throw new Error("RESEND_API_KEY is not configured. Add it to your .env file.");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

const FROM_EMAIL = process.env.RESEND_FROM || "onboarding@resend.dev";

/**
 * Send a single interview invitation email.
 */
const sendInviteEmail = async ({ to, orgName, interviewTitle, role, joinUrl, deadline }) => {
  const deadlineText = deadline
    ? `<p style="color:#888;font-size:13px;">⏰ Deadline: ${new Date(deadline).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:Inter,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#0f1629;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🎯 Interview Invitation</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#94a3b8;font-size:15px;margin-top:0;">Hello,</p>
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
        <strong style="color:#6366f1;">${orgName}</strong> has invited you to take an AI-powered interview for the role of 
        <strong style="color:#06b6d4;">${role}</strong>.
      </p>
      <div style="background:#1e293b;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:0;">Interview Details</p>
        <p style="color:#e2e8f0;font-size:16px;font-weight:700;margin:0;">${interviewTitle}</p>
        <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Role: ${role}</p>
        ${deadlineText}
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${joinUrl}" style="background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px;display:inline-block;">
          Start Interview →
        </a>
      </div>
      <p style="color:#475569;font-size:12px;text-align:center;">
        Or copy this link: <a href="${joinUrl}" style="color:#6366f1;">${joinUrl}</a>
      </p>
    </div>
    <div style="border-top:1px solid #1e293b;padding:20px 32px;text-align:center;">
      <p style="color:#334155;font-size:12px;margin:0;">Powered by InterviewAI • AI-Powered Technical Interviews</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `You're invited to interview at ${orgName} for ${role}`,
      html,
    });
    if (error) {
      console.error("Resend API Error (Invite):", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Email send exception:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk invite emails (from CSV list).
 */
const sendBulkInvites = async ({ emails, orgName, interviewTitle, role, joinUrl, deadline }) => {
  const results = await Promise.allSettled(
    emails.map((email) =>
      sendInviteEmail({ to: email, orgName, interviewTitle, role, joinUrl, deadline })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failed = results.length - sent;

  return { sent, failed, total: results.length };
};

/**
 * Send interview completion report via email.
 */
const sendReportEmail = async ({ to, candidateName, role, overallScore, summary, joinUrl, pdfPath }) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Inter,sans-serif;background:#0a0f1e;color:#e2e8f0;padding:20px;">
  <div style="background:#0f1629;border:1px solid #1e293b;border-radius:12px;padding:30px;max-width:600px;margin:auto;">
    <h2 style="color:#06b6d4;">Interview Completed: ${candidateName}</h2>
    <p>The candidate has completed the AI interview for the role of <strong>${role}</strong>.</p>
    <div style="background:#1e293b;padding:15px;border-radius:8px;margin:20px 0;">
      <p style="margin:0;"><strong style="color:#6366f1;">Overall Score:</strong> ${overallScore}/10</p>
      <p style="margin:8px 0 0;"><strong style="color:#6366f1;">Summary:</strong> ${summary}</p>
    </div>
    <p>Please find the detailed PDF report attached.</p>
    <a href="${joinUrl}" style="background:#6366f1;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">
      View Full Dashboard
    </a>
  </div>
</body>
</html>
  `;

  let attachments = [];
  if (pdfPath && fs.existsSync(pdfPath)) {
    const fileContent = fs.readFileSync(pdfPath);
    attachments.push({
      filename: `Report_${candidateName.replace(/\s+/g, '_')}_${role.replace(/\s+/g, '_')}.pdf`,
      content: fileContent,
    });
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `Interview Report: ${candidateName} (${overallScore}/10)`,
      html,
      attachments,
    });
    if (error) {
      console.error("Resend API Error (Report):", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Report email exception:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP for forgot password.
 */
const sendOtpEmail = async ({ to, name, otp }) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center;">
      <div style="background:rgba(255,255,255,0.2);width:48px;height:48px;border-radius:24px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:24px;">🔒</span>
      </div>
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Password Reset</h1>
    </div>
    <div style="padding:40px 32px;text-align:center;">
      <p style="color:#52525b;font-size:16px;margin-top:0;">Hello ${name || 'there'},</p>
      <p style="color:#3f3f46;font-size:16px;line-height:1.6;margin-bottom:32px;">
        We received a request to reset your password for your InterviewAI account. Use the code below to securely change your password.
      </p>
      <div style="background:#f4f4f5;border-radius:12px;padding:24px;margin:0 auto 32px auto;max-width:300px;border:1px dashed #d4d4d8;">
        <p style="color:#18181b;font-size:36px;font-weight:800;letter-spacing:12px;margin:0;text-align:center;font-family:monospace;">${otp}</p>
      </div>
      <p style="color:#71717a;font-size:14px;line-height:1.6;margin-bottom:0;">
        This code is valid for exactly <strong>15 minutes</strong>.<br/>
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div style="background:#fafafa;border-top:1px solid #eaeaea;padding:24px 32px;text-align:center;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">InterviewAI • Next-Gen Technical Interviews</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `Your Password Reset Code: ${otp}`,
      html,
    });
    if (error) {
      console.error("Resend API Error (OTP):", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error("OTP email exception:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP for email verification on signup.
 */
const sendSignupOtpEmail = async ({ to, name, otp }) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#10b981,#3b82f6);padding:40px 32px;text-align:center;">
      <div style="background:rgba(255,255,255,0.2);width:48px;height:48px;border-radius:24px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:24px;">✉️</span>
      </div>
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Verify your Email</h1>
    </div>
    <div style="padding:40px 32px;text-align:center;">
      <p style="color:#52525b;font-size:16px;margin-top:0;">Welcome, ${name || 'there'}!</p>
      <p style="color:#3f3f46;font-size:16px;line-height:1.6;margin-bottom:32px;">
        Thanks for starting your journey with InterviewAI. Please enter the verification code below to confirm your email address and activate your account.
      </p>
      <div style="background:#f4f4f5;border-radius:12px;padding:24px;margin:0 auto 32px auto;max-width:300px;border:1px dashed #d4d4d8;">
        <p style="color:#18181b;font-size:36px;font-weight:800;letter-spacing:12px;margin:0;text-align:center;font-family:monospace;">${otp}</p>
      </div>
      <p style="color:#71717a;font-size:14px;line-height:1.6;margin-bottom:0;">
        This code expires in <strong>15 minutes</strong>.
      </p>
    </div>
    <div style="background:#fafafa;border-top:1px solid #eaeaea;padding:24px 32px;text-align:center;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">InterviewAI • Next-Gen Technical Interviews</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `Verify your InterviewAI account (${otp})`,
      html,
    });
    if (error) {
      console.error("Resend API Error (Signup OTP):", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Signup OTP email exception:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Welcome Email after successful signup.
 */
const sendWelcomeEmail = async ({ to, name }) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#000000,#4338ca);padding:40px 32px;text-align:center;">
      <div style="background:rgba(255,255,255,0.15);width:64px;height:64px;border-radius:32px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <span style="font-size:32px;">🚀</span>
      </div>
      <h1 style="color:#ffffff;margin:0;font-size:32px;font-weight:800;letter-spacing:-1px;">Welcome to InterviewAI!</h1>
    </div>
    <div style="padding:40px 32px;text-align:center;">
      <p style="color:#18181b;font-size:18px;font-weight:600;margin-top:0;">Your account is ready, ${name}.</p>
      <p style="color:#3f3f46;font-size:16px;line-height:1.6;margin-bottom:32px;">
        We are thrilled to have you on board. InterviewAI is built to help you master technical interviews, practice with AI, and land your dream role with confidence.
      </p>
      
      <div style="text-align:left;background:#f8fafc;padding:24px;border-radius:12px;margin-bottom:32px;border:1px solid #f1f5f9;">
        <h3 style="margin-top:0;font-size:16px;color:#0f172a;margin-bottom:12px;">Here is what you can do right now:</h3>
        <ul style="margin:0;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
          <li>Set up your complete profile & upload resume</li>
          <li>Take your first AI-driven mock interview</li>
          <li>Review personalized feedback & scores</li>
        </ul>
      </div>

      <a href="https://interviewai.app/dashboard" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;transition:all 0.2s;">
        Go to Dashboard
      </a>
    </div>
    <div style="background:#fafafa;border-top:1px solid #eaeaea;padding:24px 32px;text-align:center;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">You are receiving this because you signed up for InterviewAI.</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `Welcome to InterviewAI, ${name} 🎉`,
      html,
    });
    if (error) {
      console.error("Resend API Error (Welcome):", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Welcome email exception:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send contact form submission
 */
const sendContactEmail = async (email, message) => {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: FROM_EMAIL,
      reply_to: email,
      subject: `New Contact Form Submission from ${email}`,
      html: `
        <h2>New Message from IntervuSetu</h2>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
    });

    if (error) {
      console.error("Resend API Error (Contact):", error.message);
      throw new Error(error.message);
    }
    return data;
  } catch (error) {
    console.error("Failed to send contact email:", error);
    throw error;
  }
};

module.exports = { sendInviteEmail, sendBulkInvites, sendReportEmail, sendOtpEmail, sendSignupOtpEmail, sendWelcomeEmail, sendContactEmail };
