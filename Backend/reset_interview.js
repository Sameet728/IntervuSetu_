require('dotenv').config();
const mongoose = require('mongoose');
const Interview = require('./src/models/Interview');

const interviewId = '69ccffacf8b2b1b37a295c20';

async function resetInterview() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      console.log('Interview not found');
      return;
    }

    interview.status = 'created';
    interview.startedAt = undefined;
    interview.completedAt = undefined;
    interview.totalTimeTaken = 0;
    interview.currentQuestionIndex = 0;
    interview.transcript = [];
    interview.shortTermMemory = [];
    interview.longTermSummary = '';
    interview.violations = [];
    interview.violationCount = 0;
    interview.autoSubmitted = false;
    interview.skipUsed = false;
    interview.skippedQuestions = [];
    interview.reportId = undefined;

    interview.questions.forEach(q => {
      q.status = 'pending';
      q.startedAt = undefined;
      q.completedAt = undefined;
      q.timeTaken = 0;
      q.score = undefined;
      q.feedback = '';
      q.idealAnswer = '';
      q.strengths = [];
      q.weaknesses = [];
      q.answers = [];
      q.followupCount = 0;
    });

    await interview.save();
    console.log('Interview successfully reset!');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

resetInterview();
