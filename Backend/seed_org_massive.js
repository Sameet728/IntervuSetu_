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
  { name: 'Rohan Desai', email: 'rohan.desai@example.com' },
  { name: 'Sneha Patil', email: 'sneha.p@example.com' },
  { name: 'Karan Malhotra', email: 'karan.m@example.com' },
  { name: 'Aditi Joshi', email: 'aditi.joshi@example.com' },
  { name: 'Vikram Singh', email: 'vikram.singh@example.com' },
  { name: 'Pooja Reddy', email: 'pooja.r@example.com' },
  { name: 'Arjun Nair', email: 'arjun.nair@example.com' },
  { name: 'Simran Kaur', email: 'simran.kaur@example.com' }
];

const QUESTION_BANK = [
  {
    q: 'Can you explain how Virtual DOM works in React?',
    type: 'theory',
    diff: 'medium',
    expected: 'Virtual DOM is a lightweight copy of the actual DOM...',
    ideal: 'The Virtual DOM is a concept where a virtual representation of the UI is kept in memory and synced with the real DOM.'
  },
  {
    q: 'Design a scalable URL shortener like Bitly.',
    type: 'system_design',
    diff: 'hard',
    expected: 'Use a base62 encoder, store mappings in DB, put Redis in front for caching...',
    ideal: 'A highly scalable architecture requires load balancers, a distributed database like Cassandra, and caching with Redis.'
  },
  {
    q: 'What is the Event Loop in Node.js?',
    type: 'theory',
    diff: 'medium',
    expected: 'Event loop handles asynchronous callbacks...',
    ideal: 'The event loop is what allows Node.js to perform non-blocking I/O operations despite the fact that JavaScript is single-threaded.'
  },
  {
    q: 'How would you handle a conflict with a team member?',
    type: 'behavioral',
    diff: 'easy',
    expected: 'Discuss privately, seek compromise...',
    ideal: 'I would approach them privately to understand their perspective, communicate my own clearly, and find a mutually beneficial solution.'
  },
  {
    q: 'Explain the difference between SQL and NoSQL databases.',
    type: 'theory',
    diff: 'easy',
    expected: 'SQL is relational, NoSQL is document/key-value...',
    ideal: 'SQL databases are relational and structured with schemas, while NoSQL databases are non-relational and offer flexible schemas for unstructured data.'
  },
  {
    q: 'Design a real-time chat application.',
    type: 'system_design',
    diff: 'hard',
    expected: 'WebSockets, Redis Pub/Sub, horizontal scaling...',
    ideal: 'Use WebSockets for real-time bidirectional communication, a messaging queue or Redis Pub/Sub to route messages between servers, and a NoSQL DB for fast writes.'
  },
  {
    q: 'What are React Hooks and why were they introduced?',
    type: 'theory',
    diff: 'medium',
    expected: 'Hooks let you use state in functional components...',
    ideal: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components, introduced to solve issues with class components like logic reuse.'
  },
  {
    q: 'Write a function to reverse a string without using built-in methods.',
    type: 'code',
    diff: 'easy',
    expected: 'Use a loop to iterate backwards...',
    ideal: 'function reverse(str) { let res = ""; for(let i=str.length-1; i>=0; i--) res += str[i]; return res; }'
  }
];

function generateCandidateAnswer(qIndex, performanceLevel) {
  const q = QUESTION_BANK[qIndex];
  if (performanceLevel === 'high') {
    return {
      ans: q.ideal,
      score: Math.floor(Math.random() * 2) + 8, // 8-9
      feedback: 'Excellent and precise answer.',
      strength: 'Deep understanding of the topic.',
      weakness: ''
    };
  } else if (performanceLevel === 'medium') {
    return {
      ans: q.expected,
      score: Math.floor(Math.random() * 3) + 5, // 5-7
      feedback: 'Good answer but missed some advanced nuances.',
      strength: 'Solid basic understanding.',
      weakness: 'Could elaborate more on edge cases.'
    };
  } else {
    return {
      ans: 'I am not entirely sure, but I think it has to do with ' + q.type + '.',
      score: Math.floor(Math.random() * 3) + 2, // 2-4
      feedback: 'Answer was vague and lacked technical depth.',
      strength: 'Attempted to answer.',
      weakness: 'Lacks fundamental knowledge of the topic.'
    };
  }
}

