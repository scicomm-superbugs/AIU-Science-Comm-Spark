import React from 'react';

export const FT_UNIVERSITY = 'SciComm Spark Egypt';
export const FT_FACULTY = '';

export const formatUnifiedDate = (dateStr) => {
  if (!dateStr || dateStr === 'TBD') return 'TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getCleanAcademicTitle = (account) => {
  if (!account) return 'Teaching Assistant at Alamein International University';
  
  const rawTitle = (account.title || '').trim();
  // Filter out internal system role strings
  if (!rawTitle || rawTitle.includes('System Administrator') || rawTitle.includes('Master') || rawTitle === 'admin') {
    const inst = account.institutionName || 'Alamein International University';
    if (['academic_judge', 'scicomm_judge', 'judge', 'trainer_judge'].includes(account.role)) {
      return `Academic Evaluator & Researcher at ${inst}`;
    }
    return `Teaching Assistant at ${inst}`;
  }

  const inst = account.institutionName || 'Alamein International University';
  if (rawTitle && !rawTitle.toLowerCase().includes('university') && !rawTitle.toLowerCase().includes('at ') && inst) {
    return `${rawTitle} at ${inst}`;
  }
  return rawTitle;
};

export const FT_DEPARTMENTS = [
  'Biotechnology & Life Sciences',
  'Physics & Chemistry',
  'Medicine & Health',
  'Environmental & Energy Sciences',
  'Science Journalism & Media'
];

export const FT_ROLES = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
  JUDGE: 'judge',
  ACADEMIC_JUDGE: 'academic_judge',
  SCICOMM_JUDGE: 'scicomm_judge',
  TRAINER_JUDGE: 'trainer_judge',
  COMPETITOR: 'competitor',
  MASTER: 'master'
};

export const FT_ROLE_LABELS = {
  master: 'System Administrator (Master)',
  admin: 'Administrator',
  trainer: 'Workshop Trainer',
  judge: 'General Competition Judge',
  academic_judge: 'Academic Judge 🎓',
  scicomm_judge: 'Science Communicator Judge 🎙️',
  trainer_judge: 'Trainer & Judge',
  competitor: 'SciComm Competitor',
  user: 'SciComm Competitor'
};

export const FT_ROLE_COLORS = {
  master: '#8b5cf6', // purple
  admin: '#8b5cf6', // purple
  trainer: '#3b82f6', // blue
  judge: '#14b8a6', // teal
  academic_judge: '#0284c7', // sky blue
  scicomm_judge: '#e11d48', // rose red
  trainer_judge: '#ec4899', // pink/magenta
  competitor: '#22c55e', // green
  user: '#22c55e' // green
};

export const FT_REG_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const FT_REG_STATUS_LABELS = {
  pending: 'Pending Approval',
  active: 'In Competition',
  completed: 'Stage Passed',
  failed: 'Needs Revision'
};

export const FT_REG_STATUS_COLORS = {
  pending: '#f59e0b',
  active: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444'
};

export const FT_REG_STATUS_ICONS = {
  pending: '🟡',
  active: '🔵',
  completed: '✅',
  failed: '🔴'
};

