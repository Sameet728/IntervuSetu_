const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

const generateQuickChartUrl = (chartConfig) => {
  const enc = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${enc}&w=600&h=400&bkg=white`;
};

const getScoreColorClass = (score, isAptitude) => {
  if (isAptitude) {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  } else {
    if (score >= 8) return 'text-green-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
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
  
  if (isAptitude) {
    const categories = Object.keys(report.categoryScores || {});
    const catLabels = categories.map(c => c.charAt(0).toUpperCase() + c.slice(1));
    const catScores = categories.map(c => {
      const stats = report.categoryScores[c];
      return stats.total > 0 ? Math.round((stats.score / stats.total) * 100) : 0;
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
  
  // Create PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' }
  });
  
  await browser.close();
  return pdfBuffer;
};

module.exports = { generatePDFBuffer };