async function seedCleanLargeData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const orgEmail = '202401120004@mitaoe.ac.in';
    const org = await Organization.findOne({ email: orgEmail });
    
    if (!org) {
      console.log('Org not found!');
      process.exit(1);
    }
    console.log('Cleaning existing data for ORG:', org.name);

    await AptitudeTest.deleteMany({ organizationId: org._id });
    await InterviewTemplate.deleteMany({ organizationId: org._id });
    await AptitudeAttempt.deleteMany({});
    
    const oldInterviews = await Interview.find({ organizationId: org._id });
    for (const iv of oldInterviews) {
      await Report.deleteMany({ interviewId: iv._id });
    }
    await Interview.deleteMany({ organizationId: org._id });

    console.log('Creating 12 realistic users...');
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

    console.log('Creating 3 Interview Templates...');
    const templates = [];
    for (let i = 1; i <= 3; i++) {
      const roles = ['Frontend Developer', 'Backend Engineer', 'Full Stack Engineer'];
      const template = await InterviewTemplate.create({
        organizationId: org._id,
        title: `${roles[i-1]} Interview`,
        role: roles[i-1],
        difficulty: i === 1 ? 'medium' : 'hard',
        estimatedDuration: 60,
        systemPrompt: 'You are an expert tech interviewer.',
        isActive: true,
        shareCode: Math.random().toString(36).substring(7)
      });
      templates.push(template);
    }

    console.log('Creating large batch of Interviews...');
    // We will distribute the 12 users across the 3 templates
    // Each template gets about 4-6 interviews
    for (let t = 0; t < templates.length; t++) {
      const template = templates[t];
      
      for (let i = 0; i < users.length; i++) {
        // Skip some so not everyone takes every test
        if (Math.random() > 0.6) continue;

        const u = users[i];
        
        // Randomly assign a performance level
        const r = Math.random();
        let perf = 'medium';
        if (r > 0.7) perf = 'high';
        else if (r < 0.3) perf = 'low';

        // Select 6-8 questions randomly
        const qCount = Math.floor(Math.random() * 3) + 6;
        const selectedQuestions = [...QUESTION_BANK].sort(() => 0.5 - Math.random()).slice(0, qCount);
        
        const interviewQuestions = [];
        const transcript = [];
        let totalTechnicalScore = 0;
        let totalCommScore = perf === 'high' ? 90 : (perf === 'medium' ? 70 : 50);
        let totalProbScore = perf === 'high' ? 85 : (perf === 'medium' ? 60 : 40);

        for (let j = 0; j < selectedQuestions.length; j++) {
          const qBase = selectedQuestions[j];
          const ansData = generateCandidateAnswer(QUESTION_BANK.indexOf(qBase), perf);
          
          interviewQuestions.push({
            questionId: `q-${Date.now()}-${j}`,
            question: qBase.q,
            questionType: qBase.type,
            difficulty: qBase.diff,
            expectedAnswer: qBase.expected,
            score: ansData.score,
            feedback: ansData.feedback,
            idealAnswer: qBase.ideal,
            userAnswer: ansData.ans,
            timeTaken: Math.floor(Math.random() * 180) + 60,
            strengths: ansData.strength ? [ansData.strength] : [],
            weaknesses: ansData.weakness ? [ansData.weakness] : [],
            status: 'completed'
          });

          transcript.push({ role: 'ai', content: qBase.q, entryType: 'question' });
          transcript.push({ role: 'user', content: ansData.ans, entryType: 'answer' });
          
          totalTechnicalScore += (ansData.score * 10);
        }

        const avgTech = Math.round(totalTechnicalScore / qCount);
        const overallScore = Math.round((avgTech + totalCommScore + totalProbScore) / 3);

        const strengths = [];
        const weaknesses = [];
        if (perf === 'high') {
          strengths.push('Excellent technical depth.', 'Great communication.');
        } else if (perf === 'medium') {
          strengths.push('Good foundation.');
          weaknesses.push('Could dive deeper into system design.');
        } else {
          weaknesses.push('Lacks technical fundamentals.', 'Struggled with code/design.');
        }

        let candStatus = 'pending';
        let rec = 'borderline';
        if (overallScore > 80) { candStatus = 'selected'; rec = 'strong_hire'; }
        else if (overallScore > 70) { candStatus = 'shortlisted'; rec = 'hire'; }
        else if (overallScore < 50) { candStatus = 'rejected'; rec = 'no_hire'; }

        const totalTimeTaken = interviewQuestions.reduce((acc, q) => acc + q.timeTaken, 0) + 120;
        
        const violations = [];
        const vCount = Math.floor(Math.random() * 3);
        const types = ['tab_switch', 'focus_lost', 'fullscreen_exit'];
        for (let v=0; v<vCount; v++) {
          violations.push({
            type: types[Math.floor(Math.random() * types.length)],
            details: 'Violation detected by proctoring engine.',
            timestamp: new Date()
          });
        }

        const interview = await Interview.create({
          userId: u._id,
          templateId: template._id,
          organizationId: org._id,
          role: template.role,
          experienceLevel: 'junior',
          techStack: ['React', 'Node.js'],
          status: 'completed',
          totalTimeTaken: totalTimeTaken,
          completedAt: new Date(Date.now() - Math.random() * 100000000), // randomize completion time
          questions: interviewQuestions,
          transcript: transcript,
          violationCount: violations.length,
          violations: violations
        });

        await Report.create({
          userId: u._id,
          interviewId: interview._id,
          templateId: template._id,
          organizationId: org._id,
          overallScore: overallScore,
          strengths: strengths,
          weaknesses: weaknesses,
          strengthSummary: strengths.join(' '),
          weaknessSummary: weaknesses.join(' '),
          recommendation: rec,
          candidateStatus: candStatus,
          technicalScore: avgTech,
          communicationScore: totalCommScore,
          problemSolvingScore: totalProbScore,
          codeQualityScore: avgTech - 5,
          overallFeedback: `The candidate performed at a ${perf} level overall.`,
          createdAt: interview.completedAt,
          questionBreakdown: interviewQuestions,
          badge: overallScore > 80 ? 'Top Performer' : null
        });
      }
    }

    console.log('Large Scale Seeding COMPLETE!');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedCleanLargeData();
