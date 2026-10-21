// In-Memory Database Engine for Zero-Database / Standalone Mode
// Allows the entire platform to function seamlessly without a running MongoDB daemon.

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "../../.in_memory_db.json");

const stores = {
  Interview: new Map(),
  User: new Map(),
  Report: new Map(),
  InterviewTemplate: new Map(),
  Organization: new Map(),
  AptitudeAttempt: new Map(),
  AptitudeQuestion: new Map(),
  AptitudeTest: new Map(),
  ScheduleSlot: new Map(),
};

// Seed default demo user
const DEFAULT_USER_ID = "660000000000000000000001";
stores.User.set(DEFAULT_USER_ID, {
  _id: DEFAULT_USER_ID,
  id: DEFAULT_USER_ID,
  name: "Demo Candidate",
  email: "candidate@intervusetu.ai",
  role: "candidate",
  plan: "pro",
  interviewsCount: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const SAMPLE_INTERVIEW_ID = "6ad7c1ab00000b31f9c4ea50";
const SAMPLE_REPORT_ID = "6ad7c8d60044fad8356faaa8";

function ensureSampleData() {
  if (stores.Interview.size === 0) {
    const sampleInterview = {
      _id: SAMPLE_INTERVIEW_ID,
      id: SAMPLE_INTERVIEW_ID,
      userId: DEFAULT_USER_ID,
      role: "Full Stack Engineer",
      experienceLevel: "mid",
      techStack: ["React", "Node.js", "Express", "MongoDB"],
      interviewType: "mixed",
      difficulty: "medium",
      totalQuestions: 5,
      status: "completed",
      totalTimeTaken: 520,
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3080000),
      skipUsed: false,
      violationCount: 1,
      violations: [{ type: "no_face", details: "Brief gaze shift" }],
      reportId: SAMPLE_REPORT_ID,
      questions: [
        {
          questionId: "q_intro",
          question: "Hey Demo! Welcome, welcome. I always like to start these conversations naturally rather than jumping straight into questions. So tell me — in your own words, who are you and what brings you here today?",
          questionType: "hr",
          difficulty: "easy",
          topic: "Self Introduction",
          status: "completed",
          score: 9.0,
          feedback: "Warm and authentic introduction covering relevant background and passion for engineering.",
          timeTaken: 65,
          answers: [{
            type: "main",
            answer: "Computer Science and data science student at MIT Academy of veterinary community. I'm passionate about software development about solving an AI. I've built projects using node.js express.js and mongodb. I'm here to Showcase my skills learn from this opportunity and work as a developer.",
            score: 9.0
          }]
        },
        {
          questionId: "q4",
          question: "What is the N+1 query problem and how does it specifically manifest when using MongoDB with Mongoose? How do you detect it and fix it using aggregation pipelines or populate?",
          questionType: "theory",
          difficulty: "medium",
          topic: "Database Optimization",
          status: "completed",
          score: 8.5,
          feedback: "Solid explanation of the N+1 query pattern in Document databases and effective mitigation via aggregation pipelines.",
          timeTaken: 110,
          answers: [{
            type: "main",
            answer: "The N+1 query issue occurs when querying parent records followed by individual queries for each associated child document. In Mongoose, we resolve this using aggregation $lookup pipelines with proper indexing.",
            score: 8.5
          }]
        },
        {
          questionId: "q2",
          question: "Design a secure authentication system for a React SPA backed by a Node.js REST API. Cover JWT access tokens, refresh token rotation, HttpOnly cookies, and how to prevent CSRF and XSS attacks end-to-end.",
          questionType: "system_design",
          difficulty: "medium",
          topic: "Auth & Security Architecture",
          status: "completed",
          score: 7.5,
          feedback: "Good security fundamentals on refresh token rotation and HttpOnly cookie protection.",
          timeTaken: 125,
          answers: [{
            type: "main",
            answer: "We store access tokens in memory to prevent XSS and long-lived refresh tokens in HttpOnly SameSite=Strict cookies. Automatic rotation invalidates reused tokens upon refresh.",
            score: 7.5
          }]
        },
        {
          questionId: "q1",
          question: "Explain JavaScript's event loop, call stack, microtask queue, and macrotask queue. What is the execution order when you have Promise.resolve().then(), setTimeout(fn, 0), and process.nextTick() all scheduled at the same time?",
          questionType: "theory",
          difficulty: "medium",
          topic: "JavaScript Engine Internals",
          status: "completed",
          score: 7.5,
          feedback: "Good grasp of microtasks vs macrotask execution order in V8 runtime.",
          timeTaken: 110,
          answers: [{
            type: "main",
            answer: "process.nextTick takes priority before microtask queue resolution, followed by Promise then-callbacks, and macrotasks like setTimeout(0) execute in subsequent turns of the event loop.",
            score: 7.5
          }]
        },
        {
          questionId: "q3",
          question: "Implement a debounce(fn, wait, options) function in JavaScript that supports both leading-edge and trailing-edge execution, and includes a .cancel() method to abort any pending invocation.",
          questionType: "code",
          difficulty: "medium",
          topic: "JavaScript Core — Closures & Timers",
          status: "completed",
          score: 9.5,
          feedback: "Outstanding implementation of debounce with cancellation and leading/trailing execution control.",
          timeTaken: 110,
          answers: [{
            type: "main",
            answer: "Closure wraps timerId and tracks leading invocation state, resetting on delay completion with a dedicated cancel() method.",
            score: 9.5
          }]
        }
      ]
    };

    const sampleReport = {
      _id: SAMPLE_REPORT_ID,
      id: SAMPLE_REPORT_ID,
      interviewId: SAMPLE_INTERVIEW_ID,
      userId: DEFAULT_USER_ID,
      role: "Full Stack Engineer",
      experienceLevel: "mid",
      techStack: ["React", "Node.js", "Express", "MongoDB"],
      interviewType: "mixed",
      difficulty: "medium",
      overallScore: 8.4,
      communicationScore: 8.1,
      technicalScore: 8.6,
      problemSolvingScore: 8.4,
      hrScore: 8.4,
      codeQualityScore: 7.5,
      strengths: [
        "The candidate demonstrated strong technical skills in React, Node.js, Express, and MongoDB.",
        "They showed proficiency in coding and problem-solving, which is essential for a Full Stack Engineer role.",
        "They were able to effectively communicate their skills and knowledge to the interviewer."
      ],
      weaknesses: [
        "The candidate's average interview score across turns is 8.4/10, indicating a good performance but not exceptional.",
        "There are areas where the candidate could benefit from more practice and exposure to different technologies and frameworks."
      ],
      overallFeedback: "The candidate demonstrated solid conceptual familiarity with React, Node.js, Express, MongoDB for the Full Stack Engineer position. Responses reflected practical intuition, with opportunities to be even more structured on distributed system edge cases.",
      recommendation: "strong_hire",
      improvementAreas: [
        "Continue practicing production-grade architectural trade-offs in React, Node.js, Express, MongoDB.",
        "Structure answers with the STAR or Problem-Solution-Result framework."
      ],
      topicsToStudy: [
        "Core Web Vitals & Runtime Performance",
        "Distributed Caching & Concurrency Control",
        "Event-Driven Architecture",
        "Observability & Production Resiliency"
      ],
      questionBreakdown: sampleInterview.questions.map(q => ({
        questionId: q.questionId,
        question: q.question,
        questionType: q.questionType,
        difficulty: q.difficulty,
        score: q.score,
        status: q.status,
        feedback: q.feedback,
        userAnswer: q.answers[0]?.answer || "",
        userCode: null,
        timeTaken: q.timeTaken,
        followupCount: 0,
        strengths: [],
        weaknesses: []
      })),
      totalTimeTaken: 520,
      averageTimePerQuestion: 104,
      violationCount: 1,
      autoSubmitted: false,
      transcriptText: "",
      createdAt: new Date(Date.now() - 3080000),
      updatedAt: new Date(Date.now() - 3080000),
    };

    stores.Interview.set(SAMPLE_INTERVIEW_ID, sampleInterview);
    stores.Report.set(SAMPLE_REPORT_ID, sampleReport);

    const user = stores.User.get(DEFAULT_USER_ID);
    if (user) {
      user.interviews = [SAMPLE_INTERVIEW_ID];
      user.interviewsCount = 1;
    }

    saveToDisk();
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      for (const [storeName, items] of Object.entries(raw)) {
        if (stores[storeName] && Array.isArray(items)) {
          for (const item of items) {
            stores[storeName].set(item._id || item.id, item);
          }
        }
      }
      console.log(`💾 Loaded database snapshot from ${DB_FILE}`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to load database snapshot from disk:", err.message);
  }
  ensureSampleData();
}

// Load initially from disk
loadFromDisk();

let saveTimer = null;
function saveToDisk() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const serializable = {};
      for (const [storeName, map] of Object.entries(stores)) {
        serializable[storeName] = Array.from(map.values());
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(serializable, null, 2), "utf8");
    } catch (err) {
      console.warn("⚠️ Failed to save database snapshot:", err.message);
    }
  }, 300);
}