export const COMPETITION_TRACKS = [
  {
    id: 'pop_science',
    name: 'Pop Science Videos',
    icon: '🎥',
    description: 'Transform complex scientific concepts into engaging, creative video content for the public.',
    stages: [
      { id: 1, name: 'Stage 1: Short Video (Reels/TikTok)', duration: 'Max 90 seconds', requirement: 'Produce a punchy short video introducing a core scientific concept.' },
      { id: 2, name: 'Stage 2: Long Video (YouTube)', duration: 'Up to 3 minutes', requirement: 'Deep scientific storytelling with comprehensive explanation & visual aids.' },
      { id: 3, name: 'Stage 3 (Finals): Live Stage Presentation', duration: '5 minutes live', requirement: 'Interactive live science presentation on stage before judges & public audience.' }
    ]
  },
  {
    id: 'science_journalism',
    name: 'Science Journalism',
    icon: '📰',
    description: 'Investigate, research, and craft simplified science articles and conduct professional interviews.',
    stages: [
      { id: 1, name: 'Stage 1: Research & Interviews', duration: 'Topic Preparation', requirement: 'Gather research data and conduct interviews with scientists/scholars.' },
      { id: 2, name: 'Stage 2: Simplified Science Article', duration: 'Digital Publication', requirement: 'Write a journalistic science article for digital & magazine publication.' },
      { id: 3, name: 'Stage 3 (Finals): Live Stage Interview', duration: 'Live Stage Show', requirement: 'Simulate a live science talk-show interview on stage in front of judges.' }
    ]
  }
];

export const DEFAULT_JUDGING_CRITERIA = [
  { id: 'accuracy', name: 'Scientific Accuracy & Methodology', category: 'academic', stageId: 1, maxPoints: 25, description: 'Correctness, data reliability, and scientific methodology' },
  { id: 'clarity', name: 'Clarity & Simplification', category: 'scicomm', stageId: 1, maxPoints: 25, description: 'Ability to make complex ideas accessible to general audiences' },
  { id: 'research', name: 'Academic Research Rigor', category: 'academic', stageId: 2, maxPoints: 25, description: 'Depth of scientific literature citations and expert interviews' },
  { id: 'creativity', name: 'Visual Storytelling & Engagement', category: 'scicomm', stageId: 2, maxPoints: 25, description: 'Hook, graphic aesthetics, and narrative flow' },
  { id: 'stage_presence', name: 'Live Stage Performance & Delivery', category: 'scicomm', stageId: 3, maxPoints: 25, description: 'Voice projection, stage confidence, and audience connection' },
  { id: 'defense', name: 'Scientific Defense & Q&A', category: 'academic', stageId: 3, maxPoints: 25, description: 'Handling tough scientific questions from the academic panel' }
];

export const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Scientist1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Scientist2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Judge1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Trainer1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SparkAdmin'
];

export const FT_DEFAULT_REQUIRED_HOURS = 100;

export const isAdminRole = (role) => role === 'admin' || role === 'master';
export const isFacultyRole = (role) => role === 'faculty' || role === 'admin' || role === 'master';
export const isJudgeRole = (role) => role === 'judge' || role === 'academic_judge' || role === 'scicomm_judge' || role === 'trainer_judge' || role === 'admin' || role === 'master';
export const isTrainerRole = (role) => role === 'trainer' || role === 'trainer_judge' || role === 'admin' || role === 'master';
export const isCompetitorRole = (role) => role === 'competitor' || role === 'user';

