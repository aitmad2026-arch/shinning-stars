import { useState, useEffect, useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

// ═══════════════════════════════════════════
// GOOGLE SHEETS BACKEND
// ═══════════════════════════════════════════
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwe1CFxeGYxMrqszoQgtUoYqwOVzQT7DuwYqt8Oi5X-Jrxp5Ns39W7TYc1CDRIDOJpPFg/exec";

const DB = {
  getStudents: async () => {
    try { const r = await fetch(`${SCRIPT_URL}?action=getStudents`); return await r.json(); }
    catch { return []; }
  },
  setStudent: async (student) => {
    await fetch(SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({action:"setStudent",student}), redirect:"follow" });
  },
  getSup: async () => {
    try { const r = await fetch(`${SCRIPT_URL}?action=getSup`); return await r.json(); }
    catch { return {}; }
  },
  setSup: async (studentId, supData) => {
    await fetch(SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({action:"setSup",studentId,supData}), redirect:"follow" });
  },
  loadDemo: async (students, sup) => {
    await fetch(SCRIPT_URL, { method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify({action:"loadDemo",students,sup}), redirect:"follow" });
  },
  getDraft:   () => JSON.parse(localStorage.getItem("sc_draft")||"null"),
  setDraft:   (d) => localStorage.setItem("sc_draft", JSON.stringify(d)),
  clearDraft: () => localStorage.removeItem("sc_draft"),
};

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const CREDS = { student:"SCHOLAR2024", supervisor:"SUPER2024", admin:"ADMIN2024" };

const PSY_Q = [
  { id:"p1", cat:"تناؤ اور ردعمل", text:"آپ کا اہم امتحان کل ہے۔ رات کو پڑھتے ہوئے ایک مشکل سوال آیا جو سمجھ نہیں آ رہا۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"گھبرا جائیں اور سونے کی کوشش کریں، کل دیکھیں گے۔",score:1},
    {label:"B",text:"بہت پریشان ہوں، بار بار وہی سوال پڑھیں مگر کچھ نہ ہو۔",score:2},
    {label:"C",text:"وہ سوال چھوڑیں، باقی پڑھیں، صبح تازہ ذہن سے دیکھیں۔",score:3},
    {label:"D",text:"فوری مدد لیں، اگلے دن کے لیے منصوبہ بنائیں اور پرسکون ہو کر سوئیں۔",score:4}]},
  { id:"p2", cat:"ناکامی کا ردعمل", text:"آپ نے Physics ٹیسٹ میں بہت محنت کی مگر نتیجہ خراب آیا — کلاس کے سب سے کم نمبر ملے۔ آپ کا اگلا قدم؟", options:[
    {label:"A",text:"شرم سے چھپیں، پڑھنا چھوڑ دیں، سوچیں 'میں اس قابل نہیں'۔",score:1},
    {label:"B",text:"دل برا مانیں اور دوسرے دن بھی اداس رہیں مگر کچھ نہ کریں۔",score:2},
    {label:"C",text:"غلطیاں دیکھیں اور اگلی بار بہتر کرنے کی کوشش کریں۔",score:3},
    {label:"D",text:"استاد سے ملیں، کمزوریاں سمجھیں، نئی حکمتِ عملی بنائیں۔",score:4}]},
  { id:"p3", cat:"سماجی پہل", text:"ہاسٹل کے پہلے دن آپ کمرے میں اکیلے بیٹھے ہیں۔ باہر کچھ طالبعلم باتیں کر رہے ہیں جنہیں آپ جانتے نہیں۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"دروازہ بند کریں، موبائل دیکھیں، کسی سے نہ ملیں۔",score:1},
    {label:"B",text:"باہر جھانکیں مگر کسی سے بات کرنے کی ہمت نہ ہو۔",score:2},
    {label:"C",text:"باہر جائیں، سلام کریں، اپنا تعارف دیں۔",score:3},
    {label:"D",text:"باہر جائیں، دوسروں میں گھل ملیں اور سب کو اپنے کمرے میں بلائیں۔",score:4}]},
  { id:"p4", cat:"دباؤ میں توجہ", text:"امتحان سے ایک گھنٹہ پہلے دوست نے کہا 'یہ باب تو بہت مشکل ہے، میں نے پڑھا ہی نہیں'۔ آپ پر کیا اثر پڑے گا؟", options:[
    {label:"A",text:"بہت گھبرائیں، جو پڑھا تھا بھول جائیں، ہمت ہاریں۔",score:1},
    {label:"B",text:"پریشان ہوں اور جلدی جلدی وہ باب دیکھنا شروع کریں۔",score:2},
    {label:"C",text:"پریشانی محسوس ہو مگر اپنی تیاری پر بھروسہ رکھیں۔",score:3},
    {label:"D",text:"مسکرائیں، دوست کو اطمینان دلائیں اور خود پرسکون رہیں۔",score:4}]},
  { id:"p5", cat:"ترقی کی سوچ", text:"آپ نے ایک مہینہ محنت کی مگر ہم جماعت نے آدھی محنت میں بہتر نمبر لیے۔ آپ کا ردعمل؟", options:[
    {label:"A",text:"حسد کریں، اس سے دوری اختیار کریں، ناانصافی سمجھیں۔",score:1},
    {label:"B",text:"مایوس ہوں اور سوچیں کہ شاید آپ محنت کے قابل نہیں۔",score:2},
    {label:"C",text:"اس کی تکنیک سمجھنے کی کوشش کریں اور اپنی بہتر کریں۔",score:3},
    {label:"D",text:"اس سے پڑھائی کی ترکیب پوچھیں، مل کر آگے بڑھیں۔",score:4}]},
  { id:"p6", cat:"ہم عمروں کا دباؤ", text:"رات 11 بجے دوست کہہ رہے ہیں 'چلو چھت پر بیٹھیں' جبکہ کل صبح آپ کا ٹیسٹ ہے۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"دوستوں کے ساتھ چلے جائیں، ٹیسٹ بعد میں دیکھا جائے گا۔",score:1},
    {label:"B",text:"جائیں مگر دل میں پچھتاوا رہے۔",score:2},
    {label:"C",text:"انکار کریں، کمرے میں پڑھتے رہیں۔",score:3},
    {label:"D",text:"ہنستے ہوئے انکار کریں، 30 منٹ بعد آنے کا کہیں اور پڑھیں۔",score:4}]},
  { id:"p7", cat:"ذہنی لچک", text:"ایک استاد نے کلاس میں آپ کی غلطی سب کے سامنے بتائی۔ آپ کیسا محسوس کریں گے اور کیا کریں گے؟", options:[
    {label:"A",text:"شرم اور غصہ آئے، باقی کلاس میں کچھ نہ پڑھ پائیں۔",score:1},
    {label:"B",text:"شرمندہ ہوں، خاموش رہیں، دل میں ناراض ہوں۔",score:2},
    {label:"C",text:"شرم محسوس ہو مگر غلطی سمجھ کر آگے بڑھیں۔",score:3},
    {label:"D",text:"استاد کا شکریہ ادا کریں، غلطی نوٹ کریں، کلاس کے بعد سوال کریں۔",score:4}]},
  { id:"p8", cat:"سیکھنے کا جذبہ", text:"آپ نے Math کا ایک مسئلہ تین بار غلط حل کیا۔ چوتھی بار کیا ہوگا؟", options:[
    {label:"A",text:"چھوڑ دیں، 'Math میرے بس کا نہیں'۔",score:1},
    {label:"B",text:"ایک بار اور کوشش کریں پھر جواب دیکھ لیں۔",score:2},
    {label:"C",text:"طریقہ بدلیں، مختلف انداز سے سوچیں۔",score:3},
    {label:"D",text:"غلطیاں تلاش کریں، ہر قدم لکھیں، خود سمجھیں پھر آگے جائیں۔",score:4}]},
];

