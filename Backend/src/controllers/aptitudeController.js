const AptitudeQuestion = require("../models/AptitudeQuestion");
const AptitudeTest = require("../models/AptitudeTest");
const AptitudeAttempt = require("../models/AptitudeAttempt");
const User = require("../models/User");
const { generatePDFBuffer } = require("../services/pdfService");

// Helper to shuffle array
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const checkAvailability = async (req, res, next) => {
  try {
    const { categories, companies, topics } = req.body;
    const targetCategories = categories?.length ? categories : ["numerical", "verbal", "logical", "situational"];
    
    // Base match
    const match = { category: { $in: targetCategories } };
    if (companies && companies.length > 0) match.companies = { $in: companies };
    if (topics && topics.length > 0) match.tags = { $in: topics };

    const stats = await AptitudeQuestion.aggregate([
      { $match: match },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } }
    ]);
    
    const available = { easy: 0, medium: 0, hard: 0, total: 0 };
    stats.forEach(s => {
      if (available[s._id] !== undefined) {
          available[s._id] = s.count;
          available.total += s.count;
      }
    });

    res.json({ success: true, data: available });
  } catch(err) {
    next(err);
  }
};

// Start an AMCAT-style aptitude test
const startRandomTest = async (req, res, next) => {
  try {
    // Org-test mode: if shareCode passed, load config from AptitudeTest
    let orgTest = null;
    if (req.body.shareCode) {
      orgTest = await AptitudeTest.findOne({ shareCode: req.body.shareCode, status: 'active' });
      if (!orgTest) return res.status(404).json({ success: false, message: "Test not found or closed" });
      if (orgTest.deadline && new Date(orgTest.deadline) < new Date()) {
        return res.status(410).json({ success: false, message: "Test deadline has passed" });
      }
      // Check max attempts
      if (orgTest.maxAttempts) {
        const existingAttempts = await AptitudeAttempt.countDocuments({
          testId: orgTest._id,
          userId: req.user.id,
          status: { $in: ['completed', 'auto_submitted'] }
        });
        if (existingAttempts >= orgTest.maxAttempts) {
          return res.status(400).json({ success: false, message: `Maximum attempts (${orgTest.maxAttempts}) reached for this test` });
        }
      }
    }

    const { questionCount: reqQCount = 20, difficultyLevel = 'standard', fallbackStrategy = 'mixed', companies, topics, categories } = orgTest
      ? { questionCount: orgTest.questionCount, difficultyLevel: 'standard', fallbackStrategy: 'mixed', companies: undefined, topics: undefined, categories: orgTest.categories }
      : req.body;

    // Define target categories
    const targetCategories = categories && categories.length > 0 
      ? categories 
      : ["numerical", "verbal", "logical", "situational"];
    const catsCount = targetCategories.length;
    const questionCount = orgTest ? (orgTest.questionCount || reqQCount) : (reqQCount || 20);
    const qsPerSec = Math.floor(questionCount / catsCount) || 1;
    const timeLimitTotal = orgTest ? orgTest.duration * 60 : Math.floor(questionCount * 1.3 * 60);
    const timePerSec = Math.floor(timeLimitTotal / catsCount) || 60;

    const sections = [];
    
    for (const cat of targetCategories) {
      // Difficulty targets
      let tE = 0, tM = 0, tH = 0;
      if (difficultyLevel === 'beginner') { tE = Math.ceil(qsPerSec * 0.7); tM = qsPerSec - tE; }
      else if (difficultyLevel === 'standard') { tE = Math.ceil(qsPerSec * 0.2); tM = Math.ceil(qsPerSec * 0.7); tH = qsPerSec - tE - tM; }
      else if (difficultyLevel === 'advanced') { tM = Math.ceil(qsPerSec * 0.4); tH = qsPerSec - tM; }
      else if (difficultyLevel === 'easy') { tE = qsPerSec; }
      else if (difficultyLevel === 'medium') { tM = qsPerSec; }
      else if (difficultyLevel === 'hard') { tH = qsPerSec; }
      else { tE = Math.ceil(qsPerSec * 0.3); tM = Math.ceil(qsPerSec * 0.4); tH = qsPerSec - tE - tM; }

      const fetchQs = async (match, fetchE, fetchM, fetchH) => {
        const fetchLevel = async (level, size) => size > 0 ? await AptitudeQuestion.aggregate([{ $match: { ...match, difficulty: level } }, { $sample: { size } }]) : [];
        const [e, m, h] = await Promise.all([ fetchLevel('easy', fetchE), fetchLevel('medium', fetchM), fetchLevel('hard', fetchH) ]);
        return [...e, ...m, ...h];
      };

      const dFilter = { category: cat };
      if (companies && companies.length > 0) dFilter.companies = { $in: companies };
      if (topics && topics.length > 0) dFilter.tags = { $in: topics };
      
      let finalQuestions = await fetchQs(dFilter, tE, tM, tH);

      if (finalQuestions.length < qsPerSec && fallbackStrategy === 'mixed') {
         let deficit = qsPerSec - finalQuestions.length;
         const nextFilter = { ...dFilter, _id: { $nin: finalQuestions.map(q => q._id) } };
         
         const remainStats = await AptitudeQuestion.aggregate([
           { $match: nextFilter },
           { $group: { _id: "$difficulty", count: { $sum: 1 } } }
         ]);
         let avail = { easy: 0, medium: 0, hard: 0 };
         remainStats.forEach(s => { if (avail[s._id] !== undefined) avail[s._id] = s.count; });

         let padE = 0, padM = 0, padH = 0;
         
         // Priority fallback logic
         let order = ['medium', 'hard', 'easy'];
         if (difficultyLevel === 'advanced' || difficultyLevel === 'hard') order = ['hard', 'medium', 'easy'];
         if (difficultyLevel === 'beginner' || difficultyLevel === 'easy') order = ['easy', 'medium', 'hard'];

         for (let level of order) {
            if (avail[level] > 0) {
               let take = Math.min(avail[level], deficit);
               if (level === 'easy') padE = take;
               if (level === 'medium') padM = take;
               if (level === 'hard') padH = take;
               deficit -= take;
            }
            if (deficit <= 0) break;
         }

         const padQs = await fetchQs(nextFilter, padE, padM, padH);
         finalQuestions = [...finalQuestions, ...padQs];
      }

      // Final shuffle after merging buckets
      finalQuestions = shuffle(finalQuestions);
      
      if (finalQuestions && finalQuestions.length > 0) {
        let actE = 0, actM = 0, actH = 0;
        const sanitized = finalQuestions.map(q => {
          if (q.difficulty === 'easy') actE++;
          if (q.difficulty === 'medium') actM++;
          if (q.difficulty === 'hard') actH++;
          return {
            _id: q._id,
            question: q.question,
            options: shuffle([...q.options]).map(opt => ({ _id: opt._id, text: opt.text })),
            category: q.category,
            difficulty: q.difficulty,
            companies: q.companies || []
          };
        });
        
        sections.push({
          id: cat + "_" + Date.now(),
          title: cat.charAt(0).toUpperCase() + cat.slice(1) + " Reasoning",
          category: cat,
          timeLimit: timePerSec,
          questions: sanitized,
          stats: { easy: actE, medium: actM, hard: actH }
        });
      }
    }

    if (sections.length === 0) {
      return res.status(404).json({ success: false, message: "No questions available in the database matching your criteria." });
    }

    const attempt = await AptitudeAttempt.create({
      userId: req.user.id,
      testId: orgTest ? orgTest._id : undefined,
      status: "started",
    });

    res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        duration: Math.ceil(timeLimitTotal / 60),
        proctoringEnabled: orgTest ? orgTest.proctoringEnabled : true,
        sections,
      }
    });

  } catch (error) {
    next(error);
  }
};

// Submit an attempt
const submitAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { answers, violations } = req.body;

    const attempt = await AptitudeAttempt.findById(attemptId);
    if (!attempt || attempt.status !== "started") {
      return res.status(400).json({ success: false, message: "Invalid or already submitted attempt." });
    }

    // Load actual questions to verify answers
    let totalScore = 0;
    const categories = {
      numerical: { score: 0, total: 0 },
      verbal: { score: 0, total: 0 },
      logical: { score: 0, total: 0 },
      situational: { score: 0, total: 0 },
    };

    const evaluatedAnswers = [];

    for (let ans of answers) {
      const q = await AptitudeQuestion.findById(ans.questionId);
      if (q) {
        // Find if selected option is correct
        const isCorrect = q.options.find(o => o._id.toString() === ans.selectedOptionId)?.isCorrect || false;
        
        if (isCorrect) totalScore += 1;
        
        if (categories[q.category]) {
          categories[q.category].total += 1;
          if (isCorrect) categories[q.category].score += 1;
        }

        evaluatedAnswers.push({
          questionId: q._id,
          selectedOptionId: ans.selectedOptionId,
          isCorrect,
          timeTaken: ans.timeTaken || 0
        });
      }
    }

    const accuracy = answers.length > 0 ? (totalScore / answers.length) * 100 : 0;

    attempt.answers = evaluatedAnswers;
    attempt.totalScore = totalScore;
    attempt.accuracy = accuracy;
    attempt.categoryScores = categories;
    attempt.status = "completed";
    attempt.completedAt = new Date();
    if (violations) attempt.violations = violations;

    await attempt.save();

    res.json({
      success: true,
      data: attempt
    });
  } catch (error) {
    next(error);
  }
};

const getReport = async (req, res, next) => {
  try {
    const attempt = await AptitudeAttempt.findById(req.params.attemptId).populate("answers.questionId");
    if (!attempt) return res.status(404).json({ success: false, message: "Report not found" });

    // Ensure user owns it
    if (attempt.userId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await AptitudeAttempt.find({ 
      userId: req.user.id, 
      status: { $in: ["completed", "auto_submitted"] } 
    }).sort({ completedAt: -1 }).select("totalScore accuracy completedAt answers");
    
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

const getCompanies = async (req, res, next) => {
  try {
    const companies = await AptitudeQuestion.distinct("companies");
    res.json({ success: true, data: companies.filter(Boolean) });
  } catch (error) {
    next(error);
  }
};

const getTopics = async (req, res, next) => {
  try {
    const topics = await AptitudeQuestion.distinct("tags");
    res.json({ success: true, data: topics.filter(Boolean) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/aptitude/:attemptId/pdf
 * Download Aptitude Report as PDF
 */
const downloadAptitudePDF = async (req, res, next) => {
  try {
    const test = await AptitudeAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user.id
    }).populate("answers.questionId");

    if (!test || test.status !== "completed") {
      return res.status(404).json({ success: false, message: "Test report not ready or not found" });
    }

    const user = await User.findById(req.user.id).lean();

    // Map properties for PDF template compatibility
    let report = test.toObject();
    report.role = "Aptitude Assessment";

    // Generate Puppeteer PDF Buffer
    const pdfBuffer = await generatePDFBuffer(report, user, true);

    const safeName = report.testMode?.replace(/\s+/g, "_") || "Assessment";
    const filename = `IntervuSetu_Aptitude_${safeName}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { startRandomTest, submitAttempt, getReport, getHistory, getCompanies, getTopics, checkAvailability, downloadAptitudePDF };
