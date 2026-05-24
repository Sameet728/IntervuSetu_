require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./src/models/Organization');
const User = require('./src/models/User');
const AptitudeTest = require('./src/models/AptitudeTest');
const AptitudeQuestion = require('./src/models/AptitudeQuestion');
const AptitudeAttempt = require('./src/models/AptitudeAttempt');
const InterviewTemplate = require('./src/models/InterviewTemplate');
const Interview = require('./src/models/Interview');
const Report = require('./src/models/Report');

const REALISTIC_USERS = [
  { name: 'Rahul Sharma', email: 'rahul.s@example.com' },
  { name: 'Priya Singh', email: 'priya.singh@example.com' },
  { name: 'Aman Verma', email: 'aman.verma@example.com' }
];

async function seedCleanData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const orgEmail = '202401120004@mitaoe.ac.in';
    const org = await Organization.findOne({ email: orgEmail });
    
    if (!org) {
      console.log('Org not found!');
      process.exit(1);
    }
    console.log('Cleaning existing data for ORG:', org.name);

    // 1. Wipe existing Org Data
    await AptitudeTest.deleteMany({ organizationId: org._id });
    await InterviewTemplate.deleteMany({ organizationId: org._id });
    await AptitudeAttempt.deleteMany({}); // Simplified for dummy environment
    await Interview.deleteMany({ organizationId: org._id });
    await Report.deleteMany({ organizationId: org._id });

    // Also delete any interviews linked to templates owned by this org
    // Since we deleted the templates, we can just delete by org
    // Wait, let's delete interviews by templateId just to be safe
    // But we just deleted templates, so let's just delete interviews directly
    const oldInterviews = await Interview.find({ templateId: { $ne: null } });
    for (const iv of oldInterviews) {
      await Report.deleteMany({ interviewId: iv._id });
    }
    await Interview.deleteMany({ templateId: { $ne: null } });

    console.log('Creating realistic users...');
    const users = [];
    for (const u of REALISTIC_USERS) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          name: u.name,
          email: u.email,
          password: 'password123',
          userType: 'professional',
          experienceLevel: 'junior'
        });
      }
      users.push(user);
    }

    // 2. Create Interview Template
    console.log('Creating Interview Template...');
    const template = await InterviewTemplate.create({
      organizationId: org._id,
      title: 'Full Stack Engineer Interview',
      role: 'Full Stack Engineer',
      difficulty: 'hard',
      estimatedDuration: 60,
      systemPrompt: 'You are an expert MERN stack interviewer.',
      isActive: true,
      shareCode: Math.random().toString(36).substring(7)
    });

    // 3. Create realistic Interviews with transcript and reports (Only for 2 users)
    console.log('Creating 2 deep Interviews...');
    for (let i = 0; i < 2; i++) {
      const u = users[i];
      
      const interviewQuestions = [
        {
          questionId: `q-${Date.now()}-1`,
          question: 'Can you explain how Virtual DOM works in React?',
          questionType: 'theory',
          difficulty: 'medium',
          expectedAnswer: 'Virtual DOM is a lightweight copy of the actual DOM...',
          score: 8,
          feedback: 'Excellent explanation, covered reconciliation well.',
          idealAnswer: 'The Virtual DOM is a concept where a virtual representation of the UI is kept in memory and synced with the real DOM.',
          userAnswer: 'The Virtual DOM is basically a JSON representation of the UI. React compares it with the previous version to find what changed, which is called reconciliation.',
          timeTaken: 120,
          strengths: ['Deep React knowledge'],
          weaknesses: [],
          status: 'completed'
        },
        {
          questionId: `q-${Date.now()}-2`,
          question: 'Design a scalable URL shortener like Bitly.',
          questionType: 'system_design',
          difficulty: 'hard',
          expectedAnswer: 'Use a base62 encoder, store mappings in DB, put Redis in front for caching...',
          score: i === 0 ? 9 : 5,
          feedback: i === 0 ? 'Great architecture and caching considerations.' : 'Missed caching strategies completely.',
          idealAnswer: 'A highly scalable architecture requires load balancers, a distributed database like Cassandra, and caching with Redis.',
          userAnswer: 'I would use a relational database to map short strings to long URLs. And we can generate short strings using base62 encoding.',
          timeTaken: 300,
          strengths: i === 0 ? ['Database schema was okay', 'Caching discussed'] : ['Basic understanding'],
          weaknesses: i === 0 ? [] : ['Didn\'t address high read volume'],
          status: 'completed'
        }
      ];

      const transcript = [
        { role: 'ai', content: `Hello ${u.name}, welcome to the interview! Let's start with a React question. Can you explain how Virtual DOM works?`, entryType: 'question' },
        { role: 'user', content: 'The Virtual DOM is basically a JSON representation of the UI. React compares it with the previous version to find what changed, which is called reconciliation.', entryType: 'answer' },
        { role: 'ai', content: 'Great explanation. Now for a system design question: Design a scalable URL shortener like Bitly.', entryType: 'question' },
        { role: 'user', content: 'I would use a relational database to map short strings to long URLs. And we can generate short strings using base62 encoding.', entryType: 'answer' },
        { role: 'ai', content: 'Thank you, that concludes the interview.', entryType: 'closing' }
      ];

      const interview = await Interview.create({
        userId: u._id,
        templateId: template._id,
        organizationId: org._id,
        role: 'Full Stack Engineer',
        experienceLevel: 'fresher',
        techStack: ['React', 'Node.js', 'MongoDB'],
        status: 'completed',
        totalTimeTaken: Math.floor(Math.random() * 1200) + 1800, // 30-50 mins in seconds
        completedAt: new Date(),
        questions: interviewQuestions,
        transcript: transcript,
        violationCount: i === 1 ? 2 : 0,
        violations: i === 1 ? [{ type: 'tab_switch', details: 'Lost focus for 10s', timestamp: new Date() }, { type: 'fullscreen_exit', details: 'Exited fullscreen', timestamp: new Date() }] : []
      });

      await Report.create({
        userId: u._id,
        interviewId: interview._id,
        templateId: template._id,
        organizationId: org._id,
        overallScore: i === 0 ? 85 : 65,
        strengths: i === 0 ? ['React concepts are solid.', 'System design is strong.'] : ['Basic React concepts understood.'],
        weaknesses: i === 0 ? ['Could improve edge cases in design.'] : ['System design knowledge needs improvement.', 'Caching strategies were missed.'],
        strengthSummary: i === 0 ? 'Candidate showed excellent grasp of modern web technologies.' : 'Candidate has basic foundational knowledge.',
        weaknessSummary: i === 0 ? 'Minor improvements needed in distributed systems.' : 'Lacks practical experience with scalable systems.',
        recommendation: i === 0 ? 'hire' : 'borderline',
        candidateStatus: i === 0 ? 'shortlisted' : 'pending',
        technicalScore: i === 0 ? 85 : 60,
        communicationScore: i === 0 ? 90 : 80,
        problemSolvingScore: i === 0 ? 80 : 55,
        codeQualityScore: 75,
        overallFeedback: 'Good effort, but varying levels of system design understanding.',
        createdAt: new Date(),
        questionBreakdown: interviewQuestions
      });
    }

    console.log('Clean Deep Seeding COMPLETE!');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedCleanData();