const PER_Q = [
  { id:"e1", cat:"منصوبہ بندی", text:"آپ کے پاس ایک ہفتے میں تین مضامین کے Assignment جمع کرانے ہیں۔ آپ پہلا قدم کیا اٹھائیں گے؟", options:[
    {label:"A",text:"ہفتہ بھر سوچتے رہیں، آخری دن رات بھر جاگ کر سب کریں۔",score:1},
    {label:"B",text:"جو یاد آئے پہلے کریں، باقی بعد میں دیکھیں گے۔",score:2},
    {label:"C",text:"ہر Assignment کو دن مقرر کریں اور اس پر عمل کریں۔",score:3},
    {label:"D",text:"مشکل والا پہلے، پھر باقی — روزانہ کا ہدف بنائیں اور ٹک کریں۔",score:4}]},
  { id:"e2", cat:"ہمدردی", text:"کمرے کا ساتھی اداس ہے اور بتا نہیں رہا کہ کیا ہوا۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"نظرانداز کریں، اپنا کام کرتے رہیں۔",score:1},
    {label:"B",text:"پوچھیں 'کیا ہوا؟' اور جواب نہ ملے تو چھوڑ دیں۔",score:2},
    {label:"C",text:"ساتھ بیٹھیں، پانی لائیں، بتائیں 'میں یہاں ہوں'۔",score:3},
    {label:"D",text:"وقت دیں، مگر نظر رکھیں، مزاح سے ماحول بہتر کریں۔",score:4}]},
  { id:"e3", cat:"قیادت", text:"گروپ پروجیکٹ میں کوئی کام نہیں کر رہا، سب ایک دوسرے کا انتظار کر رہے ہیں۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"آپ بھی انتظار کریں، 'میں اکیلا کیوں کروں'۔",score:1},
    {label:"B",text:"گروپ چھوڑ دیں یا بڑوں کو بتائیں۔",score:2},
    {label:"C",text:"خود آگے بڑھیں اور کام شروع کریں۔",score:3},
    {label:"D",text:"سب کو اکٹھا کریں، کام بانٹیں، سب کو ذمہ دار بنائیں۔",score:4}]},
  { id:"e4", cat:"وقت کا انتظام", text:"آپ ایک ضروری Assignment لکھ رہے ہیں کہ دوست نے بتایا وہ بہت پریشان ہے۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"دوست کو نظرانداز کریں، Assignment پہلے۔",score:1},
    {label:"B",text:"Assignment چھوڑ کر دوست کے پاس چلے جائیں۔",score:2},
    {label:"C",text:"15 منٹ میں Assignment ختم کریں پھر دوست کے پاس جائیں۔",score:3},
    {label:"D",text:"دوست کو فوری فون کریں، حال پوچھیں، ملنے کا مناسب وقت طے کریں۔",score:4}]},
  { id:"e5", cat:"ہمدردی", text:"ایک نئے طالبعلم کو ہاسٹل کے قواعد سمجھ نہیں آ رہے اور وہ الجھا ہوا ہے۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"اپنے کام سے کام رکھیں، وہ خود سمجھ جائے گا۔",score:1},
    {label:"B",text:"مختصر جواب دیں اور چلے جائیں۔",score:2},
    {label:"C",text:"پوری بات سمجھائیں اور ضرورت پڑے تو ساتھ چلیں۔",score:3},
    {label:"D",text:"سمجھائیں، اپنا نمبر دیں اور کل دوبارہ پوچھیں۔",score:4}]},
  { id:"e6", cat:"قیادت", text:"کلاس میں ایک سرگرمی کا منتظم بیمار ہو گیا۔ استاد نے پوچھا 'کون سنبھالے گا؟'۔ آپ کا ردعمل؟", options:[
    {label:"A",text:"چھپ جائیں، آنکھیں نیچی کریں، کوئی اور کرے۔",score:1},
    {label:"B",text:"کسی اور کا نام لیں جو زیادہ قابل ہو۔",score:2},
    {label:"C",text:"ہاتھ اٹھائیں اور ذمہ داری لیں۔",score:3},
    {label:"D",text:"ہاتھ اٹھائیں، ٹیم بنائیں، سب کو کام دیں۔",score:4}]},
  { id:"e7", cat:"منصوبہ بندی", text:"آپ کے پاس صرف 2 گھنٹے ہیں — ایک گھنٹہ Maths پڑھنا ضروری ہے، ایک گھنٹہ آرام بھی ضروری ہے۔ کیا کریں گے؟", options:[
    {label:"A",text:"پورا وقت موبائل دیکھیں، دونوں کام ادھورے رہیں۔",score:1},
    {label:"B",text:"دونوں ساتھ کریں — پڑھتے ہوئے یوٹیوب بھی چلتا رہے۔",score:2},
    {label:"C",text:"پہلے Maths پھر آرام — ٹائمر لگا کر۔",score:3},
    {label:"D",text:"مشکل topics پہلے، آسان بعد میں، پھر پورا آرام۔",score:4}]},
];

const HON_Q = [
  { id:"h1", cat:"دیانتداری", text:"آپ نے دیکھا کہ ایک ساتھی نے امتحان میں نقل کی اور بہت اچھے نمبر لیے۔ کوئی نہیں جانتا — آپ کیا کریں گے؟", options:[
    {label:"A",text:"کچھ نہ کریں، آپ کو کیا؟ اپنا کام دیکھیں۔",score:1},
    {label:"B",text:"دوستوں کو بتائیں مگر استاد کو نہ بتائیں۔",score:2},
    {label:"C",text:"ساتھی کو تنہائی میں سمجھائیں کہ یہ غلط ہے۔",score:3},
    {label:"D",text:"پہلے ساتھی کو سمجھائیں، اگر نہ مانے تو استاد کو بتائیں۔",score:4}]},
  { id:"h2", cat:"شکرگزاری", text:"آپ کے ہاسٹل کے خادم نے آپ کا کمرہ بہت صاف کیا جبکہ آپ باہر تھے۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"کچھ نہیں، یہ ان کا کام ہے۔",score:1},
    {label:"B",text:"ٹھیک ہے سمجھ کر آگے بڑھ جائیں۔",score:2},
    {label:"C",text:"واپس آ کر شکریہ ادا کریں۔",score:3},
    {label:"D",text:"شکریہ کہیں، ان کی تعریف کریں، کبھی کبھی چائے لے آئیں۔",score:4}]},
  { id:"h3", cat:"دیانتداری", text:"کینٹین میں دکاندار نے آپ کو غلطی سے زیادہ پیسے واپس کیے۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"خاموشی سے رکھ لیں، آپ کی قسمت اچھی تھی۔",score:1},
    {label:"B",text:"سوچیں 'واپس کروں' مگر کریں نہیں۔",score:2},
    {label:"C",text:"فوری واپس کریں۔",score:3},
    {label:"D",text:"فوری واپس کریں اور دکاندار کو سمجھائیں کہ حساب ٹھیک رکھے۔",score:4}]},
  { id:"h4", cat:"شکرگزاری", text:"آپ کے والد نے مہینے بھر کی محنت سے آپ کے لیے ہاسٹل فیس جمع کرائی۔ آپ کا ردعمل؟", options:[
    {label:"A",text:"لے لیں، یہ ان کا فرض ہے۔",score:1},
    {label:"B",text:"شکریہ کہیں اور بھول جائیں۔",score:2},
    {label:"C",text:"دل سے شکریہ ادا کریں اور محنت سے پڑھنے کا وعدہ کریں۔",score:3},
    {label:"D",text:"شکریہ کہیں، قربانی کا احساس کریں، اچھے نمبروں سے خوش کرنے کا عزم کریں۔",score:4}]},
  { id:"h5", cat:"وعدہ وفائی", text:"آپ نے دوست سے وعدہ کیا تھا کہ اس کی مدد کریں گے مگر اس دن آپ تھکے ہوئے ہیں۔ آپ کیا کریں گے؟", options:[
    {label:"A",text:"وعدہ بھول جائیں، سو جائیں۔",score:1},
    {label:"B",text:"فون کریں اور بہانہ بنائیں۔",score:2},
    {label:"C",text:"تھکے ہوئے ہونے کے باوجود وعدہ پورا کریں۔",score:3},
    {label:"D",text:"صادقانہ بتائیں کہ تھکے ہوئے ہیں، پھر مل کر آسان حل نکالیں۔",score:4}]},
];

const IQ_Q = [
  {id:"i1",q:"If 2x + 5 = 13, what is x?",opts:["3","4","5","6"],ans:"4",type:"Arithmetic"},
  {id:"i2",q:"Complete the series: 2, 4, 8, 16, ___",opts:["24","32","20","28"],ans:"32",type:"Pattern"},
  {id:"i3",q:"Which shape has the most sides?",opts:["Triangle","Square","Pentagon","Hexagon"],ans:"Hexagon",type:"Logic"},
  {id:"i4",q:"A train travels at 60 km/hr. How far in 2.5 hours?",opts:["120 km","150 km","180 km","100 km"],ans:"150 km",type:"Arithmetic"},
  {id:"i5",q:"Find the odd one out: Apple, Mango, Carrot, Banana",opts:["Apple","Mango","Carrot","Banana"],ans:"Carrot",type:"Logic"},
  {id:"i6",q:"All Bloops are Razzles. All Razzles are Lazzles. Are all Bloops Lazzles?",opts:["Yes","No","Maybe","Cannot determine"],ans:"Yes",type:"Logic"},
  {id:"i7",q:"What comes next: A, C, E, G, ___?",opts:["H","I","J","K"],ans:"I",type:"Pattern"},
  {id:"i8",q:"25% of 200 = ?",opts:["40","50","60","75"],ans:"50",type:"Arithmetic"},
  {id:"i9",q:"If MANGO reversed is OGNAM, how is APPLE reversed?",opts:["ELPPA","ALPPA","EPPLA","APPEL"],ans:"ELPPA",type:"Pattern"},
  {id:"i10",q:"Which number is even, a perfect square, and less than 50?",opts:["16","18","20","22"],ans:"16",type:"Arithmetic"},
];

const THINK_POOL = [
  {id:"t1",text:"Describe your family background and how it shaped your values."},
  {id:"t2",text:"What is your financial situation and how does it motivate your education?"},
  {id:"t3",text:"What does true friendship mean to you?"},
  {id:"t4",text:"Where do you see yourself in 10 years?"},
  {id:"t5",text:"Describe a personal challenge you overcame and what it taught you."},
  {id:"t6",text:"How do you handle conflict with classmates?"},
];

const FAMILY_Q = [
  {id:"f1",text:"آپ کے گھر میں کتنے افراد رہتے ہیں؟",options:["1 تا 4","5 تا 7","8 تا 10","10 سے زیادہ"]},
  {id:"f2",text:"والد / سرپرست کا بنیادی پیشہ:",options:["سرکاری ملازم","نجی ملازمت","اپنا کاروبار","روزانہ مزدوری / دیہاڑی","کسان / زمیندار","بے روزگار"]},
  {id:"f3",text:"گھر کی تقریباً ماہانہ آمدنی:",options:["50,000 سے زیادہ","30,000 تا 50,000","15,000 تا 30,000","15,000 سے کم"]},
  {id:"f4",text:"آج آپ یہاں کیسے آئے؟",options:["اپنی گاڑی","رشتہ دار / دوست کی گاڑی","پبلک ٹرانسپورٹ / بس","پیدل یا سائیکل"]},
  {id:"f5",text:"کیا آپ اپنے خاندان میں میٹرک سے آگے پڑھنے والوں میں سے پہلے ہیں؟",options:["ہاں، میں پہلا ہوں","نہیں، بھائی/بہن بھی پڑھے ہیں","نہیں، والدین بھی اعلیٰ تعلیم یافتہ ہیں"]},
];

