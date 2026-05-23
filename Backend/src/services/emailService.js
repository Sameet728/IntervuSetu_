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

const FROM_EMAIL = process.env.RESEND_FROM || "noreply@interviewai.app";

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
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `You're invited to interview at ${orgName} for ${role}`,
      html,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("Email send error:", error.message);
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
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `Interview Report: ${candidateName} (${overallScore}/10)`,
      html,
      attachments,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("Report email send error:", error.message);
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
<body style="margin:0;padding:0;background:#0a0f1e;font-family:Inter,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#0f1629;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🔒 Password Reset</h1>
    </div>
    <div style="padding:32px;text-align:center;">
      <p style="color:#94a3b8;font-size:15px;margin-top:0;">Hello ${name || 'there'},</p>
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
        We received a request to reset your password. Here is your 6-digit verification code. It is valid for exactly 15 minutes.
      </p>
      <div style="background:#1e293b;border-radius:12px;padding:24px;margin:32px 0;border:1px solid #334155;">
        <p style="color:#fff;font-size:32px;font-weight:800;letter-spacing:8px;margin:0;text-align:center;">${otp}</p>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin-bottom:0;">
        If you did not request this, please ignore this email. Your password will remain unchanged.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `Your Password Reset Code: ${otp}`,
      html,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("OTP email send error:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendInviteEmail, sendBulkInvites, sendReportEmail, sendOtpEmail };
