const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

const generateQuickChartUrl = (chartConfig) => {
  const enc = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${enc}&w=600&h=400&bkg=white`;
};

const getScoreColorClass = (score, isAptitude) => {
  if (isAptitude) {
    if (score >= 80) return 'text-green-700 bg-green-50 border-green-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  } else {
    if (score >= 8) return 'text-green-700 bg-green-50 border-green-200';
    if (score >= 5) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  }
};

const shlCategoryMap = {
  logical: {
    title: 'Logical Ability',
    subcategories: ['Inductive Reasoning', 'Deductive Reasoning', 'Abductive Reasoning'],
    insightPositive: 'It is commendable that you have excellent inductive reasoning skills. You are able to make specific observations to generalize situations and formulate new rules.',
    insightNegative: 'You may need to focus more on drawing logical conclusions from varying data. Practice more puzzles involving sequences and logical deductions.',
    learning: [
      { type: 'Free Tutorial', label: 'Practice inductive reasoning on visual data' },
      { type: 'Youtube Video', label: 'Learn about pattern identification' }
    ]
  },
  numerical: {
    title: 'Quantitative Ability (Advanced)',
    subcategories: ['Basic Mathematics', 'Advanced Mathematics', 'Applied Mathematics'],
    insightPositive: 'You are able to solve complex word problems on advanced concepts of percentages, ratios, and algebra. This indicates strong analytical capability.',
    insightNegative: 'Your score suggests room for improvement in fundamental math operations and their application in word problems. Revisiting basics is recommended.',
    learning: [
      { type: 'Youtube Video', label: 'Watch a video on the history of algebra and its applications' },
      { type: 'Text Tutorial', label: 'Learn about proportions and its practical usage' }
    ]
  },
  verbal: {
    title: 'English Comprehension',
    subcategories: ['Grammar', 'Vocabulary', 'Comprehension'],
    insightPositive: 'You are able to construct complex sentences and understand nuanced text. The ability to read and comprehend is excellent.',
    insightNegative: 'You might face challenges in vocabulary and grammar. Reading more English literature and practicing grammar exercises will help.',
    learning: [
      { type: 'Text Tutorial', label: 'Learn about written english comprehension' },
      { type: 'Free Tutorial', label: 'Test your comprehension skills' }
    ]
  },
  situational: {
    title: 'Situational Judgement',
    subcategories: ['Scenario Analysis', 'Professional Ethics', 'Decision Making'],
    insightPositive: 'You display a great understanding of professional ethics and situational awareness. Your decision making in tight spots is highly commendable.',
    insightNegative: 'Your responses suggest some difficulty in evaluating workplace scenarios. Try to understand standard professional protocols better.',
    learning: [
      { type: 'Text Tutorial', label: 'Understand workplace ethics' },
      { type: 'Youtube Video', label: 'Case studies in decision making' }
    ]
  }
};

const generatePDFBuffer = async (report, user, isAptitude) => {
  const templatePath = path.join(__dirname, '../templates/report.ejs');
  
  const formatTime = (secs) => {
    if(!secs) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  let radarChartUrl = '';
  let barChartUrl = '';
  
  let aptitudeInsights = [];
  
  if (isAptitude) {
    const categories = Object.keys(report.categoryScores || {});
    const catLabels = categories.map(c => shlCategoryMap[c]?.title || c.charAt(0).toUpperCase() + c.slice(1));
    const catScores = categories.map(c => {
      const stats = report.categoryScores[c];
      return stats.total > 0 ? Math.round((stats.score / stats.total) * 100) : 0;
    });
    
    categories.forEach(c => {
      const stats = report.categoryScores[c];
      const baseScore = stats.total > 0 ? Math.round((stats.score / stats.total) * 100) : 0;
      const shl = shlCategoryMap[c];
      if (shl) {
        const subscores = shl.subcategories.map((sub, i) => {
           let variation = (i - 1) * 3;
           let s = baseScore + variation;
           if (s > 100) s = 100;
           if (s < 0) s = 0;
           return { name: sub, score: s };
        });
        
        aptitudeInsights.push({
          key: c,
          title: shl.title,
          score: baseScore,
          subscores,
          insight: baseScore >= 50 ? shl.insightPositive : shl.insightNegative,
          learning: shl.learning
        });
      }
    });

    radarChartUrl = generateQuickChartUrl({
      type: 'radar',
      data: {
        labels: catLabels,
        datasets: [{ label: 'Accuracy %', data: catScores, backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: 'rgb(99, 102, 241)', pointBackgroundColor: 'rgb(99, 102, 241)' }]
      },
      options: { scale: { ticks: { min: 0, max: 100, stepSize: 20 } }, legend: { display:false }, title: {display: true, text: 'Competency Radar'} }
    });
    
    barChartUrl = generateQuickChartUrl({
       type: 'bar',
       data: {
         labels: catLabels,
         datasets: [{ label: 'Score %', data: catScores, backgroundColor: 'rgba(56, 189, 248, 0.8)' }]
       },
       options: { legend: { display: false }, scales: { yAxes: [{ ticks: { min: 0, max: 100 } }] }, title: {display: true, text: 'Section Accuracy'} }
    });

  } else {
    const metrics = ['Technical', 'Communication', 'Problem Solving', 'HR'];
    const values = [report.technicalScore || 0, report.communicationScore || 0, report.problemSolvingScore || 0, report.hrScore || 0];
    if (report.codeQualityScore) {
       metrics.push('Code Quality');
       values.push(report.codeQualityScore);
    }
    
    radarChartUrl = generateQuickChartUrl({
      type: 'radar',
      data: {
        labels: metrics,
        datasets: [{ label: 'Score', data: values, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgb(16, 185, 129)', pointBackgroundColor: 'rgb(16, 185, 129)' }]
      },
      options: { scale: { ticks: { min: 0, max: 10, stepSize: 2 } }, legend: { display:false }, title: {display: true, text: 'Skills Radar'} }
    });

    barChartUrl = generateQuickChartUrl({
       type: 'bar',
       data: {
         labels: metrics,
         datasets: [{ label: 'Score', data: values, backgroundColor: ['rgba(99, 102, 241, 0.8)','rgba(16, 185, 129, 0.8)','rgba(245, 158, 11, 0.8)','rgba(239, 68, 68, 0.8)','rgba(139, 92, 246, 0.8)'] }]
       },
       options: { legend: { display: false }, scales: { yAxes: [{ ticks: { min: 0, max: 10 } }] }, title: {display: true, text: 'Metric Output'} }
    });
  }

  const overallScore = isAptitude ? Math.round(report.accuracy || 0) : Math.round(report.overallScore || 0);
  const scoreColorClass = getScoreColorClass(overallScore, isAptitude);
  const performanceBand = isAptitude 
    ? (overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Average' : 'Below Average')
    : 'N/A';
    
  const data = {
    report,
    user,
    isAptitude,
    aptitudeInsights,
    date: new Date(report.createdAt || Date.now()).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }),
    orgLogo: report.orgLogo || null,
    overallScore,
    scoreColorClass,
    performanceBand,
    formattedTime: formatTime(report.totalTimeTaken),
    totalQuestions: isAptitude ? report.answers?.length : report.questionBreakdown?.length || 0,
    radarChartUrl,
    barChartUrl,
  };
  
  const html = await ejs.renderFile(templatePath, data);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' }
  });
  
  await browser.close();
  return pdfBuffer;
};

module.exports = { generatePDFBuffer };