export const cleanWaveName = (name) => {
  if (!name) return '—';
  return name.replace(/\((Wave\s+\d+:\s*)/i, '(');
};

// Sum stage points across 1 Academic Judge + 1 SciComm Judge evaluation
export const calculateTotalStagePoints = (evaluationsList = []) => {
  if (!evaluationsList || evaluationsList.length === 0) return 0;

  // Group evaluations by stageId
  const byStage = {};
  evaluationsList.forEach(ev => {
    const stageId = Number(ev.stageId) || 1;
    if (!byStage[stageId]) byStage[stageId] = [];
    byStage[stageId].push(ev);
  });

  let totalPoints = 0;

  Object.values(byStage).forEach(stageEvals => {
    // Stage score = 1 Academic evaluation score + 1 SciComm evaluation score
    const academicEval = stageEvals.find(e => e.judgeRole === 'academic_judge');
    const scicommEval = stageEvals.find(e => e.judgeRole === 'scicomm_judge');

    const acadScore = academicEval ? Number(academicEval.totalScore || academicEval.score || 0) : 0;
    const scicommScore = scicommEval ? Number(scicommEval.totalScore || scicommEval.score || 0) : 0;

    if (academicEval || scicommEval) {
      totalPoints += (acadScore + scicommScore);
    } else {
      // Fallback if role labels differ
      stageEvals.forEach(e => {
        totalPoints += Number(e.totalScore || e.score || 0);
      });
    }
  });

  return Math.round(totalPoints * 10) / 10;
};

export const calculateAveragedPoints = calculateTotalStagePoints;

// Unified short ID code generator (e.g. C-939 or T-804)
export const formatSimpleCode = (rawCode, isTeam = false) => {
  if (!rawCode) return isTeam ? 'T-101' : 'C-101';
  if (/^(T-|C-)\d{3,4}$/.test(rawCode)) return rawCode;
  let hash = 0;
  const str = String(rawCode);
  for (let i = 0; i < str.length; i++) {
    hash = (hash + str.charCodeAt(i)) % 900;
  }
  return (isTeam ? 'T-' : 'C-') + (100 + hash);
};

// Normalize raw track key string to standard key ('pop_science' or 'science_journalism')
export const normalizeTrackKey = (rawTrack) => {
  if (!rawTrack) return 'pop_science';
  const str = String(rawTrack).toLowerCase();
  if (str.includes('journal') || str.includes('article') || str.includes('news')) {
    return 'science_journalism';
  }
  return 'pop_science';
};

// Rich formatting renderer for Markdown description text (headings, bold, bullets, numbered lists, paragraphs)
export const renderFormattedDescription = (text) => {
  if (!text) return null;
  if (typeof text !== 'string') return text;

  const lines = text.split('\n');
  const elements = [];
  let currentList = null;
  let listType = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          React.createElement('ul', { key: `ul-${elements.length}`, style: { margin: '0.4rem 0 0.75rem 1.3rem', padding: 0, color: 'inherit' } }, currentList)
        );
      } else if (listType === 'ol') {
        elements.push(
          React.createElement('ol', { key: `ol-${elements.length}`, style: { margin: '0.4rem 0 0.75rem 1.3rem', padding: 0, color: 'inherit' } }, currentList)
        );
      }
      currentList = null;
      listType = null;
    }
  };

  const parseInlineBold = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return React.createElement('strong', { key: i, style: { fontWeight: 800, color: '#0f172a' } }, part.slice(2, -2));
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        React.createElement('h2', { key: index, style: { fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0.8rem 0 0.35rem 0', fontFamily: "'Outfit', sans-serif" } }, parseInlineBold(trimmed.slice(2)))
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        React.createElement('h3', { key: index, style: { fontSize: '1.08rem', fontWeight: 900, color: '#0f172a', margin: '0.75rem 0 0.3rem 0', fontFamily: "'Outfit', sans-serif" } }, parseInlineBold(trimmed.slice(3)))
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        React.createElement('h4', { key: index, style: { fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', margin: '0.65rem 0 0.25rem 0', fontFamily: "'Outfit', sans-serif" } }, parseInlineBold(trimmed.slice(4)))
      );
      return;
    }

    // Bullet List (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
        currentList = [];
      }
      currentList.push(
        React.createElement('li', { key: `item-${index}`, style: { margin: '0.2rem 0', lineHeight: 1.5 } }, parseInlineBold(content))
      );
      return;
    }

    // Numbered List (1. , 2. , etc.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const content = numMatch[2];
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
        currentList = [];
      }
      currentList.push(
        React.createElement('li', { key: `item-${index}`, style: { margin: '0.25rem 0', lineHeight: 1.5 } }, parseInlineBold(content))
      );
      return;
    }

    // Normal Paragraph line
    flushList();
    elements.push(
      React.createElement('p', { key: index, style: { margin: '0.3rem 0', lineHeight: 1.55, color: 'inherit' } }, parseInlineBold(trimmed))
    );
  });

  flushList();

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, elements);
};