function generateId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const random = Math.floor(Math.random() * 0xffffffffffffff).toString(16).padStart(16, "0");
  return timestamp + random;
}

// Clone deeply to emulate DB separation
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(deepClone);
  const copy = {};
  for (const key of Object.keys(obj)) {
    copy[key] = deepClone(obj[key]);
  }
  return copy;
}

function matchesFilter(item, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, val] of Object.entries(filter)) {
    if (key === "$or" && Array.isArray(val)) {
      if (!val.some((sub) => matchesFilter(item, sub))) return false;
      continue;
    }
    if (key === "$and" && Array.isArray(val)) {
      if (!val.every((sub) => matchesFilter(item, sub))) return false;
      continue;
    }

    const itemVal = item[key];
    const itemValStr = itemVal ? itemVal.toString() : "";
    const targetValStr = val ? val.toString() : "";

    if (val && typeof val === "object" && !(val instanceof Date)) {
      if ("$in" in val && Array.isArray(val.$in)) {
        const inVals = val.$in.map((v) => (v ? v.toString() : ""));
        if (!inVals.includes(itemValStr)) return false;
        continue;
      }
      if ("$ne" in val) {
        if (itemValStr === (val.$ne ? val.$ne.toString() : "")) return false;
        continue;
      }
      if ("$exists" in val) {
        const exists = item[key] !== undefined;
        if (exists !== Boolean(val.$exists)) return false;
        continue;
      }
    }

    if (itemValStr !== targetValStr && itemVal !== val) {
      return false;
    }
  }
  return true;
}

