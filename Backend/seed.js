/**
 * seed.js — Dummy data seed for testing the Org Hiring Platform UI
 *
 * Run with: node seed.js
 *
 * Creates:
 *   • 1 Organization  (login: org@demo.com / demo1234)
 *   • 1 InterviewTemplate with 5 questions + shareCode: DEMO1234
 *   • 5 candidate Users
 *   • 5 Interviews (completed) linked to the template
 *   • 5 Reports with scores, badges, tags
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ── Models ──────────────────────────────────────────────────────────────────
const Organization = require("./src/models/Organization");
const InterviewTemplate = require("./src/models/InterviewTemplate");
const User = require("./src/models/User");
const Interview = require("./src/models/Interview");
const Report = require("./src/models/Report");
const ScheduleSlot = require("./src/models/ScheduleSlot");

// ── Helpers ──────────────────────────────────────────────────────────────────
const id = () => new mongoose.Types.ObjectId();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUESTIONS = [
    {
        questionId: "q1",
        question: "Explain the difference between TCP and UDP with real-world examples.",
        questionType: "theory",
        difficulty: "medium",
        topic: "Networking",
        expectedAnswer: "TCP is connection-oriented with guaranteed delivery; UDP is connectionless and faster.",
    },
    {
        questionId: "q2",
        question: "Implement a function to detect a cycle in a linked list.",
        questionType: "code",
        difficulty: "medium",
        topic: "Data Structures",
        expectedAnswer: "Use Floyd's two-pointer (slow/fast) algorithm.",
    },
    {
        questionId: "q3",
        question: "Design a URL shortener like bit.ly. Walk through your architecture.",
        questionType: "system_design",
        difficulty: "hard",
        topic: "System Design",
        expectedAnswer: "Hash-based mapping, CDN, Redis cache, consistent hashing for DB sharding.",
    },
    {
        questionId: "q4",
        question: "What is the difference between useEffect and useLayoutEffect in React?",
        questionType: "theory",
        difficulty: "easy",
        topic: "React",
        expectedAnswer: "useLayoutEffect fires synchronously after DOM mutations, before paint.",
    },
    {
        questionId: "q5",
        question: "Tell me about a time you had a conflict with a teammate and how you resolved it.",
        questionType: "behavioral",
        difficulty: "medium",
        topic: "Soft Skills",
        expectedAnswer: "STAR method: situation, task, action, result.",
    },
];

const CANDIDATES = [
    {
        name: "Arjun Sharma",
        email: "arjun@iit.ac.in",
        userType: "student",
        college: "IIT Bombay",
        branch: "Computer Science",
        year: "BE",
        experienceLevel: "junior",
        skills: ["React", "Node.js", "MongoDB", "DSA"],
        score: 9.2,
        techScore: 9.5,
        commScore: 8.8,
        psScore: 9.0,
        timeMin: 38,
        badge: "Top Performer",
        tags: ["Strong in DSA", "Excellent system design", "Clear communicator"],
        violations: 0,
        recommendation: "strong_hire",
        candidateStatus: "shortlisted",
    },
    {
        name: "Priya Mehta",
        email: "priya.mehta@gmail.com",
        userType: "student",
        college: "NIT Surat",
        branch: "Information Technology",
        year: "BE",
        experienceLevel: "junior",
        skills: ["Python", "Django", "PostgreSQL"],
        score: 8.1,
        techScore: 8.3,
        commScore: 8.6,
        psScore: 7.8,
        timeMin: 42,
        badge: "Strong Communicator",
        tags: ["Very articulate", "Good problem solving", "Needs more DSA practice"],
        violations: 1,
        recommendation: "hire",
        candidateStatus: "shortlisted",
    },
    {
        name: "Rohan Desai",
        email: "rohan.desai@techcorp.com",
        userType: "professional",
        college: "",
        company: "Infosys",
        year: "",
        branch: "",
        yearsOfExperience: 2,
        experienceLevel: "mid",
        skills: ["Java", "Spring Boot", "AWS", "Microservices"],
        score: 7.4,
        techScore: 7.8,
        commScore: 7.0,
        psScore: 7.5,
        timeMin: 44,
        badge: null,
        tags: ["Solid backend knowledge", "Needs improvement in system design"],
        violations: 0,
        recommendation: "hire",
        candidateStatus: "pending",
    },
    {
        name: "Sneha Patel",
        email: "sneha.patel@college.edu",
        userType: "student",
        college: "BITS Pilani",
        branch: "Electronics & CS",
        year: "TE",
        experienceLevel: "junior",
        skills: ["C++", "React", "GraphQL"],
        score: 6.2,
        techScore: 6.0,
        commScore: 6.5,
        psScore: 6.3,
        timeMin: 51,
        badge: null,
        tags: ["Average performance", "Good attitude", "Needs more practice"],
        violations: 3,
        recommendation: "borderline",
        candidateStatus: "pending",
    },
    {
        name: "Karan Malhotra",
        email: "karan.m@startup.io",
        userType: "professional",
        college: "",
        company: "Razorpay",
        year: "",
        branch: "",
        yearsOfExperience: 3,
        experienceLevel: "mid",
        skills: ["Go", "Kubernetes", "Redis", "Kafka"],
        score: 8.7,
        techScore: 9.1,
        commScore: 8.2,
        psScore: 8.9,
        timeMin: 35,
        badge: "Fast Solver",
        tags: ["Excellent in distributed systems", "Fast and accurate", "Great technical depth"],
        violations: 0,
        recommendation: "strong_hire",
        candidateStatus: "selected",
    },
];

async function seed() {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected\n");

    // ── Cleanup old seed data ─────────────────────────────────────────────────
    console.log("🧹 Cleaning up old seed data...");
    await Organization.deleteOne({ email: "org@demo.com" });
    await InterviewTemplate.deleteOne({ shareCode: "DEMO1234" });
    const oldUsers = await User.find({ email: { $in: CANDIDATES.map((c) => c.email) } });
    const oldUserIds = oldUsers.map((u) => u._id);
    await Interview.deleteMany({ userId: { $in: oldUserIds } });
    await Report.deleteMany({ userId: { $in: oldUserIds } });
    await User.deleteMany({ email: { $in: CANDIDATES.map((c) => c.email) } });
    await ScheduleSlot.deleteMany({});
    console.log("✅ Cleaned\n");

    // ── 1. Create Organization ────────────────────────────────────────────────
    console.log("🏢 Creating organization...");
    const org = await Organization.create({
        name: "TechHire Solutions",
        type: "company",
        email: "org@demo.com",
        password: "demo1234",  // will be hashed by pre-save hook
        description: "AI-powered technical hiring for top engineering talent.",
        website: "https://techhire.demo",
        logo: "",
    });
    console.log(`   ✅ Org: ${org.name} (${org.email})`);

    // ── 2. Create InterviewTemplate ───────────────────────────────────────────
    console.log("\n📋 Creating interview template...");
    const template = await InterviewTemplate.create({
        organizationId: org._id,
        title: "SDE Hiring Round 1 — Batch 2025",
        role: "Software Development Engineer",
        interviewType: "mixed",
        difficulty: "adaptive",
        duration: 45,
        questionCount: 5,
        techStack: ["React", "Node.js", "System Design", "DSA"],
        instructions: "This is a 45-minute AI-powered interview. Speak clearly and think aloud as you solve problems.",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxAttempts: 1,
        proctoringEnabled: true,
        questions: QUESTIONS,
        shareCode: "DEMO1234",
        status: "active",
    });
    console.log(`   ✅ Template: ${template.title}`);
    console.log(`   🔗 Join URL: http://localhost:3001/interview/join/DEMO1234`);

    // ── 3. Create Candidates + Interviews + Reports ───────────────────────────
    console.log("\n👥 Creating candidates, interviews and reports...");

    for (let i = 0; i < CANDIDATES.length; i++) {
        const c = CANDIDATES[i];

        // User
        const user = await User.create({
            name: c.name,
            email: c.email,
            password: await bcrypt.hash("candidate123", 12),
            userType: c.userType,
            college: c.college || "",
            company: c.company || "",
            branch: c.branch || "",
            year: c.year || "",
            experienceLevel: c.experienceLevel,
            yearsOfExperience: c.yearsOfExperience || 0,
            targetRole: "Software Development Engineer",
            skills: c.skills,
            isActive: true,
        });

        const timeSecs = c.timeMin * 60;
        const completedAt = new Date(Date.now() - (CANDIDATES.length - i) * 3 * 60 * 60 * 1000);
        const startedAt = new Date(completedAt.getTime() - timeSecs * 1000);

        const interviewQuestions = QUESTIONS.map((q, qi) => {
            const rawScore = c.techScore - qi * 0.1 + (Math.random() - 0.5) * 1.5;
            const qScore = parseFloat(Math.max(1, Math.min(10, rawScore)).toFixed(1));
            const isCode = q.questionType === "code";
            const answer = {
                type: "main",
                answer: `Candidate provided a ${c.score > 7 ? "detailed and accurate" : "basic"} explanation of ${q.topic}. ${c.score > 8 ? "Demonstrated deep understanding." : ""}`,
                timestamp: new Date(startedAt.getTime() + qi * Math.floor(timeSecs / QUESTIONS.length) * 1000),
            };
            if (isCode) {
                answer.code = `// ${c.name}'s solution\nfunction detectCycle(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n    if (slow === fast) return true;\n  }\n  return false;\n}`;
            }
            return {
                questionId: q.questionId,
                question: q.question,
                questionType: q.questionType,
                difficulty: q.difficulty,
                topic: q.topic,
                expectedAnswer: q.expectedAnswer,
                status: "completed",
                score: qScore,
                feedback: `${qi % 2 === 0 ? "Good answer. Could elaborate more on edge cases." : "Well-structured response."}`,
                idealAnswer: q.expectedAnswer,
                timeTaken: Math.round(timeSecs / QUESTIONS.length) + Math.round((Math.random() - 0.5) * 30),
                followupCount: Math.random() > 0.6 ? 1 : 0,
                answers: [answer],
                strengths: c.score > 7 ? ["Clear explanation", "Correct approach"] : ["Attempted correctly"],
                weaknesses: c.score < 8 ? ["Could be more detailed"] : [],
            };
        });

        // Violations
        const violations = [];
        for (let v = 0; v < c.violations; v++) {
            violations.push({
                type: ["tab_switch", "focus_lost", "no_face"][v % 3],
                timestamp: new Date(startedAt.getTime() + (v + 1) * 5 * 60 * 1000),
                details: "Detected during interview",
            });
        }

        // Interview
        const interview = await Interview.create({
            userId: user._id,
            templateId: template._id,
            organizationId: org._id,
            attemptNumber: 1,
            role: template.role,
            experienceLevel: c.experienceLevel,
            techStack: template.techStack,
            questions: interviewQuestions,
            totalQuestions: QUESTIONS.length,
            interviewType: "mixed",
            difficulty: "adaptive",
            targetDuration: 45,
            status: "completed",
            startedAt,
            completedAt,
            totalTimeTaken: timeSecs,
            autoSubmitted: false,
            violationCount: c.violations,
            violations,
            transcript: [
                { role: "ai", content: `Welcome, ${c.name}! Let's start with our first question.`, timestamp: startedAt },
                { role: "user", content: "Thank you! I'm ready.", timestamp: new Date(startedAt.getTime() + 5000) },
                ...interviewQuestions.flatMap((q, qi) => [
                    { role: "ai", content: q.question, timestamp: new Date(startedAt.getTime() + qi * Math.floor(timeSecs / QUESTIONS.length) * 1000 + 10000) },
                    { role: "user", content: q.answers[0].answer, timestamp: new Date(startedAt.getTime() + qi * Math.floor(timeSecs / QUESTIONS.length) * 1000 + 30000) },
                ]),
            ],
        });

        await User.findByIdAndUpdate(user._id, { $push: { interviews: interview._id } });

        // Report
        await Report.create({
            interviewId: interview._id,
            userId: user._id,
            templateId: template._id,
            organizationId: org._id,

            role: template.role,
            experienceLevel: c.experienceLevel,
            techStack: template.techStack,
            interviewType: "mixed",
            difficulty: "adaptive",

            overallScore: c.score,
            technicalScore: c.techScore,
            communicationScore: c.commScore,
            problemSolvingScore: c.psScore,
            hrScore: c.commScore - 0.3,
            codeQualityScore: c.questionType === "code" ? c.techScore - 0.5 : null,

            strengths: c.tags.filter((t) => !t.toLowerCase().includes("needs") && !t.toLowerCase().includes("improve")),
            weaknesses: c.tags.filter((t) => t.toLowerCase().includes("needs") || t.toLowerCase().includes("improve")),

            overallFeedback: `${c.name} demonstrated ${c.score >= 8.5 ? "exceptional" : c.score >= 7 ? "strong" : "adequate"} performance during the interview. ${c.score >= 8 ? "Highly recommended for next rounds." : c.score >= 6.5 ? "Shows potential with some areas to improve." : "Needs significant improvement before proceeding."}`,
            recommendation: c.recommendation,
            improvementAreas: c.score < 8 ? ["System design depth", "DSA pattern recognition"] : [],
            topicsToStudy: c.score < 7.5 ? ["Dynamic Programming", "Distributed Systems", "SOLID principles"] : [],

            questionBreakdown: interviewQuestions.map((q) => ({
                questionId: q.questionId,
                question: q.question,
                questionType: q.questionType,
                difficulty: q.difficulty,
                score: parseFloat(q.score.toFixed(1)),
                feedback: q.feedback,
                idealAnswer: q.idealAnswer,
                userAnswer: q.answers[0].answer,
                userCode: q.answers[0].code,
                timeTaken: q.timeTaken,
                followupCount: q.followupCount,
                strengths: q.strengths,
                weaknesses: q.weaknesses,
            })),

            totalTimeTaken: timeSecs,
            averageTimePerQuestion: Math.round(timeSecs / QUESTIONS.length),

            violationCount: c.violations,
            autoSubmitted: false,
            transcriptText: `Interview transcript for ${c.name}`,

            // Org-specific fields
            candidateTags: c.tags,
            badge: c.badge,
            strengthSummary: c.tags.filter((t) => !t.toLowerCase().includes("needs"))[0] || "Solid overall performance.",
            weaknessSummary: c.tags.filter((t) => t.toLowerCase().includes("needs"))[0] || "No major weaknesses noted.",
            candidateStatus: c.candidateStatus,
        });

        console.log(`   ✅ [${i + 1}/5] ${c.name} — Score: ${c.score} ${c.badge ? `| 🏅 ${c.badge}` : ""}`);
    }

    // ── 4. Update template stats ──────────────────────────────────────────────
    await InterviewTemplate.findByIdAndUpdate(template._id, {
        "stats.totalAttempts": 5,
        "stats.completedAttempts": 5,
        "stats.avgScore": parseFloat((CANDIDATES.reduce((a, c) => a + c.score, 0) / CANDIDATES.length).toFixed(1)),
        "stats.highestScore": Math.max(...CANDIDATES.map((c) => c.score)),
        "stats.completionRate": 100,
    });

    // ── 5. Create Mock Schedule Slots ─────────────────────────────────────────
    console.log("\n📅 Creating mock schedule slots...");
    const slots = [];
    const now = new Date();
    // Generate 5 slots for the future
    for (let i = 1; i <= 5; i++) {
        const slotTime = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        slotTime.setHours(10, 0, 0, 0); // 10:00 AM
        slots.push({
            organizationId: org._id,
            templateId: template._id,
            startTime: slotTime,
            endTime: new Date(slotTime.getTime() + 45 * 60000),
            duration: 45,
            isBooked: i % 2 === 0, // Half booked
        });
    }
    await ScheduleSlot.insertMany(slots);
    console.log("   ✅ Created 5 schedule slots");

    console.log("\n" + "─".repeat(55));
    console.log("🎉 Seed complete!\n");
    console.log("📌 ORG LOGIN");
    console.log("   URL:      http://localhost:3001/org/login");
    console.log("   Email:    org@demo.com");
    console.log("   Password: demo1234\n");
    console.log("📌 LEADERBOARD (after login)");
    console.log(`   /org/interview/${template._id}/leaderboard\n`);
    console.log("📌 PUBLIC JOIN LINK");
    console.log("   http://localhost:3001/interview/join/DEMO1234\n");
    console.log("📌 CANDIDATE LOGINS (password: candidate123)");
    CANDIDATES.forEach((c) => console.log(`   ${c.email}`));
    console.log("─".repeat(55));

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    mongoose.disconnect();
    process.exit(1);
});
