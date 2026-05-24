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

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const orgEmail = '202401120004@mitaoe.ac.in';
    const org = await Organization.findOne({ email: orgEmail });
    
    if (!org) {
      console.log('Org not found!');
      process.exit(1);
    }
    console.log('Seeding for ORG:', org.name, org._id);

    // 1. Create Dummy Aptitude Test
    const test = await AptitudeTest.create({
      title: 'Full Stack Developer Aptitude',
      description: 'Test for incoming software engineers',
      organizationId: org._id,
      duration: 30, // minutes
      isActive: true,
      shareCode: Math.random().toString(36).substring(7),
      categories: ['numerical', 'verbal', 'logical', 'situational']
    });

    // 2. Create Dummy Questions
    const q1 = await AptitudeQuestion.create({
      testId: test._id,
      category: 'numerical',
      difficulty: 'medium',
      question: 'What is 2+2?',
      options: [
        { text: '3', isCorrect: false },
        { text: '4', isCorrect: true }
      ]
    });
    
    // removed test.questions.push
    // await test.save();

    const users = [];
    for (let i = 1; i <= 5; i++) {
      const email = `candidate${i}@example.com`;
      let u = await User.findOne({ email });
      if (!u) {
        u = await User.create({
          name: `Candidate ${i}`,
          email,
          password: 'password123'
        });
      }
      users.push(u);
    }

    // 4. Create Aptitude Attempts
    console.log('Creating Aptitude Attempts...');
    for (let i = 0; i < users.length; i++) {
      await AptitudeAttempt.create({
        userId: users[i]._id,
        testId: test._id,
        status: 'completed',
        totalScore: Math.floor(Math.random() * 80) + 20, // 20-100
        accuracy: Math.floor(Math.random() * 50) + 50, // 50-100
        timeTaken: 1200,
        completedAt: new Date(),
        candidateStatus: i === 0 ? 'selected' : (i === 1 ? 'rejected' : 'pending')
      });
    }

    // 5. Create Dummy Interview Template
    const template = await InterviewTemplate.create({
      organizationId: org._id,
      title: 'React.js Frontend Interview',
      role: 'Frontend Developer',
      difficulty: 'medium',
      estimatedDuration: 45,
      systemPrompt: 'You are an interviewer...',
      isActive: true
    });

    // 6. Create Dummy Interviews & Reports
    console.log('Creating Interviews & Reports...');
    for (let i = 0; i < 3; i++) {
      const interview = await Interview.create({
        userId: users[i]._id,
        templateId: template._id,
        role: 'Frontend Developer',
        experienceLevel: 'fresher',
        status: 'completed',
        duration: 2700,
        completedAt: new Date()
      });

      await Report.create({
        userId: users[i]._id,
        interviewId: interview._id,
        templateId: template._id,
        overallScore: Math.floor(Math.random() * 40) + 60,
        feedback: {
          strengths: ['Good communication', 'Understands React hooks'],
          weaknesses: ['State management in large apps'],
          suggestions: ['Study Redux/Zustand']
        },
        technicalScore: 85,
        communicationScore: 90,
        problemSolvingScore: 80,
        createdAt: new Date()
      });
    }

    console.log('Seeding COMPLETE! Check dashboard.');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedData();