function applyUpdate(doc, update = {}) {
  if (update.$set) {
    Object.assign(doc, deepClone(update.$set));
  }
  if (update.$push) {
    for (const [key, val] of Object.entries(update.$push)) {
      if (!Array.isArray(doc[key])) doc[key] = [];
      doc[key].push(deepClone(val));
    }
  }
  if (update.$inc) {
    for (const [key, val] of Object.entries(update.$inc)) {
      doc[key] = (doc[key] || 0) + val;
    }
  }

  // Direct properties
  for (const [key, val] of Object.entries(update)) {
    if (!key.startsWith("$")) {
      doc[key] = deepClone(val);
    }
  }
  doc.updatedAt = new Date();
  return doc;
}

function wrapDocument(modelName, raw) {
  if (!raw) return null;
  const store = stores[modelName] || new Map();
  const doc = deepClone(raw);

  // Attach document helpers
  doc.save = async function () {
    this.updatedAt = new Date();
    store.set(this._id.toString(), deepClone(this));
    saveToDisk();
    return this;
  };
  doc.toObject = function () {
    return deepClone(this);
  };
  doc.toString = function () {
    return this._id.toString();
  };

  return doc;
}

// Chainable mock Mongoose Query
function createQuery(modelName, resolver) {
  let isLean = false;
  let selectFields = null;

  const queryObj = {
    select: function (fields) {
      selectFields = fields;
      return queryObj;
    },
    lean: function () {
      isLean = true;
      return queryObj;
    },
    sort: function () {
      return queryObj;
    },
    limit: function () {
      return queryObj;
    },
    skip: function () {
      return queryObj;
    },
    populate: function () {
      return queryObj;
    },
    exec: async function () {
      const res = await resolver();
      if (!res) return null;
      if (Array.isArray(res)) {
        return res.map((r) => (isLean ? r.toObject() : r));
      }
      return isLean ? res.toObject() : res;
    },
    then: function (onResolve, onReject) {
      return queryObj.exec().then(onResolve, onReject);
    },
    catch: function (onReject) {
      return queryObj.exec().catch(onReject);
    },
  };

  return queryObj;
}