const TRAITS = [
  {id:"gratitude",label:"Gratitude",icon:"🙏",color:"#6366f1"},
  {id:"punctuality",label:"Punctuality",icon:"⏰",color:"#0ea5e9"},
  {id:"prayers",label:"Prayers",icon:"📿",color:"#8b5cf6"},
  {id:"participation",label:"Class Participation",icon:"🙋",color:"#10b981"},
  {id:"discipline",label:"Discipline",icon:"📐",color:"#f59e0b"},
];

const STEPS = ["Info","Psychology","Personality","Honesty","IQ Test","Thinking","Family","Review"];

// ═══════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════
function mcqScore(ans, qs) {
  if (!ans || !Object.keys(ans).length) return 0;
  const total = qs.reduce((s,q) => s + (ans[q.id]||0), 0);
  return Math.round((total / (qs.length * 4)) * 100);
}

function needScore(family) {
  if (!family || Object.keys(family).length < 5) return null;
  const pts = {
    f1:{"1 تا 4":0,"5 تا 7":1,"8 تا 10":2,"10 سے زیادہ":3},
    f2:{"سرکاری ملازم":0,"نجی ملازمت":1,"اپنا کاروبار":1,"روزانہ مزدوری / دیہاڑی":3,"کسان / زمیندار":2,"بے روزگار":3},
    f3:{"50,000 سے زیادہ":0,"30,000 تا 50,000":1,"15,000 تا 30,000":2,"15,000 سے کم":3},
    f4:{"اپنی گاڑی":0,"رشتہ دار / دوست کی گاڑی":1,"پبلک ٹرانسپورٹ / بس":2,"پیدل یا سائیکل":3},
    f5:{"ہاں، میں پہلا ہوں":3,"نہیں، بھائی/بہن بھی پڑھے ہیں":1,"نہیں، والدین بھی اعلیٰ تعلیم یافتہ ہیں":0},
  };
  const total = Object.entries(pts).reduce((s,[k,m])=>s+(m[family[k]]??0),0);
  return Math.round((total/15)*100);
}

function calcScores(student, supAll) {
  const psyScore = mcqScore(student.psychology, PSY_Q);
  const perScore = mcqScore(student.personality, PER_Q);
  const honScore = mcqScore(student.honesty, HON_Q);
  const iqScore  = Math.round((IQ_Q.filter(q=>student.iq?.[q.id]===q.ans).length / IQ_Q.length)*100);
  const sup      = supAll?.[student.id];
  const supScore = sup?.submitted && sup?.traits
    ? Math.round((Object.values(sup.traits).reduce((a,b)=>a+b,0)/(TRAITS.length*10))*100)
    : null;
  const w = supScore!==null
    ? {psy:.20,per:.20,hon:.15,iq:.25,sup:.20}
    : {psy:.25,per:.25,hon:.20,iq:.30,sup:0};
  const suitability = Math.round(psyScore*w.psy+perScore*w.per+honScore*w.hon+iqScore*w.iq+(supScore||0)*w.sup);
  return {psyScore,perScore,honScore,iqScore,supScore,suitability,needScore:needScore(student.family)};
}

function getRec(s) {
  if (s>=80) return {label:"Highly Recommended",badge:"⭐ Excellent",color:"#16a34a",bg:"#f0fdf4",border:"#bbf7d0"};
  if (s>=65) return {label:"Recommended",badge:"✅ Good",color:"#2563eb",bg:"#eff6ff",border:"#bfdbfe"};
  if (s>=50) return {label:"Conditional",badge:"⚠️ Average",color:"#d97706",bg:"#fffbeb",border:"#fde68a"};
  return       {label:"Not Recommended",badge:"❌ Low",color:"#dc2626",bg:"#fef2f2",border:"#fecaca"};
}

// ═══════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════
const DEMO_STUDENTS = [
  {id:"demo1",info:{name:"Ahmed Raza Khan",father:"Muhammad Raza",school:"BISE Federal Islamabad",city:"Islamabad",phone:"0312-1234567"},
   psychology:{p1:4,p2:5,p3:3,p4:4,p5:5,p6:3,p7:4,p8:5},personality:{e1:4,e2:5,e3:3,e4:4,e5:5,e6:4,e7:3},
   honesty:{h1:5,h2:4,h3:5,h4:5,h5:4},iq:{i1:"4",i2:"32",i3:"Hexagon",i4:"150 km",i5:"Carrot",i6:"Yes",i7:"I",i8:"50",i9:"ELPPA",i10:"16"},
   thinking:[{prompt:"Family Background",answer:"My family stressed hard work and education above all. My father is a teacher who taught me that knowledge is the greatest wealth."}],
   family:{f1:"5 تا 7",f2:"سرکاری ملازم",f3:"30,000 تا 50,000",f4:"پبلک ٹرانسپورٹ / بس",f5:"نہیں، بھائی/بہن بھی پڑھے ہیں"},
   submittedAt:"2024-12-01T08:00:00Z"},
  {id:"demo2",info:{name:"Fatima Noor",father:"Abdul Noor",school:"KIPS Rawalpindi",city:"Rawalpindi",phone:"0333-9876543"},
   psychology:{p1:5,p2:4,p3:5,p4:3,p5:4,p6:5,p7:4,p8:4},personality:{e1:5,e2:4,e3:5,e4:5,e5:4,e6:5,e7:4},
   honesty:{h1:4,h2:5,h3:4,h4:5,h5:5},iq:{i1:"4",i2:"32",i3:"Hexagon",i4:"150 km",i5:"Carrot",i6:"Yes",i7:"I",i8:"50",i9:"ELPPA",i10:"16"},
   thinking:[{prompt:"Future Ambitions",answer:"I aspire to become a doctor and serve the underprivileged communities of Pakistan who cannot afford healthcare."}],
   family:{f1:"8 تا 10",f2:"روزانہ مزدوری / دیہاڑی",f3:"15,000 تا 30,000",f4:"پیدل یا سائیکل",f5:"ہاں، میں پہلا ہوں"},
   submittedAt:"2024-12-01T09:30:00Z"},
];
const DEMO_SUP = {
  demo1:{submitted:true,submittedAt:"2024-12-02T10:00:00Z",activityComments:"Ahmed showed excellent leadership. Very impressive communication skills.",activityMarks:"88",traits:{gratitude:9,punctuality:8,prayers:9,participation:9,discipline:8}},
  demo2:{submitted:true,submittedAt:"2024-12-02T10:45:00Z",activityComments:"Fatima was exceptional — empathetic, cooperative and a natural leader.",activityMarks:"92",traits:{gratitude:10,punctuality:9,prayers:10,participation:8,discipline:9}},
};

