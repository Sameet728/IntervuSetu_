"use strict";
const PDFDocument = require("pdfkit");
const User = require("../models/User");
const Interview = require("../models/Interview");

// ─── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  // Dark header/accent
  primary:    "#0f172a",
  surface:    "#1e293b",
  card:       "#f8fafc",
  border:     "#e2e8f0",
  // Brand
  cyan:       "#06b6d4",
  violet:     "#7c3aed",
  // Semantic
  success:    "#10b981",
  warning:    "#f59e0b",
  danger:     "#ef4444",
  // Text
  textDark:   "#0f172a",
  textBody:   "#334155",
  textMuted:  "#64748b",
  textLight:  "#94a3b8",
  white:      "#ffffff",
};

const scoreColor = (s) => {
  if (s >= 8) return C.success;
  if (s >= 5) return C.warning;
  return C.danger;
};

const recMap = {
  strong_hire:    { label: "Strong Hire",    color: C.success },
  hire:           { label: "Hire",           color: C.success },
  borderline:     { label: "Borderline",     color: C.warning },
  no_hire:        { label: "No Hire",        color: C.danger  },
  strong_no_hire: { label: "Strong No Hire", color: C.danger  },
};

const fmtDate = (d, full = false) => {
  if (!d) return "N/A";
  const date = new Date(d);
  return full
    ? date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
};

const fmtTime = (secs) => {
  if (!secs) return "0m 0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function sectionTitle(doc, text, y, MARGIN, INNER) {
  // left accent bar
  doc.rect(MARGIN, y, 3, 14).fill(C.cyan);
  doc.fill(C.textDark).fontSize(11).font("Helvetica-Bold")
     .text(text.toUpperCase(), MARGIN + 10, y + 1, { characterSpacing: 0.8 });
  doc.moveTo(MARGIN, y + 18).lineTo(MARGIN + INNER, y + 18)
     .strokeColor(C.border).lineWidth(0.5).stroke();
  return y + 26;
}

function scoreBar(doc, label, value, x, y, barW) {
  const fillW = Math.max(0, ((value || 0) / 10) * barW);
  doc.fill(C.textMuted).fontSize(8).font("Helvetica").text(label, x, y);
  doc.fill(scoreColor(value)).fontSize(8).font("Helvetica-Bold")
     .text(`${value ?? "—"}/10`, x + barW - 28, y, { width: 32, align: "right" });
  y += 12;
  doc.roundedRect(x, y, barW, 6, 3).fill("#e2e8f0");
  doc.roundedRect(x, y, fillW, 6, 3).fill(scoreColor(value));
  return y + 14;
}

function pill(doc, text, x, y, bg, fg) {
  const tw = doc.widthOfString(text, { fontSize: 8 }) + 12;
  doc.roundedRect(x, y, tw, 14, 4).fill(bg);
  doc.fill(fg).fontSize(7).font("Helvetica-Bold").text(text, x + 6, y + 3, { width: tw - 12 });
  return x + tw + 6;
}

function checkNewPage(doc, y, needed, MARGIN) {
  if (y + needed > doc.page.height - 60) {
    doc.addPage();
    return 40;
  }
  return y;
}

/**
 * Generate a premium, multi-page PDF report.
 * @param {Object} report  - Report document (lean)
 * @param {Object} user    - User document (lean)
 * @param {Object} interview - Interview document (lean), optional extras
 */
