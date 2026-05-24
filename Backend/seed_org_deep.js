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
  { name: 'Aman Verma', email: 'aman.verma@example.com' },
  { name: 'Neha Gupta', email: 'neha.g@example.com' },
  { name: 'Rohan Desai', email: 'rohan.desai@example.com' }
];

async function seedDeepData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const orgEmail = '202401120004@mitaoe.ac.in';
    const org = await Organization.findOne({ email: orgEmail });
    
    if (!org) {
      console.log('Org not found!');
      process.exit(1);
    }
    console.log('Deep Seeding for ORG:', org.name, org._id);

    // 1. Create Users
    console.log('Creating realistic users...');
    const users = [];
    for (const u of REALISTIC_USERS) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          name: u.name,
          email: u.email,
          password: 'password123'
        });
      }
      users.push(user);
    }

    // 2. Create an Aptitude Test
    console.log('Creating Aptitude Test...');
    const aptitudeTest = await AptitudeTest.create({
      title: 'Senior MERN Stack Evaluation',
      description: 'Comprehensive test covering React, Node.js, and DB concepts.',
      organizationId: org._id,
      duration: 45,
      isActive: true,
      shareCode: Math.random().toString(36).substring(7),
      categories: ['numerical', 'logical', 'situational'] // Using enum allowed categories as proxy for tech
    });

    // 3. Create Questions for the test
    const questionsData = [
      { q: 'What is the purpose of useEffect in React?', o: ['State management', 'Side effects', 'Routing', 'Styling'], a: 1 },
      { q: 'Which of the following is NOT a core Node.js module?', o: ['http', 'fs', 'express', 'path'], a: 2 },
      { q: 'What is a common use of Redis?', o: ['Relational DB', 'Caching', 'UI Framework', 'OS'], a: 1 },
      { q: 'In MongoDB, what is the equivalent of a Table?', o: ['Document', 'Collection', 'Field', 'Database'], a: 1 },
      { q: 'What does CSS stand for?', o: ['Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style Sheets', 'Colorful Style Sheets'], a: 1 }
    ];

    const questionDocs = [];
    for (const q of questionsData) {
      const qDoc = await AptitudeQuestion.create({
        testId: aptitudeTest._id,
        category: 'logical',
        difficulty: 'medium',
        question: q.q,
        options: q.o.map((opt, i) => ({ text: opt, isCorrect: i === q.a }))
      });
      questionDocs.push(qDoc);
    }

    // 4. Create detailed Aptitude Attempts
    console.log('Creating Aptitude Attempts...');
    for (let i = 0; i < users.length; i++) {
      const answers = [];
      let correctCount = 0;

      for (let j = 0; j < questionDocs.length; j++) {
        const q = questionDocs[j];
        // Make the user get it right mostly, except random errors
        const isCorrect = Math.random() > 0.3;
        if (isCorrect) correctCount++;
        
        const selectedOptionIndex = isCorrect 
          ? q.options.findIndex(opt => opt.isCorrect) 
          : q.options.findIndex(opt => !opt.isCorrect);

        answers.push({
          questionId: q._id,
          selectedOptionId: q.options[selectedOptionIndex]._id,
          isCorrect,
          timeTaken: Math.floor(Math.random() * 60) + 10
        });
      }

      await AptitudeAttempt.create({
        userId: users[i]._id,
        testId: aptitudeTest._id,
        status: 'completed',
        answers: answers,
        totalScore: correctCount * 10,
        accuracy: (correctCount / questionDocs.length) * 100,
        timeTaken: 1500,
        completedAt: new Date(),
        candidateStatus: correctCount > 3 ? 'shortlisted' : 'rejected'
      });
    }

    // 5. Create Interview Template
    console.log('Creating Interview Template...');
    const template = await InterviewTemplate.create({
      organizationId: org._id,
      title: 'Full Stack Engineer Interview',
      role: 'Full Stack Engineer',
      difficulty: 'hard',
      estimatedDuration: 60,
      systemPrompt: 'You are an expert MERN stack interviewer.',
      isActive: true
    });

    // 6. Create realistic Interviews with transcript and reports
    console.log('Creating deep Interviews...');
    for (let i = 0; i < 3; i++) {
      const u = users[i];
      
      const interviewQuestions = [
        {
          questionId: `q-${Date.now()}-1`,
          question: 'Can you explain how Virtual DOM works in React?',
          questionType: 'theory',
          difficulty: 'medium',
          expectedAnswer: 'Virtual DOM is a lightweight copy of the actual DOM...',
          score: 8,
          feedback: 'Excellent explanation, covered reconciliation.',
          strengths: ['Deep React knowledge'],
          weaknesses: [],
          answers: [
            { type: 'main', answer: 'The Virtual DOM is basically a JSON representation of the UI. React compares it with the previous version to find what changed, which is called reconciliation.', timestamp: new Date() }
          ],
          status: 'completed'
        },
        {
          questionId: `q-${Date.now()}-2`,
          question: 'Design a scalable URL shortener like Bitly.',
          questionType: 'system_design',
          difficulty: 'hard',
          expectedAnswer: 'Use a base62 encoder, store mappings in DB, put Redis in front for caching...',
          score: 6,
          feedback: 'Missed caching strategies.',
          strengths: ['Database schema was okay'],
          weaknesses: ['Didn\'t address high read volume'],
          answers: [
            { type: 'main', answer: 'I would use a relational database to map short strings to long URLs. And we can generate short strings using base62 encoding.', timestamp: new Date() }
          ],
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
        role: 'Full Stack Engineer',
        experienceLevel: 'mid',
        techStack: ['React', 'Node.js', 'MongoDB'],
        status: 'completed',
        duration: 3600,
        completedAt: new Date(),
        questions: interviewQuestions,
        transcript: transcript
      });

      await Report.create({
        userId: u._id,
        interviewId: interview._id,
        templateId: template._id,
        overallScore: 75,
        feedback: {
          strengths: ['React concepts are solid.', 'Clear communication.'],
          weaknesses: ['System design knowledge needs improvement.', 'Caching strategies were missed.'],
          suggestions: ['Study distributed systems', 'Practice system design interviews']
        },
        technicalScore: 70,
        communicationScore: 90,
        problemSolvingScore: 65,
        createdAt: new Date()
      });
    }

    console.log('Deep Seeding COMPLETE!');
    process.exit(0);

  } catch (err) {
    console.error('Error deep seeding data:', err);
    process.exit(1);
  }
}

seedDeepData();