// ═══════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════
const GS = () => <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;background:#f1f5f9;}
  .urdu{font-family:'Segoe UI','Noto Nastaliq Urdu',serif;}
  .fade{animation:fadeUp .3s ease forwards;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
`}</style>;

// ═══════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════
const Pill = ({score,sm}) => {
  if(score===null||score===undefined) return <span style={{color:"#cbd5e1",fontSize:12}}>—</span>;
  const c = score>=75?"#16a34a":score>=60?"#2563eb":score>=45?"#d97706":"#dc2626";
  const bg= score>=75?"#f0fdf4":score>=60?"#eff6ff":score>=45?"#fffbeb":"#fef2f2";
  return <span style={{background:bg,color:c,border:`1px solid ${c}33`,borderRadius:99,padding:sm?"2px 8px":"3px 12px",fontSize:sm?11:12,fontWeight:700}}>{score}%</span>;
};

const Bar_ = ({label,value,color}) => (
  <div style={{marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
      <span style={{fontSize:12,color:"#475569"}}>{label}</span>
      <span style={{fontSize:12,fontWeight:700,color}}>{value}/10</span>
    </div>
    <div style={{height:6,background:"#f1f5f9",borderRadius:99}}>
      <div style={{width:`${(value/10)*100}%`,height:"100%",background:color,borderRadius:99,transition:"width .5s"}}/>
    </div>
  </div>
);

function TopBar({title,sub,role,onLogout}) {
  const g={student:"linear-gradient(135deg,#1d4ed8,#4f46e5)",supervisor:"linear-gradient(135deg,#0d9488,#059669)",admin:"linear-gradient(135deg,#7c3aed,#9333ea)"};
  return (
    <header style={{background:g[role],padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:40,boxShadow:"0 4px 20px rgba(0,0,0,.15)"}}>
      <div>
        <div style={{color:"#fff",fontSize:17,fontWeight:800}}>{title}</div>
        <div style={{color:"rgba(255,255,255,.6)",fontSize:11}}>{sub}</div>
      </div>
      <button onClick={onLogout} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,padding:"7px 16px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Logout</button>
    </header>
  );
}

function Steps({step}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:20,overflowX:"auto",padding:"4px 0"}}>
      {STEPS.map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:i<step?"#4f46e5":i===step?"#4f46e5":"#e2e8f0",color:i<=step?"#fff":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,transition:"all .2s"}}>
              {i<step?"✓":i+1}
            </div>
            <span style={{fontSize:9,color:i===step?"#4f46e5":"#94a3b8",fontWeight:i===step?700:400,whiteSpace:"nowrap"}}>{s}</span>
          </div>
          {i<STEPS.length-1&&<div style={{width:24,height:2,background:i<step?"#4f46e5":"#e2e8f0",borderRadius:99,marginBottom:14,flexShrink:0,transition:"background .2s"}}/>}
        </div>
      ))}
    </div>
  );
}

function MCQ({q,value,onChange,accent="#4f46e5"}) {
  return (
    <div style={{background:"#fff",borderRadius:18,padding:"20px",border:`1.5px solid ${value?accent+"44":"#e2e8f0"}`,marginBottom:12,transition:"border .2s"}}>
      <div style={{marginBottom:4}}>
        <span style={{background:`${accent}15`,color:accent,fontSize:10,fontWeight:700,borderRadius:99,padding:"2px 10px"}}>{q.cat}</span>
      </div>
      <p className="urdu" dir="rtl" style={{color:"#1e293b",fontSize:15,lineHeight:1.9,textAlign:"right",marginBottom:14,fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif"}}>{q.text}</p>
      <div style={{display:"grid",gap:8}}>
        {q.options.map(opt=>{
          const sel=value===opt.score;
          return (
            <button key={opt.label} onClick={()=>onChange(q.id,opt.score)}
              style={{padding:"11px 16px",borderRadius:12,border:sel?`2px solid ${accent}`:"2px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"border .18s"}}>
              <span style={{width:22,height:22,borderRadius:"50%",border:sel?`2px solid ${accent}`:"2px solid #cbd5e1",background:sel?accent:"#fff",flexShrink:0,transition:"all .18s",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {sel&&<span style={{width:8,height:8,borderRadius:"50%",background:"#fff",display:"block"}}/>}
              </span>
              <span className="urdu" dir="rtl" style={{flex:1,textAlign:"right",color:"#475569",fontSize:14,fontWeight:sel?600:400,lineHeight:1.7,fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif"}}>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IQCard({q,value,onChange}) {
  const tc={Arithmetic:"#4f46e5",Pattern:"#0ea5e9",Logic:"#10b981"};
  return (
    <div style={{background:"#fff",borderRadius:18,padding:"18px",border:"1.5px solid #e2e8f0",marginBottom:12}}>
      <span style={{background:`${tc[q.type]||"#6366f1"}18`,color:tc[q.type]||"#6366f1",fontSize:10,fontWeight:700,borderRadius:99,padding:"2px 10px",display:"inline-block",marginBottom:8}}>{q.type}</span>
      <p style={{color:"#1e293b",fontSize:14,fontWeight:500,marginBottom:14,lineHeight:1.5}}>{q.q}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {q.opts.map(o=>(
          <button key={o} onClick={()=>onChange(q.id,o)}
            style={{padding:"10px 14px",borderRadius:10,border:value===o?"2px solid #4f46e5":"2px solid #e2e8f0",background:value===o?"#eff6ff":"#f8fafc",color:value===o?"#3730a3":"#475569",fontSize:13,fontWeight:value===o?600:400,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════
function LoginPage({onLogin}) {
  const [role,setRole]=useState("student");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const roles=[
    {id:"student",label:"Student",icon:"📚",desc:"Take the assessment"},
    {id:"supervisor",label:"Supervisor",icon:"🎯",desc:"Evaluate students"},
    {id:"admin",label:"Admin",icon:"🛡️",desc:"View analytics"},
  ];
  const login=()=>{
    if(pass===CREDS[role]){onLogin(role);}
    else{setErr("Wrong password. Try again.");setTimeout(()=>setErr(""),2000);}
  };
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#1e1b4b,#312e81,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <GS/>
      <div style={{background:"rgba(255,255,255,.08)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:28,padding:"40px 36px",width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🎓</div>
          <h1 style={{color:"#fff",fontSize:24,fontWeight:800,marginBottom:4}}>Shibli Scholarship</h1>
          <p style={{color:"rgba(255,255,255,.55)",fontSize:13}}>FSc Evaluation System 2024</p>
        </div>
        <div style={{display:"grid",gap:8,marginBottom:24}}>
          {roles.map(r=>(
            <button key={r.id} onClick={()=>{setRole(r.id);setPass("");setErr("");}}
              style={{padding:"14px 16px",borderRadius:14,border:role===r.id?"2px solid #818cf8":"2px solid rgba(255,255,255,.1)",background:role===r.id?"rgba(99,102,241,.25)":"rgba(255,255,255,.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .2s"}}>
              <span style={{fontSize:22}}>{r.icon}</span>
              <div style={{textAlign:"left"}}>
                <div style={{color:"#fff",fontSize:14,fontWeight:700}}>{r.label}</div>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:11}}>{r.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
          type="password" placeholder="Enter password"
          style={{width:"100%",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:12,padding:"13px 16px",color:"#fff",fontSize:14,outline:"none",marginBottom:12,fontFamily:"Inter,sans-serif"}}
        />
        {err&&<p style={{color:"#fca5a5",fontSize:12,marginBottom:8,textAlign:"center"}}>{err}</p>}
        <button onClick={login} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",borderRadius:12,padding:"14px",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>
          Login →
        </button>
        <div style={{marginTop:20,padding:"14px",background:"rgba(255,255,255,.05)",borderRadius:12,fontSize:11,color:"rgba(255,255,255,.4)",textAlign:"center",lineHeight:1.8}}>
          Student: SCHOLAR2024 · Supervisor: SUPER2024 · Admin: ADMIN2024
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STUDENT PORTAL
// ═══════════════════════════════════════════
function StudentPortal({onLogout}) {
  const getInit=()=>{
    const d=DB.getDraft();
    return {
      step:d?.step||0, info:d?.info||{name:"",father:"",school:"",city:"",phone:""},
      psy:d?.psy||{}, per:d?.per||{}, hon:d?.hon||{}, iq:d?.iq||{},
      think:d?.think||{}, family:d?.family||{},
      studentId:d?.studentId||String(Date.now()),
      prompts:d?.prompts||[...THINK_POOL].sort(()=>Math.random()-.5).slice(0,4),
    };
  };
  const [init]=useState(getInit);
  const [step,setStep]=useState(init.step);
  const [info,setInfo]=useState(init.info);
  const [psy,setPsy]=useState(init.psy);
  const [per,setPer]=useState(init.per);
  const [hon,setHon]=useState(init.hon);
  const [iq,setIq]=useState(init.iq);
  const [think,setThink]=useState(init.think);
  const [family,setFamily]=useState(init.family);
  const [prompts]=useState(init.prompts);
  const [studentId]=useState(init.studentId);
  const [submitted,setSubmitted]=useState(false);
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{
    if(!submitted) DB.setDraft({step,info,psy,per,hon,iq,think,family,studentId,prompts});
  },[step,info,psy,per,hon,iq,think,family,submitted]);

  const wc=(id)=>(think[id]||"").trim().split(/\s+/).filter(Boolean).length;

  const canNext=()=>{
    if(step===0) return info.name.trim()&&info.father.trim()&&info.school.trim();
    if(step===1) return PSY_Q.every(q=>psy[q.id]);
    if(step===2) return PER_Q.every(q=>per[q.id]);
    if(step===3) return HON_Q.every(q=>hon[q.id]);
    if(step===4) return IQ_Q.every(q=>iq[q.id]);
    if(step===5) return prompts.every(p=>wc(p.id)>=30);
    if(step===6) return FAMILY_Q.every(q=>family[q.id]);
    return true;
  };

  const doSubmit=async()=>{
    setSubmitting(true);
    try{
      await DB.setStudent({id:studentId,submittedAt:new Date().toISOString(),info,psychology:psy,personality:per,honesty:hon,iq,thinking:prompts.map(p=>({prompt:p.text,answer:think[p.id]||""})),family});
      DB.clearDraft();
      setSubmitted(true);
    } catch {
      alert("❌ Connection error. Check internet and try again.");
    }
    setSubmitting(false);
  };

  const reviewItems=[
    {label:"Psychology",done:PSY_Q.every(q=>psy[q.id]),count:`${Object.keys(psy).length}/${PSY_Q.length}`,icon:"🧠"},
    {label:"Personality",done:PER_Q.every(q=>per[q.id]),count:`${Object.keys(per).length}/${PER_Q.length}`,icon:"👤"},
    {label:"Honesty",done:HON_Q.every(q=>hon[q.id]),count:`${Object.keys(hon).length}/${HON_Q.length}`,icon:"🤲"},
    {label:"IQ Test",done:IQ_Q.every(q=>iq[q.id]),count:`${Object.keys(iq).length}/${IQ_Q.length}`,icon:"🧩"},
    {label:"Thinking",done:prompts.every(p=>wc(p.id)>=30),count:`${prompts.filter(p=>wc(p.id)>=30).length}/${prompts.length}`,icon:"✍️"},
    {label:"Family Info",done:FAMILY_Q.every(q=>family[q.id]),count:`${Object.keys(family).length}/${FAMILY_Q.length}`,icon:"🏠"},
  ];

  const inp={width:"100%",border:"2px solid #e2e8f0",borderRadius:12,padding:"11px 14px",fontSize:14,color:"#1e293b",outline:"none",fontFamily:"Inter,sans-serif",boxSizing:"border-box"};
  const sec=(label,sub,grad,em)=>(
    <div style={{background:grad,borderRadius:16,padding:"18px 22px",marginBottom:16,boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>
      <div style={{color:"#fff",fontSize:20,fontWeight:800}}>{em} {label}</div>
      <div style={{color:"rgba(255,255,255,.65)",fontSize:12,marginTop:3}}>{sub}</div>
    </div>
  );

  if(submitted) return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <GS/>
      <div style={{background:"#fff",borderRadius:24,padding:"48px 36px",maxWidth:440,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,.1)"}}>
        <div style={{fontSize:64,marginBottom:16}}>🎉</div>
        <h2 style={{fontSize:24,fontWeight:800,color:"#0f172a",marginBottom:8}}>Assessment Submitted!</h2>
        <p style={{color:"#64748b",fontSize:14,lineHeight:1.7,marginBottom:24}}>Your responses have been saved. The admin team will review your profile shortly.</p>
        <div style={{background:"#f0fdf4",borderRadius:12,padding:"12px 16px",border:"1px solid #bbf7d0"}}>
          <div style={{fontSize:11,color:"#16a34a",fontWeight:700,marginBottom:4}}>YOUR STUDENT ID</div>
          <div style={{fontSize:13,color:"#14532d",fontWeight:700,fontFamily:"monospace"}}>{studentId}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9"}}>
      <GS/>
      <TopBar title="Student Assessment Portal" sub="Shibli FSc Scholarship 2024" role="student" onLogout={onLogout}/>
      <div style={{maxWidth:700,margin:"0 auto",padding:"24px 16px"}}>
        <Steps step={step}/>
        <div className="fade">
          {step===0&&(
            <div style={{background:"#fff",borderRadius:20,padding:"28px 24px",boxShadow:"0 2px 16px rgba(0,0,0,.06)",border:"1px solid #e2e8f0"}}>
              <h2 style={{fontSize:20,fontWeight:800,color:"#0f172a",marginBottom:4}}>Personal Information</h2>
              <p style={{color:"#64748b",fontSize:13,marginBottom:22}}>Fill in your details accurately.</p>
              {[{k:"name",l:"Full Name ✱",p:"e.g. Ahmed Raza Khan"},{k:"father",l:"Father's Name ✱",p:"Father's full name"},{k:"school",l:"Previous School / Board ✱",p:"e.g. BISE Federal Board"},{k:"city",l:"City",p:"Your city"},{k:"phone",l:"Contact Number",p:"03XX-XXXXXXX"}].map(f=>(
                <div key={f.k} style={{marginBottom:14}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>{f.l}</label>
                  <input value={info[f.k]} onChange={e=>setInfo(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={inp}
                    onFocus={e=>e.target.style.borderColor="#4f46e5"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
                </div>
              ))}
            </div>
          )}
          {step===1&&<div>{sec("نفسیاتی جائزہ","Psychology — ہر سوال کا جواب اپنے حقیقی ردعمل کے مطابق دیں","linear-gradient(135deg,#1d4ed8,#4f46e5)","🧠")}
            {PSY_Q.map(q=><MCQ key={q.id} q={q} value={psy[q.id]} onChange={(id,v)=>setPsy(p=>({...p,[id]:v}))} accent="#4f46e5"/>)}</div>}
          {step===2&&<div>{sec("شخصیت کا جائزہ","Personality — منصوبہ بندی، ہمدردی اور قیادت","linear-gradient(135deg,#0d9488,#059669)","👤")}
            {PER_Q.map(q=><MCQ key={q.id} q={q} value={per[q.id]} onChange={(id,v)=>setPer(p=>({...p,[id]:v}))} accent="#0d9488"/>)}</div>}
          {step===3&&<div>{sec("دیانت اور شکرگزاری","Honesty & Gratitude","linear-gradient(135deg,#d97706,#ea580c)","🤲")}
            {HON_Q.map(q=><MCQ key={q.id} q={q} value={hon[q.id]} onChange={(id,v)=>setHon(p=>({...p,[id]:v}))} accent="#d97706"/>)}</div>}
          {step===4&&<div>{sec("IQ Test","Logic, Pattern & Arithmetic — 10 Questions","linear-gradient(135deg,#7c3aed,#6d28d9)","🧩")}
            {IQ_Q.map(q=><IQCard key={q.id} q={q} value={iq[q.id]} onChange={(id,v)=>setIq(p=>({...p,[id]:v}))}/>)}</div>}
          {step===5&&(
            <div>
              {sec("Thinking Process","Write 30–50 words per prompt. Be honest and thoughtful.","linear-gradient(135deg,#1e293b,#334155)","✍️")}
              {prompts.map((p,i)=>{
                const c=wc(p.id);
                return (
                  <div key={p.id} style={{background:"#fff",borderRadius:18,padding:"20px",border:"1.5px solid #e2e8f0",marginBottom:12}}>
                    <div style={{display:"flex",gap:10,marginBottom:10}}>
                      <span style={{width:26,height:26,borderRadius:"50%",background:"#f1f5f9",color:"#475569",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</span>
                      <p style={{color:"#1e293b",fontSize:14,lineHeight:1.6}}>{p.text}</p>
                    </div>
                    <textarea value={think[p.id]||""} onChange={e=>setThink(v=>({...v,[p.id]:e.target.value}))}
                      placeholder="Write your response (30–50 words)…"
                      style={{width:"100%",border:"2px solid #e2e8f0",borderRadius:10,padding:"11px 14px",height:110,resize:"none",fontFamily:"Inter,sans-serif",fontSize:13,color:"#334155",outline:"none",boxSizing:"border-box"}}
                      onFocus={e=>e.target.style.borderColor="#4f46e5"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
                    <div style={{textAlign:"right",marginTop:5}}>
                      <span style={{fontSize:11,color:c<30?"#ef4444":c>50?"#f59e0b":"#16a34a",fontWeight:600}}>
                        {c} words {c<30?`— need ${30-c} more`:c>50?"— too long":"✓"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {step===6&&(
            <div>
              {sec("خاندانی پس منظر","Family Background — سچائی سے جواب دیں، یہ ضرورت کی بنیاد پر رینکنگ کے لیے ہے","linear-gradient(135deg,#0d9488,#0f766e)","🏠")}
              {FAMILY_Q.map((q,i)=>(
                <div key={q.id} style={{background:"#fff",borderRadius:18,padding:"20px",border:`1.5px solid ${family[q.id]?"#99f6e4":"#e2e8f0"}`,marginBottom:12}}>
                  <p className="urdu" dir="rtl" style={{color:"#1e293b",fontSize:15,fontWeight:600,lineHeight:1.8,textAlign:"right",marginBottom:12,fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif"}}>
                    <span style={{background:"#f0fdfa",color:"#0d9488",borderRadius:8,padding:"2px 8px",fontSize:11,marginLeft:8}}>Q{i+1}</span>
                    {q.text}
                  </p>
                  <div style={{display:"grid",gap:7}}>
                    {q.options.map(opt=>(
                      <button key={opt} onClick={()=>setFamily(p=>({...p,[q.id]:opt}))} dir="rtl"
                        style={{padding:"10px 14px",borderRadius:10,border:family[q.id]===opt?"2px solid #0d9488":"2px solid #e2e8f0",background:family[q.id]===opt?"#f0fdfa":"#f8fafc",cursor:"pointer",textAlign:"right",color:family[q.id]===opt?"#0f766e":"#475569",fontSize:13.5,fontWeight:family[q.id]===opt?700:400,fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif",transition:"all .15s"}}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {step===7&&(
            <div>
              <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:16,padding:"20px 22px",marginBottom:16}}>
                <div style={{color:"#fff",fontSize:20,fontWeight:800}}>✅ Review Your Submission</div>
                <div style={{color:"rgba(255,255,255,.55)",fontSize:12,marginTop:3}}>All sections must be complete before submitting.</div>
              </div>
              <div style={{display:"grid",gap:8}}>
                {reviewItems.map(r=>(
                  <div key={r.label} style={{background:"#fff",borderRadius:12,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",border:`1.5px solid ${r.done?"#bbf7d0":"#fecaca"}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:18}}>{r.icon}</span>
                      <span style={{fontWeight:600,color:"#1e293b",fontSize:14}}>{r.label}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{color:"#94a3b8",fontSize:12}}>{r.count}</span>
                      <span>{r.done?"✅":"❌"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"13px",border:"2px solid #cbd5e1",borderRadius:12,background:"#fff",color:"#475569",fontSize:15,fontWeight:600,cursor:"pointer"}}>← Back</button>}
          {step<STEPS.length-1?(
            <button onClick={()=>canNext()&&setStep(s=>s+1)} style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:canNext()?"linear-gradient(135deg,#4f46e5,#0ea5e9)":"#e2e8f0",color:canNext()?"#fff":"#94a3b8",fontSize:15,fontWeight:700,cursor:canNext()?"pointer":"not-allowed",transition:"all .2s"}}>
              {step===STEPS.length-2?"Review & Submit →":"Next →"}
            </button>
          ):(
            <button onClick={doSubmit} disabled={!reviewItems.every(r=>r.done)||submitting}
              style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:reviewItems.every(r=>r.done)?"linear-gradient(135deg,#16a34a,#059669)":"#e2e8f0",color:reviewItems.every(r=>r.done)?"#fff":"#94a3b8",fontSize:15,fontWeight:700,cursor:reviewItems.every(r=>r.done)&&!submitting?"pointer":"not-allowed"}}>
              {submitting?"⏳ Submitting...":"🎯 Submit Assessment"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUPERVISOR PORTAL
// ═══════════════════════════════════════════
function SupervisorPortal({onLogout}) {
  const [students,setStudents]=useState([]);
  const [supData,setSupData]=useState({});
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState({activityComments:"",activityMarks:"",traits:{gratitude:5,punctuality:5,prayers:5,participation:5,discipline:5}});
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(false);

  const reload=async()=>{
    setLoading(true);
    const [s,sup]=await Promise.all([DB.getStudents(),DB.getSup()]);
    setStudents(Array.isArray(s)?s:[]);
    setSupData(sup&&typeof sup==="object"?sup:{});
    setLoading(false);
  };
  useEffect(()=>{reload();},[]);

  const select=async(s)=>{
    setSelected(s);setSaved(false);
    const sup=await DB.getSup();
    const ex=sup[s.id];
    setForm(ex?{...ex}:{activityComments:"",activityMarks:"",traits:{gratitude:5,punctuality:5,prayers:5,participation:5,discipline:5}});
  };

  const save=async()=>{
    setSaving(true);
    const obj={...form,savedAt:new Date().toISOString()};
    await DB.setSup(selected.id,obj);
    setSupData(p=>({...p,[selected.id]:obj}));
    setSaved(true);setSaving(false);
    setTimeout(()=>setSaved(false),2000);
  };

  const submit=async()=>{
    if(!window.confirm("⚠️ Final Submit — cannot be undone. Lock this evaluation?")) return;
    setSaving(true);
    const obj={...form,submitted:true,submittedAt:new Date().toISOString()};
    await DB.setSup(selected.id,obj);
    setSupData(p=>({...p,[selected.id]:obj}));
    setSaving(false);setSelected(null);
  };

  const locked=selected&&supData[selected.id]?.submitted;

  const statusOf=s=>{
    const d=supData[s.id];
    if(d?.submitted) return {label:"Submitted",bg:"#f0fdf4",color:"#16a34a",dot:"#22c55e"};
    if(d?.savedAt) return {label:"Draft",bg:"#fffbeb",color:"#d97706",dot:"#f59e0b"};
    return {label:"Pending",bg:"#f8fafc",color:"#64748b",dot:"#cbd5e1"};
  };

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9"}}>
      <GS/>
      <TopBar title="Supervisor Evaluation Panel" sub="Student Observation & Trait Assessment" role="supervisor" onLogout={onLogout}/>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px",display:"grid",gridTemplateColumns:"280px 1fr",gap:20,alignItems:"start"}}>
        <div style={{background:"#fff",borderRadius:20,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,.06)",border:"1px solid #e2e8f0",position:"sticky",top:80}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <h3 style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>📋 Students ({students.length})</h3>
            <button onClick={reload} disabled={loading} style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",color:"#475569"}}>
              {loading?"⏳":"🔄"}
            </button>
          </div>
          {students.length===0&&<p style={{color:"#94a3b8",fontSize:13}}>No students yet. Click 🔄 to refresh.</p>}
          {students.map(s=>{
            const st=statusOf(s);
            return (
              <button key={s.id} onClick={()=>select(s)} style={{width:"100%",padding:"12px",borderRadius:12,border:selected?.id===s.id?"2px solid #0d9488":"2px solid #e2e8f0",background:selected?.id===s.id?"#f0fdfa":"#f8fafc",cursor:"pointer",textAlign:"left",marginBottom:6,transition:"all .15s"}}>
                <div style={{fontWeight:600,color:"#0f172a",fontSize:13}}>{s.info.name}</div>
                <div style={{color:"#64748b",fontSize:11,marginTop:2}}>{s.info.school}</div>
                <div style={{marginTop:6}}>
                  <span style={{background:st.bg,color:st.color,fontSize:10,fontWeight:700,borderRadius:99,padding:"2px 8px",display:"inline-flex",alignItems:"center",gap:4}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:st.dot,display:"inline-block"}}/>
                    {st.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {!selected?(
          <div style={{background:"#fff",borderRadius:20,padding:"48px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,.06)",border:"1px solid #e2e8f0"}}>
            <div style={{fontSize:48,marginBottom:12}}>👈</div>
            <p style={{color:"#64748b",fontSize:15}}>Select a student from the list to begin evaluation</p>
          </div>
        ):(
          <div style={{background:"#fff",borderRadius:20,padding:"24px",boxShadow:"0 2px 12px rgba(0,0,0,.06)",border:"1px solid #e2e8f0"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <h2 style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{selected.info.name}</h2>
                <p style={{color:"#64748b",fontSize:13}}>{selected.info.school} · {selected.info.city}</p>
              </div>
              {locked&&<span style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:99,padding:"5px 14px",fontSize:12,fontWeight:700}}>🔒 Locked</span>}
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:6}}>Activity Comments</label>
              <textarea value={form.activityComments} onChange={e=>setForm(f=>({...f,activityComments:e.target.value}))} disabled={locked}
                style={{width:"100%",border:"2px solid #e2e8f0",borderRadius:10,padding:"11px 14px",height:90,resize:"none",fontFamily:"Inter,sans-serif",fontSize:13,outline:"none",boxSizing:"border-box",background:locked?"#f8fafc":"#fff"}}
                placeholder="Describe student's performance during activity..."/>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:6}}>Activity Score (0–100)</label>
              <input type="number" min="0" max="100" value={form.activityMarks} onChange={e=>setForm(f=>({...f,activityMarks:e.target.value}))} disabled={locked}
                style={{width:100,border:"2px solid #e2e8f0",borderRadius:10,padding:"8px 12px",fontSize:14,outline:"none",fontFamily:"Inter,sans-serif",background:locked?"#f8fafc":"#fff"}}/>
            </div>

            <div style={{marginBottom:24}}>
              <h4 style={{fontWeight:700,color:"#0f172a",fontSize:14,marginBottom:4}}>📊 Behavioral Traits (1–10)</h4>
              <p style={{color:"#94a3b8",fontSize:12,marginBottom:14}}>Rate based on direct observation.</p>
              {TRAITS.map(t=>(
                <div key={t.id} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <label style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{t.icon} {t.label}</label>
                    <span style={{fontSize:20,fontWeight:800,color:t.color}}>{form.traits[t.id]}</span>
                  </div>
                  <input type="range" min="1" max="10" value={form.traits[t.id]} disabled={locked}
                    onChange={e=>setForm(f=>({...f,traits:{...f.traits,[t.id]:+e.target.value}}))}
                    style={{width:"100%",accentColor:t.color,cursor:locked?"not-allowed":"pointer"}}/>
                </div>
              ))}
            </div>

            {!locked&&(
              <div style={{display:"flex",gap:10}}>
                <button onClick={save} disabled={saving} style={{flex:1,padding:"12px",borderRadius:12,border:"2px solid #0d9488",background:saved?"#f0fdfa":"#fff",color:"#0d9488",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  {saving?"⏳":saved?"✓ Saved!":"💾 Save Draft"}
                </button>
                <button onClick={submit} disabled={saving} style={{flex:1.4,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0d9488,#059669)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  {saving?"⏳ Submitting...":"🔒 Final Submit"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STUDENT DETAIL MODAL
// ═══════════════════════════════════════════
function StudentModal({student,supData,onClose}) {
  const [drill,setDrill]=useState(null);
  const [aiText,setAiText]=useState(null);
  const [aiLoad,setAiLoad]=useState(false);
  const sc=calcScores(student,supData);
  const rec=getRec(sc.suitability);
  const sup=supData?.[student.id];

  const radar=[
    {subject:"IQ",score:sc.iqScore,fullMark:100},
    {subject:"Psychology",score:sc.psyScore,fullMark:100},
    {subject:"Personality",score:sc.perScore,fullMark:100},
    {subject:"Ethics",score:sc.honScore,fullMark:100},
    {subject:"Supervisor",score:sc.supScore||0,fullMark:100},
  ];

  const analyzeAI=async()=>{
    setAiLoad(true);setAiText(null);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:"You are an educational psychologist evaluating FSc scholarship applicants in Pakistan. Analyze the student's MCQ responses and give a concise psychological assessment covering: stress resilience, discipline, empathy, leadership, and growth mindset. End with an Overall Psychology Rating /10. Be specific and constructive. Under 250 words.",
          messages:[{role:"user",content:`Student: ${student.info.name}\nPsychology answers (score 1-4 per question, 4=most mature): ${JSON.stringify(student.psychology)}\nPersonality answers: ${JSON.stringify(student.personality)}\nHonesty answers: ${JSON.stringify(student.honesty)}\nThinking essays: ${student.thinking?.map(t=>t.answer).join(" | ")}\nProvide psychological assessment.`}]})
      });
      const d=await res.json();
      setAiText(d.content?.find(b=>b.type==="text")?.text||"Analysis unavailable.");
    }catch{setAiText("Failed to load. Try again.");}
    setAiLoad(false);
  };

  const drillSecs={
    psy:{label:"🧠 Psychology",qs:PSY_Q,ans:student.psychology||{}},
    per:{label:"👤 Personality",qs:PER_Q,ans:student.personality||{}},
    hon:{label:"🤲 Honesty",qs:HON_Q,ans:student.honesty||{}},
  };

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(15,23,42,.75)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:860,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,.4)"}}>
        <div style={{background:"linear-gradient(135deg,#7c3aed,#9333ea)",borderRadius:"24px 24px 0 0",padding:"24px 28px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <h2 style={{color:"#fff",fontSize:22,fontWeight:800}}>{student.info.name}</h2>
              <p style={{color:"rgba(255,255,255,.6)",fontSize:13}}>{student.info.school} · {student.info.city}</p>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{background:"rgba(255,255,255,.15)",borderRadius:12,padding:"8px 16px",display:"inline-block"}}>
                <div style={{color:"#fff",fontSize:28,fontWeight:800}}>{sc.suitability}%</div>
                <div style={{color:"rgba(255,255,255,.6)",fontSize:10}}>Suitability</div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["🧩","IQ",sc.iqScore],["🧠","Psych",sc.psyScore],["👤","Person.",sc.perScore],["🤲","Ethics",sc.honScore],["🎯","Supervisor",sc.supScore],["🏠","Need",sc.needScore]].map(([icon,label,val])=>(
              <div key={label} style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"8px 12px",flex:1,minWidth:80}}>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:9,marginBottom:2}}>{icon} {label}</div>
                <div style={{color:"#fff",fontSize:14,fontWeight:700}}>{val!==null&&val!==undefined?`${val}%`:"—"}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,padding:"24px 28px 0"}}>
          <div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:12}}>📊 Performance Radar</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radar}>
                <PolarGrid stroke="#e2e8f0"/>
                <PolarAngleAxis dataKey="subject" tick={{fill:"#475569",fontSize:11}}/>
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:"#94a3b8",fontSize:9}}/>
                <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2}/>
                <Tooltip formatter={v=>[`${v}%`,"Score"]}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:12}}>🎯 Supervisor Insights</h3>
            {sup?.submitted?(
              <div>
                {sup.activityComments&&<div style={{background:"#f0fdfa",borderRadius:10,padding:"10px 12px",marginBottom:10,border:"1px solid #99f6e4"}}>
                  <p style={{fontSize:10,fontWeight:700,color:"#0d9488",marginBottom:3}}>COMMENTS</p>
                  <p style={{fontSize:12.5,color:"#334155",lineHeight:1.6}}>{sup.activityComments}</p>
                  {sup.activityMarks&&<p style={{fontSize:11,color:"#0d9488",marginTop:4,fontWeight:700}}>Score: {sup.activityMarks}/100</p>}
                </div>}
                {TRAITS.map(t=><Bar_ key={t.id} label={`${t.icon} ${t.label}`} value={sup.traits[t.id]} color={t.color}/>)}
              </div>
            ):(
              <div style={{background:"#fefce8",borderRadius:12,padding:"20px",textAlign:"center",border:"1px solid #fde68a"}}>
                <div style={{fontSize:28,marginBottom:8}}>⏳</div>
                <p style={{color:"#92400e",fontSize:13}}>Supervisor evaluation pending</p>
              </div>
            )}
          </div>
        </div>

        <div style={{padding:"20px 28px"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:10}}>🔍 Deep Dive</h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            {Object.entries(drillSecs).map(([k,s])=>(
              <button key={k} onClick={()=>setDrill(drill===k?null:k)} style={{padding:"7px 16px",borderRadius:99,border:"none",background:drill===k?"#7c3aed":"#f1f5f9",color:drill===k?"#fff":"#475569",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {s.label}
              </button>
            ))}
            <button onClick={()=>setDrill(drill==="iq"?null:"iq")} style={{padding:"7px 16px",borderRadius:99,border:"none",background:drill==="iq"?"#7c3aed":"#f1f5f9",color:drill==="iq"?"#fff":"#475569",fontSize:12,fontWeight:600,cursor:"pointer"}}>🧩 IQ</button>
            <button onClick={()=>setDrill(drill==="think"?null:"think")} style={{padding:"7px 16px",borderRadius:99,border:"none",background:drill==="think"?"#7c3aed":"#f1f5f9",color:drill==="think"?"#fff":"#475569",fontSize:12,fontWeight:600,cursor:"pointer"}}>✍️ Thinking</button>
            <button onClick={()=>setDrill(drill==="fam"?null:"fam")} style={{padding:"7px 16px",borderRadius:99,border:"none",background:drill==="fam"?"#0d9488":"#f1f5f9",color:drill==="fam"?"#fff":"#475569",fontSize:12,fontWeight:600,cursor:"pointer"}}>🏠 Family</button>
          </div>

          {drill&&drillSecs[drill]&&(
            <div style={{background:"#fafafa",borderRadius:14,padding:"16px",border:"1px solid #e2e8f0",maxHeight:320,overflowY:"auto",marginBottom:12}}>
              {drillSecs[drill].qs.map((q,i)=>{
                const score=drillSecs[drill].ans[q.id];
                const chosen=q.options?.find(o=>o.score===score);
                const sc_={1:"#ef4444",2:"#f97316",3:"#3b82f6",4:"#16a34a"};
                return (
                  <div key={q.id} style={{background:"#fff",borderRadius:10,padding:"12px",marginBottom:8,border:"1px solid #e2e8f0"}}>
                    <span style={{fontSize:10,background:"#f1f5f9",color:"#64748b",borderRadius:99,padding:"1px 8px",marginRight:6}}>{q.cat}</span>
                    <p className="urdu" dir="rtl" style={{color:"#334155",fontSize:13,lineHeight:1.7,textAlign:"right",margin:"6px 0",fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif"}}>{q.text}</p>
                    {chosen&&<div style={{display:"flex",justifyContent:"flex-end",gap:8,alignItems:"center"}}>
                      <span style={{background:`${sc_[score]}15`,color:sc_[score],borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700}}>{chosen.label} · {score}/4</span>
                      <span className="urdu" dir="rtl" style={{fontSize:12,color:"#475569",fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif"}}>{chosen.text}</span>
                    </div>}
                  </div>
                );
              })}
            </div>
          )}

          {drill==="iq"&&(
            <div style={{background:"#fafafa",borderRadius:14,padding:"16px",border:"1px solid #e2e8f0",maxHeight:320,overflowY:"auto",marginBottom:12}}>
              {IQ_Q.map((q,i)=>{
                const ua=student.iq?.[q.id];const ok=ua===q.ans;
                return (
                  <div key={q.id} style={{background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${ok?"#bbf7d0":"#fecaca"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                      <p style={{fontSize:13,color:"#1e293b",flex:1}}>{i+1}. {q.q}</p>
                      <span>{ok?"✅":"❌"}</span>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:6}}>
                      <span style={{background:ok?"#f0fdf4":"#fef2f2",color:ok?"#16a34a":"#dc2626",borderRadius:8,padding:"2px 10px",fontSize:11,fontWeight:600}}>Answer: {ua||"—"}</span>
                      {!ok&&<span style={{background:"#f1f5f9",color:"#475569",borderRadius:8,padding:"2px 10px",fontSize:11}}>Correct: {q.ans}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {drill==="think"&&(
            <div style={{background:"#fafafa",borderRadius:14,padding:"16px",border:"1px solid #e2e8f0",maxHeight:320,overflowY:"auto",marginBottom:12}}>
              {student.thinking?.map((t,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px",marginBottom:8,border:"1px solid #e2e8f0"}}>
                  <p style={{color:"#7c3aed",fontSize:11,fontWeight:700,marginBottom:4}}>Prompt {i+1}</p>
                  <p style={{color:"#475569",fontSize:12,marginBottom:6}}>{t.prompt}</p>
                  <p style={{color:"#1e293b",fontSize:13,lineHeight:1.7,borderLeft:"3px solid #7c3aed",paddingLeft:10}}>{t.answer||<em style={{color:"#94a3b8"}}>No response</em>}</p>
                </div>
              ))}
            </div>
          )}

          {drill==="fam"&&(
            <div style={{background:"#f0fdfa",borderRadius:14,padding:"16px",border:"1px solid #99f6e4",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <h4 style={{fontWeight:700,color:"#0f766e",fontSize:13}}>Family Background</h4>
                {sc.needScore!==null&&<span style={{background:"#0d9488",color:"#fff",borderRadius:99,padding:"3px 12px",fontSize:12,fontWeight:700}}>Need: {sc.needScore}%</span>}
              </div>
              {FAMILY_Q.map(q=>(
                <div key={q.id} style={{background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:6,border:"1px solid #ccfbf1",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <p className="urdu" dir="rtl" style={{color:"#0f766e",fontSize:13,fontWeight:600,fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif"}}>{q.text}</p>
                  <span className="urdu" dir="rtl" style={{background:"#f0fdfa",color:"#0d9488",borderRadius:8,padding:"3px 12px",fontSize:13,fontWeight:700,fontFamily:"'Segoe UI','Noto Nastaliq Urdu',serif"}}>
                    {student.family?.[q.id]||"—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{borderTop:"1px solid #f1f5f9",paddingTop:14}}>
            <button onClick={analyzeAI} disabled={aiLoad} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:aiLoad?"#e2e8f0":"linear-gradient(135deg,#7c3aed,#a855f7)",color:aiLoad?"#94a3b8":"#fff",fontSize:14,fontWeight:700,cursor:aiLoad?"not-allowed":"pointer"}}>
              {aiLoad?"🤖 Analyzing...":"🤖 AI Psychology Analysis"}
            </button>
            {aiText&&(
              <div style={{marginTop:12,background:"#faf5ff",borderRadius:12,padding:"14px 16px",border:"1px solid #ddd6fe"}}>
                <p style={{fontSize:10,fontWeight:700,color:"#7c3aed",marginBottom:6}}>AI ASSESSMENT</p>
                <p style={{fontSize:13,color:"#1e293b",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{aiText}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{margin:"0 28px 28px",background:rec.bg,borderRadius:14,padding:"14px 18px",border:`1px solid ${rec.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div>
            <p style={{fontSize:15,fontWeight:800,color:rec.color}}>{rec.badge} — {rec.label}</p>
            <p style={{fontSize:12,color:"#64748b",marginTop:2}}>
              Suitability: <strong>{sc.suitability}%</strong> · IQ: {sc.iqScore}% · Psych: {sc.psyScore}% · Per: {sc.perScore}% · Ethics: {sc.honScore}%
              {sc.supScore!==null?` · Sup: ${sc.supScore}%`:""}
              {sc.needScore!==null?` · Need: ${sc.needScore}%`:""}
            </p>
          </div>
          <button onClick={onClose} style={{background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"8px 18px",color:"#475569",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>Close ✕</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════
function AdminDashboard({onLogout}) {
  const [students,setStudents]=useState([]);
  const [supData,setSupData]=useState({});
  const [query,setQuery]=useState("");
  const [sortKey,setSortKey]=useState("suitability");
  const [selected,setSelected]=useState(null);
  const [demoLoaded,setDemoLoaded]=useState(false);
  const [loading,setLoading]=useState(false);

  const reload=async()=>{
    setLoading(true);
    try{
      const [s,sup]=await Promise.all([DB.getStudents(),DB.getSup()]);
      setStudents(Array.isArray(s)?s:[]);
      setSupData(sup&&typeof sup==="object"?sup:{});
    }catch(e){console.error(e);}
    setLoading(false);
  };
  useEffect(()=>{reload();},[]);

  const loadDemo=async()=>{
    setLoading(true);
    await DB.loadDemo(DEMO_STUDENTS,DEMO_SUP);
    await reload();
    setDemoLoaded(true);
  };

  const scored=useMemo(()=>
    students
      .map(s=>({...s,sc:calcScores(s,supData)}))
      .filter(s=>!query||s.info.name.toLowerCase().includes(query.toLowerCase())||s.info.school.toLowerCase().includes(query.toLowerCase()))
      .sort((a,b)=>(b.sc[sortKey]||0)-(a.sc[sortKey]||0)),
    [students,supData,query,sortKey]
  );

  const avg=scored.length?Math.round(scored.reduce((a,s)=>a+s.sc.suitability,0)/scored.length):0;
  const supCnt=Object.values(supData).filter(s=>s.submitted).length;
  const high=scored.filter(s=>s.sc.suitability>=75).length;

  const headers=["#","Name","School","IQ","Psych","Person.","Ethics","Sup","Need","Suit.","Status",""];

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9"}}>
      <GS/>
      <TopBar title="Admin Analytics Dashboard" sub="Scholarship Evaluation · Decision Intelligence" role="admin" onLogout={onLogout}/>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 16px"}}>

        <div style={{background:"#fff",borderRadius:14,padding:"12px 18px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between",border:"1px solid #e2e8f0",boxShadow:"0 1px 6px rgba(0,0,0,.04)"}}>
          <span style={{fontSize:13,color:"#475569"}}>👥 <strong>{students.length}</strong> student{students.length!==1?"s":""} in database</span>
          <button onClick={reload} disabled={loading} style={{background:"linear-gradient(135deg,#4f46e5,#0ea5e9)",border:"none",borderRadius:9,padding:"7px 18px",color:"#fff",fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
            {loading?"⏳ Loading...":"🔄 Refresh"}
          </button>
        </div>

        {students.length===0&&(
          <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:18,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <p style={{color:"#a5b4fc",fontWeight:700,fontSize:15,marginBottom:4}}>📊 No data yet</p>
              <p style={{color:"rgba(255,255,255,.5)",fontSize:13}}>Load demo data or wait for students to submit.</p>
            </div>
            <button onClick={loadDemo} disabled={loading} style={{background:"linear-gradient(135deg,#4f46e5,#0ea5e9)",border:"none",borderRadius:10,padding:"10px 22px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              🚀 Load Demo Data
            </button>
          </div>
        )}

        {demoLoaded&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"10px 16px",marginBottom:16,fontSize:13,color:"#16a34a",fontWeight:500}}>✅ Demo data loaded successfully.</div>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:22}}>
          {[["👥","Total Applicants",students.length,"linear-gradient(135deg,#1d4ed8,#4338ca)"],
            ["📈","Average Suitability",`${avg}%`,"linear-gradient(135deg,#7c3aed,#6d28d9)"],
            ["✅","Supervisor Reviewed",supCnt,"linear-gradient(135deg,#0d9488,#059669)"],
            ["⭐","High Scorers ≥75%",high,"linear-gradient(135deg,#d97706,#dc2626)"]].map(([icon,label,val,grad])=>(
            <div key={label} style={{background:grad,borderRadius:16,padding:"18px 20px",color:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>
              <div style={{fontSize:26,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:28,fontWeight:800}}>{val}</div>
              <div style={{fontSize:12,opacity:.7,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {scored.length>0&&(
          <div style={{background:"#fff",borderRadius:18,padding:"20px 24px",marginBottom:20,boxShadow:"0 2px 12px rgba(0,0,0,.06)",border:"1px solid #e2e8f0"}}>
            <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:14}}>📊 Suitability Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scored.map(s=>({name:s.info.name.split(" ")[0],score:s.sc.suitability}))} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis domain={[0,100]} tick={{fontSize:11,fill:"#64748b"}}/>
                <Tooltip formatter={v=>[`${v}%`,"Suitability"]}/>
                <Bar dataKey="score" radius={[6,6,0,0]}>
                  {scored.map((s,i)=><Cell key={i} fill={s.sc.suitability>=75?"#059669":s.sc.suitability>=60?"#4f46e5":"#d97706"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{background:"#fff",borderRadius:18,padding:"20px 24px",boxShadow:"0 2px 12px rgba(0,0,0,.06)",border:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="🔍 Search students..."
              style={{flex:1,minWidth:180,border:"2px solid #e2e8f0",borderRadius:10,padding:"8px 14px",fontSize:13,outline:"none",fontFamily:"Inter,sans-serif"}}/>
            <select value={sortKey} onChange={e=>setSortKey(e.target.value)} style={{border:"2px solid #e2e8f0",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",fontFamily:"Inter,sans-serif",cursor:"pointer"}}>
              <option value="suitability">Sort: Suitability</option>
              <option value="needScore">Sort: Need Score</option>
              <option value="iqScore">Sort: IQ</option>
              <option value="psyScore">Sort: Psychology</option>
            </select>
            {students.length>0&&<button onClick={loadDemo} disabled={loading} style={{border:"1.5px solid #e2e8f0",borderRadius:10,padding:"8px 14px",fontSize:12,cursor:"pointer",color:"#64748b",background:"#f8fafc"}}>Load Demo</button>}
          </div>

          {scored.length===0?(
            <p style={{color:"#94a3b8",fontSize:14,textAlign:"center",padding:"40px 0"}}>No students found.</p>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:"2px solid #f1f5f9"}}>
                    {headers.map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {scored.map((s,i)=>{
                    const r=getRec(s.sc.suitability);
                    return (
                      <tr key={s.id} style={{borderBottom:"1px solid #f8fafc"}} onMouseEnter={e=>e.currentTarget.style.background="#fafbff"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{padding:"11px 12px",color:"#94a3b8"}}>{i+1}</td>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{fontWeight:700,color:"#0f172a"}}>{s.info.name}</div>
                          <div style={{color:"#94a3b8",fontSize:11}}>{s.info.city}</div>
                        </td>
                        <td style={{padding:"11px 12px",color:"#475569",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.info.school}</td>
                        <td style={{padding:"11px 12px"}}><Pill score={s.sc.iqScore} sm/></td>
                        <td style={{padding:"11px 12px"}}><Pill score={s.sc.psyScore} sm/></td>
                        <td style={{padding:"11px 12px"}}><Pill score={s.sc.perScore} sm/></td>
                        <td style={{padding:"11px 12px"}}><Pill score={s.sc.honScore} sm/></td>
                        <td style={{padding:"11px 12px"}}><Pill score={s.sc.supScore} sm/></td>
                        <td style={{padding:"11px 12px"}}>
                          {s.sc.needScore!==null
                            ?<span style={{background:"#f0fdfa",color:"#0d9488",borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:700}}>{s.sc.needScore}%</span>
                            :<span style={{color:"#cbd5e1",fontSize:11}}>—</span>}
                        </td>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:50,height:5,background:"#f1f5f9",borderRadius:99}}>
                              <div style={{width:`${s.sc.suitability}%`,height:"100%",background:s.sc.suitability>=75?"#059669":s.sc.suitability>=60?"#4f46e5":"#d97706",borderRadius:99}}/>
                            </div>
                            <Pill score={s.sc.suitability} sm/>
                          </div>
                        </td>
                        <td style={{padding:"11px 12px"}}>
                          <span style={{background:r.bg,color:r.color,border:`1px solid ${r.border}`,borderRadius:99,padding:"2px 9px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{r.badge}</span>
                        </td>
                        <td style={{padding:"11px 12px"}}>
                          <button onClick={()=>setSelected(s)} style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {selected&&<StudentModal student={selected} supData={supData} onClose={()=>setSelected(null)}/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════
export default function App() {
  const [role,setRole]=useState(null);
  return (
    <>
      <GS/>
      {!role&&<LoginPage onLogin={setRole}/>}
      {role==="student"&&<StudentPortal onLogout={()=>setRole(null)}/>}
      {role==="supervisor"&&<SupervisorPortal onLogout={()=>setRole(null)}/>}
      {role==="admin"&&<AdminDashboard onLogout={()=>setRole(null)}/>}
    </>
  );
}