const generatePDF = async (reportInput, userInput, interviewInput) => {
  // Allow calling with just (report) — fetch extras if IDs available
  let report = reportInput;
  let user   = userInput   ?? null;
  let interview = interviewInput ?? null;

  if (!user && report.userId) {
    try {
      user = await User.findById(report.userId).select("-password -resetPasswordOtp").lean();
    } catch (_) { user = null; }
  }
  if (!interview && report.interviewId) {
    try {
      interview = await Interview.findById(report.interviewId).lean();
    } catch (_) { interview = null; }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
        info: {
          Title: `Interview Report — ${report.role || ""}`,
          Author: "InterviewAI Platform",
          Subject: "AI-Generated Performance Report",
          Creator: "InterviewAI",
        },
      });

      const buffers = [];
      doc.on("data", (c) => buffers.push(c));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const PAGE_W  = doc.page.width;   // 595 A4
      const PAGE_H  = doc.page.height;  // 842 A4
      const MARGIN  = 48;
      const INNER   = PAGE_W - MARGIN * 2;
      const HALF    = (INNER - 12) / 2;

      let y;

      // ═══════════════════════════════════════════════════════════════
      // PAGE 1 — COVER + SUMMARY
      // ═══════════════════════════════════════════════════════════════

      // ── Header banner ────────────────────────────────────────────
      doc.rect(0, 0, PAGE_W, 120).fill(C.primary);
      // Subtle accent strip
      doc.rect(0, 105, PAGE_W, 4).fill(C.cyan);

      // Logo / brand
      doc.fill(C.cyan).fontSize(8).font("Helvetica-Bold")
         .text("INTERVIEWAI  ·  AI PERFORMANCE REPORT", MARGIN, 18, { characterSpacing: 1.5 });

      // Role (large)
      doc.fill(C.white).fontSize(22).font("Helvetica-Bold")
         .text(report.role || "Interview Report", MARGIN, 34);

      // Subtitle row
      const subParts = [
        report.experienceLevel?.toUpperCase(),
        report.interviewType?.replace(/_/g, " ").toUpperCase(),
        fmtDate(report.createdAt, true),
      ].filter(Boolean);
      doc.fill(C.textLight).fontSize(9).font("Helvetica")
         .text(subParts.join("  ·  "), MARGIN, 65);

      // Date chip top-right
      doc.fill(C.cyan).fontSize(8).font("Helvetica-Bold")
         .text(fmtDate(report.createdAt), PAGE_W - MARGIN - 70, 18, { width: 70, align: "right" });

      // Report ID top-right
      doc.fill(C.textLight).fontSize(7).font("Helvetica")
         .text(`ID: ${report.interviewId || report._id}`, PAGE_W - MARGIN - 70, 32, {
            width: 70, align: "right",
         });

      y = 130;

      // ── Candidate Info Card ──────────────────────────────────────
      doc.roundedRect(MARGIN, y, INNER, 70, 6).fillAndStroke(C.card, C.border);

      // left column
      const lx = MARGIN + 14;
      const rx = MARGIN + HALF + 14;
      const iy = y + 12;
      doc.fill(C.textMuted).fontSize(7).font("Helvetica-Bold")
         .text("CANDIDATE", lx, iy, { characterSpacing: 0.5 });
      doc.fill(C.textDark).fontSize(11).font("Helvetica-Bold")
         .text(user?.name || "N/A", lx, iy + 10);
      doc.fill(C.textBody).fontSize(8).font("Helvetica")
         .text(user?.email || "", lx, iy + 24);

      // user type chip
      const userTypeLabel = user?.userType === "student"
        ? `${user.college || "Student"}  ·  ${user.branch || ""}  ${user.year || ""}`.trim()
        : `${user?.company || "Professional"}  ·  ${user?.yearsOfExperience || 0} yrs exp`;
      doc.fill(C.textMuted).fontSize(8).font("Helvetica")
         .text(userTypeLabel, lx, iy + 36);
      if (user?.skills?.length > 0) {
        doc.fill(C.violet).fontSize(7).font("Helvetica")
           .text("Skills: " + user.skills.slice(0, 6).join(", "), lx, iy + 48);
      }

      // right column
      const infoItems = [
        ["Difficulty",   report.difficulty || "adaptive"],
        ["Tech Stack",   (report.techStack || []).join(", ") || "N/A"],
        ["Questions",    `${(report.questionBreakdown || []).length} answered`],
        ["Duration",     fmtTime(report.totalTimeTaken)],
        ["Avg / Question", `${report.averageTimePerQuestion || 0}s`],
        ["Violations",   `${report.violationCount || 0}`],
      ];
      infoItems.forEach(([k, v], i) => {
        const col = i < 3 ? rx : rx + HALF / 2;
        const row = iy + (i % 3) * 16;
        doc.fill(C.textMuted).fontSize(7).font("Helvetica").text(k + ":", col, row);
        doc.fill(C.textBody).fontSize(8).font("Helvetica-Bold")
           .text(v.toString().slice(0, 28), col + 58, row);
      });

      y += 82;

      // ── Score + Recommendation banner ───────────────────────────
      const score = report.overallScore ?? 0;
      const rec   = recMap[report.recommendation] || { label: report.recommendation || "N/A", color: C.textMuted };

      doc.roundedRect(MARGIN, y, INNER, 90, 8).fill(C.card);
      // left accent (score bg)
      doc.roundedRect(MARGIN, y, 86, 90, 8).fill(scoreColor(score) + "22"); // transparent tint

      // Big score digit
      doc.fill(scoreColor(score)).fontSize(46).font("Helvetica-Bold")
         .text(`${score}`, MARGIN, y + 14, { width: 86, align: "center" });
      doc.fill(C.textMuted).fontSize(9).font("Helvetica")
         .text("/10", MARGIN, y + 62, { width: 86, align: "center" });

      // Divider
      doc.moveTo(MARGIN + 92, y + 14).lineTo(MARGIN + 92, y + 76)
         .strokeColor(C.border).lineWidth(0.8).stroke();

      // Recommendation label
      doc.fill(rec.color).fontSize(14).font("Helvetica-Bold")
         .text(rec.label, MARGIN + 102, y + 10);

      if (report.autoSubmitted) {
        pill(doc, "AUTO-SUBMITTED", MARGIN + 102, y + 30, "#fef3c7", C.warning);
      }

      // Feedback text
      doc.fill(C.textBody).fontSize(8.5).font("Helvetica")
         .text(report.overallFeedback || "", MARGIN + 102, y + 48, {
            width: INNER - 110, lineGap: 2,
         });

      y += 102;

      // ── Score Breakdown ─────────────────────────────────────────
      y = sectionTitle(doc, "Score Breakdown", y, MARGIN, INNER);

      const scoreItems = [
        { label: "Technical Skills",  value: report.technicalScore },
        { label: "Communication",     value: report.communicationScore },
        { label: "Problem Solving",   value: report.problemSolvingScore },
        { label: "HR / Behavioral",   value: report.hrScore },
      ];
      if (report.codeQualityScore) scoreItems.push({ label: "Code Quality", value: report.codeQualityScore });

      scoreItems.forEach(({ label, value }, i) => {
        const col = i % 2 === 0 ? MARGIN : MARGIN + HALF + 12;
        if (i % 2 === 0 && i > 0) y += 32;
        scoreBar(doc, label, value, col, y, HALF);
      });
      y += 38;

      // ── Strengths & Weaknesses ──────────────────────────────────
      y = sectionTitle(doc, "Strengths & Areas to Improve", y, MARGIN, INNER);

      // Column headers
      doc.fill(C.success).fontSize(9).font("Helvetica-Bold")
         .text("✦  Strengths", MARGIN, y);
      doc.fill(C.danger).fontSize(9).font("Helvetica-Bold")
         .text("✦  Areas to Improve", MARGIN + HALF + 12, y);
      y += 14;

      const strengths  = report.strengths  || [];
      const weaknesses = report.weaknesses || [];
      const rows = Math.max(strengths.length, weaknesses.length);
      for (let i = 0; i < rows; i++) {
        y = checkNewPage(doc, y, 14, MARGIN);
        if (strengths[i]) {
          doc.fill(C.textBody).fontSize(8).font("Helvetica")
             .text(`▸  ${strengths[i]}`, MARGIN, y, { width: HALF });
        }
        if (weaknesses[i]) {
          doc.fill(C.textBody).fontSize(8).font("Helvetica")
             .text(`▸  ${weaknesses[i]}`, MARGIN + HALF + 12, y, { width: HALF });
        }
        y += 14;
      }
      y += 8;

      // ── Topics to Study ─────────────────────────────────────────
      if ((report.topicsToStudy || []).length > 0) {
        y = checkNewPage(doc, y, 50, MARGIN);
        y = sectionTitle(doc, "Topics to Study", y, MARGIN, INNER);
        const topics = report.topicsToStudy.slice(0, 10);
        let px = MARGIN;
        topics.forEach((topic) => {
          if (px + 90 > PAGE_W - MARGIN) { px = MARGIN; y += 20; }
          px = pill(doc, topic.slice(0, 20), px, y, "#ede9fe", C.violet);
        });
        y += 22;
      }

      // ── Improvement Areas ────────────────────────────────────────
      if ((report.improvementAreas || []).length > 0) {
        y = checkNewPage(doc, y, 50, MARGIN);
        y = sectionTitle(doc, "Improvement Roadmap", y, MARGIN, INNER);
        (report.improvementAreas || []).forEach((area, i) => {
          y = checkNewPage(doc, y, 14, MARGIN);
          doc.fill(C.violet).fontSize(8).font("Helvetica-Bold").text(`${i + 1}.`, MARGIN, y);
          doc.fill(C.textBody).fontSize(8).font("Helvetica")
             .text(area, MARGIN + 14, y, { width: INNER - 14 });
          y += doc.heightOfString(area, { width: INNER - 14, fontSize: 8 }) + 6;
        });
        y += 4;
      }

      // ── Candidate Tags / Badge ───────────────────────────────────
      if (report.badge || (report.candidateTags || []).length > 0) {
        y = checkNewPage(doc, y, 40, MARGIN);
        y = sectionTitle(doc, "AI Assessment Tags", y, MARGIN, INNER);
        let px = MARGIN;
        if (report.badge) {
          px = pill(doc, "🏆 " + report.badge, px, y, "#dcfce7", C.success);
        }
        (report.candidateTags || []).forEach((tag) => {
          if (px + 110 > PAGE_W - MARGIN) { px = MARGIN; y += 20; }
          px = pill(doc, tag.slice(0, 22), px, y, "#f0f9ff", C.cyan);
        });
        y += 22;
      }

      // ════════════════════════════════════════════════════════════════
      // PAGE 2 — QUESTION-BY-QUESTION BREAKDOWN
      // ════════════════════════════════════════════════════════════════
      doc.addPage();
      doc.rect(0, 0, PAGE_W, 56).fill(C.primary);
      doc.rect(0, 50, PAGE_W, 3).fill(C.cyan);
      doc.fill(C.white).fontSize(16).font("Helvetica-Bold")
         .text("Question-by-Question Analysis", MARGIN, 16);
      doc.fill(C.textLight).fontSize(8).font("Helvetica")
         .text(`${(report.questionBreakdown || []).length} questions  ·  ${fmtTime(report.totalTimeTaken)} total`, MARGIN, 36);

      y = 70;

      (report.questionBreakdown || []).forEach((q, idx) => {
        const qScore   = q.score ?? 0;
        const qFeedback = q.feedback || "";
        const qAnswer   = q.userAnswer || "";
        const qIdeal    = q.idealAnswer || "";
        const qCode     = q.userCode || "";

        // Estimate card height
        const ansH  = qAnswer ? doc.heightOfString(qAnswer,  { width: INNER - 24, fontSize: 8 }) : 0;
        const fdbH  = qFeedback ? doc.heightOfString(qFeedback, { width: INNER - 24, fontSize: 8 }) : 0;
        const idlH  = qIdeal ? doc.heightOfString(qIdeal,   { width: INNER - 24, fontSize: 8 }) : 0;
        const codeH = qCode  ? doc.heightOfString(qCode,    { width: INNER - 24, fontSize: 7 }) : 0;
        const needed = 50 + fdbH + (ansH ? ansH + 22 : 0) + (idlH ? idlH + 22 : 0) + (codeH ? codeH + 22 : 0) + 20;

        y = checkNewPage(doc, y, needed, MARGIN);

        // ── Question header ─────────────────────────────────────
        const qTextH = doc.heightOfString(`Q${idx + 1}: ${q.question}`, { width: INNER - 72, fontSize: 9.5 });
        const headerH = qTextH + 30;

        doc.roundedRect(MARGIN, y, INNER, headerH, 6).fill(C.card);
        // Left score bar
        doc.rect(MARGIN, y, 4, headerH).fill(scoreColor(qScore));

        // Score badge
        const bx = MARGIN + INNER - 46;
        doc.roundedRect(bx, y + 8, 40, 22, 4).fill(scoreColor(qScore));
        doc.fill(C.white).fontSize(10).font("Helvetica-Bold")
           .text(`${qScore}/10`, bx, y + 12, { width: 40, align: "center" });

        // Question text
        doc.fill(C.textDark).fontSize(9.5).font("Helvetica-Bold")
           .text(`Q${idx + 1}:  ${q.question}`, MARGIN + 12, y + 8, { width: INNER - 72 });

        // Meta pills row
        let mx = MARGIN + 12;
        const metaY = y + headerH - 18;
        mx = pill(doc, (q.questionType || "theory").toUpperCase(), mx, metaY, "#e0f2fe", C.cyan);
        mx = pill(doc, (q.difficulty || "medium").toUpperCase(),    mx, metaY, "#fef9c3", "#ca8a04");
        mx = pill(doc, `⏱ ${fmtTime(q.timeTaken)}`, mx, metaY, "#f1f5f9", C.textMuted);
        if (q.followupCount > 0) {
          pill(doc, `↩ ${q.followupCount} follow-up${q.followupCount > 1 ? "s" : ""}`, mx, metaY, "#ede9fe", C.violet);
        }

        y += headerH + 6;

        // ── Body area ───────────────────────────────────────────
        const bodyX = MARGIN + 8;
        const bodyW = INNER - 16;

        // AI Feedback
        if (qFeedback) {
          doc.fill(C.textMuted).fontSize(7).font("Helvetica-Bold")
             .text("AI FEEDBACK", bodyX, y, { characterSpacing: 0.5 });
          y += 10;
          doc.fill(C.textBody).fontSize(8).font("Helvetica")
             .text(qFeedback, bodyX, y, { width: bodyW, lineGap: 1.5 });
          y += fdbH + 8;
        }

        // User Answer
        if (qAnswer) {
          doc.fill(C.cyan).fontSize(7).font("Helvetica-Bold")
             .text("CANDIDATE'S ANSWER", bodyX, y, { characterSpacing: 0.5 });
          y += 10;
          doc.roundedRect(bodyX, y, bodyW, ansH + 8, 4).fill("#f0f9ff");
          doc.fill(C.textBody).fontSize(8).font("Helvetica")
             .text(`"${qAnswer}"`, bodyX + 6, y + 4, { width: bodyW - 12, lineGap: 1.5 });
          y += ansH + 16;
        }

        // Code Submission
        if (qCode) {
          doc.fill(C.violet).fontSize(7).font("Helvetica-Bold")
             .text("CODE SUBMISSION", bodyX, y, { characterSpacing: 0.5 });
          y += 10;
          doc.roundedRect(bodyX, y, bodyW, codeH + 8, 4).fill("#1e1b4b");
          doc.fill("#a5b4fc").fontSize(7).font("Courier")
             .text(qCode, bodyX + 6, y + 4, { width: bodyW - 12, lineGap: 2 });
          y += codeH + 16;
        }

        // Ideal Answer
        if (qIdeal) {
          doc.fill(C.success).fontSize(7).font("Helvetica-Bold")
             .text("IDEAL / EXPECTED ANSWER", bodyX, y, { characterSpacing: 0.5 });
          y += 10;
          doc.roundedRect(bodyX, y, bodyW, idlH + 8, 4).fill("#f0fdf4");
          doc.fill(C.textBody).fontSize(8).font("Helvetica")
             .text(qIdeal, bodyX + 6, y + 4, { width: bodyW - 12, lineGap: 1.5 });
          y += idlH + 16;
        }

        // Divider
        doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
           .strokeColor(C.border).lineWidth(0.5).dash(2, { space: 3 }).stroke();
        doc.undash();
        y += 14;
      });

      // ════════════════════════════════════════════════════════════════
      // PAGE 3 — FULL TRANSCRIPT
      // ════════════════════════════════════════════════════════════════
      const transcript = (report.transcriptText || "").trim();
      if (transcript.length > 0) {
        doc.addPage();
        doc.rect(0, 0, PAGE_W, 56).fill(C.primary);
        doc.rect(0, 50, PAGE_W, 3).fill(C.violet);
        doc.fill(C.white).fontSize(16).font("Helvetica-Bold")
           .text("Full Interview Transcript", MARGIN, 16);
        doc.fill(C.textLight).fontSize(8).font("Helvetica")
           .text("Raw conversation log as recorded during the session", MARGIN, 36);

        y = 70;

        const lines = transcript.split("\n").filter((l) => l.trim());
        lines.forEach((line) => {
          const isAI  = line.toLowerCase().startsWith("ai:");
          const isYou = line.toLowerCase().startsWith("you:") || line.toLowerCase().startsWith("candidate:");
          const lineH = doc.heightOfString(line, { width: INNER - 20, fontSize: 8 }) + 2;
          y = checkNewPage(doc, y, lineH + 10, MARGIN);

          if (isAI) {
            doc.roundedRect(MARGIN, y, INNER, lineH + 6, 3).fill("#f0f9ff");
            doc.fill(C.cyan).fontSize(7).font("Helvetica-Bold").text("AI", MARGIN + 6, y + 3);
            doc.fill(C.textBody).fontSize(8).font("Helvetica")
               .text(line.replace(/^ai:\s*/i, ""), MARGIN + 20, y + 3, { width: INNER - 28 });
          } else if (isYou) {
            doc.roundedRect(MARGIN, y, INNER, lineH + 6, 3).fill("#f5f3ff");
            doc.fill(C.violet).fontSize(7).font("Helvetica-Bold").text("YOU", MARGIN + 6, y + 3);
            doc.fill(C.textBody).fontSize(8).font("Helvetica")
               .text(line.replace(/^(you|candidate):\s*/i, ""), MARGIN + 26, y + 3, { width: INNER - 34 });
          } else {
            doc.fill(C.textMuted).fontSize(7.5).font("Helvetica").text(line, MARGIN + 6, y + 2, { width: INNER - 12 });
          }
          y += lineH + 10;
        });
      }

      // ════════════════════════════════════════════════════════════════
      // FOOTER — every page
      // ════════════════════════════════════════════════════════════════
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);

        // Bottom line
        doc.moveTo(MARGIN, PAGE_H - 36).lineTo(PAGE_W - MARGIN, PAGE_H - 36)
           .strokeColor(C.border).lineWidth(0.4).stroke();

        doc.fill(C.textLight).fontSize(7).font("Helvetica")
           .text(
             `InterviewAI  ·  Confidential Performance Report  ·  ${fmtDate(new Date(), true)}`,
             MARGIN, PAGE_H - 28,
             { width: (PAGE_W - MARGIN * 2) * 0.7 }
           );

        doc.fill(C.textLight).fontSize(7).font("Helvetica")
           .text(
             `Page ${i + 1} of ${range.count}`,
             PAGE_W - MARGIN - 60, PAGE_H - 28,
             { width: 60, align: "right" }
           );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePDF };
