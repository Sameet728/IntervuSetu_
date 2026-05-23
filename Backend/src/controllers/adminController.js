const AptitudeQuestion = require("../models/AptitudeQuestion");

const addQuestion = async (req, res, next) => {
  try {
    const { question, options, category, difficulty, tags, companies, detailedSolution } = req.body;
    
    // validate
    if (!question || !options || options.length < 2 || !category || !difficulty) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const newQ = await AptitudeQuestion.create({
      question,
      options,
      category,
      difficulty,
      detailedSolution,
      tags: tags || [],
      companies: companies || [],
      createdByAdmin: req.user.id
    });

    res.status(201).json({ success: true, data: newQ });
  } catch (error) {
    next(error);
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const questions = await AptitudeQuestion.find().sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const q = await AptitudeQuestion.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const bulkUpload = async (req, res, next) => {
  try {
    const { questions } = req.body; // Expecting an array of question objects
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid JSON format: expected an array of questions" });
    }

    const docs = questions.map(q => ({
      question: q.question,
      options: q.options,
      category: q.category,
      difficulty: q.difficulty,
      detailedSolution: q.detailedSolution,
      tags: q.tags || [],
      companies: q.companies || [],
      createdByAdmin: req.user.id
    }));

    const result = await AptitudeQuestion.insertMany(docs);
    res.status(201).json({ success: true, message: `Inserted ${result.length} questions` });
  } catch (error) {
    next(error);
  }
};

module.exports = { addQuestion, getQuestions, deleteQuestion, bulkUpload };