function patchMongooseModel(model, modelName) {
  if (!stores[modelName]) stores[modelName] = new Map();
  const store = stores[modelName];

  // Intercept Model.create
  model.create = async function (data) {
    const items = Array.isArray(data) ? data : [data];
    const created = items.map((item) => {
      const id = item._id ? item._id.toString() : generateId();
      const docData = {
        ...deepClone(item),
        _id: id,
        id: id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (modelName === "Interview") {
        if (!docData.transcript) docData.transcript = [];
        if (!docData.violations) docData.violations = [];
        if (!docData.shortTermMemory) docData.shortTermMemory = [];
        if (!docData.longTermSummary) docData.longTermSummary = "";
        if (!docData.skippedQuestions) docData.skippedQuestions = [];
        if (docData.skipUsed === undefined) docData.skipUsed = false;
        if (docData.currentQuestionIndex === undefined) docData.currentQuestionIndex = 0;
        if (Array.isArray(docData.questions)) {
          docData.questions = docData.questions.map((q) => ({
            answers: [],
            status: "pending",
            followupCount: 0,
            ...q,
          }));
        }
      }

      const wrapped = wrapDocument(modelName, docData);
      store.set(id, deepClone(wrapped));
      saveToDisk();
      return wrapped;
    });
    return Array.isArray(data) ? created : created[0];
  };

  // Intercept Model.findById
  model.findById = function (id) {
    return createQuery(modelName, async () => {
      if (!id) return null;
      const raw = store.get(id.toString());
      return raw ? wrapDocument(modelName, raw) : null;
    });
  };

  // Intercept Model.findOne
  model.findOne = function (filter) {
    return createQuery(modelName, async () => {
      for (const item of store.values()) {
        if (matchesFilter(item, filter)) {
          return wrapDocument(modelName, item);
        }
      }
      return null;
    });
  };

  // Intercept Model.find
  model.find = function (filter = {}) {
    return createQuery(modelName, async () => {
      const matches = [];
      for (const item of store.values()) {
        if (matchesFilter(item, filter)) {
          matches.push(wrapDocument(modelName, item));
        }
      }
      return matches;
    });
  };

  // Intercept Model.findByIdAndUpdate
  model.findByIdAndUpdate = async function (id, update, options = {}) {
    if (!id) return null;
    let raw = store.get(id.toString());
    if (!raw && options.upsert) {
      raw = { _id: id.toString(), id: id.toString() };
    }
    if (!raw) return null;

    applyUpdate(raw, update);
    store.set(id.toString(), deepClone(raw));
    saveToDisk();
    return wrapDocument(modelName, raw);
  };

  // Intercept Model.findOneAndUpdate
  model.findOneAndUpdate = async function (filter, update, options = {}) {
    let target = null;
    for (const item of store.values()) {
      if (matchesFilter(item, filter)) {
        target = item;
        break;
      }
    }
    if (!target && options.upsert) {
      const id = generateId();
      target = { ...deepClone(filter), _id: id, id: id };
    }
    if (!target) return null;

    applyUpdate(target, update);
    store.set(target._id.toString(), deepClone(target));
    saveToDisk();
    return wrapDocument(modelName, target);
  };

  // Intercept Model.countDocuments
  model.countDocuments = async function (filter = {}) {
    let count = 0;
    for (const item of store.values()) {
      if (matchesFilter(item, filter)) count++;
    }
    return count;
  };

  // Intercept Model.deleteOne / deleteMany
  model.deleteOne = async function (filter = {}) {
    for (const [id, item] of store.entries()) {
      if (matchesFilter(item, filter)) {
        store.delete(id);
        saveToDisk();
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  };

  model.deleteMany = async function (filter = {}) {
    let deletedCount = 0;
    for (const [id, item] of store.entries()) {
      if (matchesFilter(item, filter)) {
        store.delete(id);
        deletedCount++;
      }
    }
    if (deletedCount > 0) saveToDisk();
    return { deletedCount };
  };
}

module.exports = {
  stores,
  patchMongooseModel,
  DEFAULT_USER_ID,
};
