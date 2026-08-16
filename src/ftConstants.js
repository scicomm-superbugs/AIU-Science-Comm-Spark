import React from 'react';

export const FT_UNIVERSITY = 'SciComm Spark Egypt';
export const FT_FACULTY = '';

export const formatUnifiedDate = (dateStr, defaultTimeStr = null) => {
  if (!dateStr || dateStr === 'TBD') return 'TBD';
  
  let d;
  const str = String(dateStr).trim();

  if (str.includes('T')) {
    d = new Date(str);
  } else if (str.includes(' ')) {
    d = new Date(str.replace(' ', 'T'));
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const timeToAppend = defaultTimeStr || '17:00:00';
    d = new Date(`${str}T${timeToAppend}`);
  } else {
    d = new Date(str);
  }

  if (isNaN(d.getTime())) return str;

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const getCleanAcademicTitle = (account) => {
  if (!account) return '';
  
  const rawTitle = (account.title || '').trim();
  const inst = (account.institutionName || '').trim();

  // If explicit custom title is set and valid
  if (rawTitle && rawTitle !== 'Judge' && rawTitle !== 'Competitor' && rawTitle !== 'User') {
    if (inst && !rawTitle.toLowerCase().includes('at ') && !rawTitle.toLowerCase().includes(inst.toLowerCase())) {
      return `${rawTitle} at ${inst}`;
    }
    return rawTitle;
  }

  // If only institution name is set
  if (inst) {
    if (['academic_judge', 'scicomm_judge', 'judge', 'trainer_judge'].includes(account.role)) {
      return `Judge / Evaluator at ${inst}`;
    }
    return `Researcher at ${inst}`;
  }

  if (['academic_judge', 'scicomm_judge', 'judge', 'trainer_judge'].includes(account.role)) {
    return 'Judge';
  }
  return 'Competitor';
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
  master: 'System Administrator 👑',
  admin: 'Administrator 🛡️',
  trainer_judge: 'Trainer & Judge 🎓⚖️',
  trainer: 'Trainer & Judge 🎓⚖️',
  judge: 'Trainer & Judge 🎓⚖️',
  academic_judge: 'Trainer & Judge 🎓⚖️',
  scicomm_judge: 'Trainer & Judge 🎓⚖️',
  competitor: 'Competitor',
  user: 'Competitor'
};

export const getUserRoleLabel = (account) => {
  if (!account) return 'Competitor';
  const r = account.role;
  if (['trainer_judge', 'trainer', 'judge', 'academic_judge', 'scicomm_judge'].includes(r) || (account.isTrainer && account.isJudge)) {
    return 'Trainer & Judge 🎓⚖️';
  }
  return FT_ROLE_LABELS[r] || r || 'Competitor';
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

// Sum stage points across evaluated stages (averaging scores per stage)
export const calculateTotalStagePoints = (evaluationsList = []) => {
  if (!evaluationsList || evaluationsList.length === 0) return 0;

  const scoredEvals = evaluationsList.filter(ev =>
    ev.score !== undefined && ev.score !== null && ev.score !== '' && !isNaN(Number(ev.score))
  );

  if (scoredEvals.length === 0) return 0;

  // Group scored evaluations by stageId
  const byStage = {};
  scoredEvals.forEach(ev => {
    const stageId = Number(ev.stageId) || 1;
    if (!byStage[stageId]) byStage[stageId] = [];
    byStage[stageId].push(Number(ev.score));
  });

  let totalPoints = 0;
  Object.values(byStage).forEach(scores => {
    if (scores.length > 0) {
      const stageAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      totalPoints += stageAvg;
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

// Normalize raw track key string to standard key ('pop_science', 'science_journalism', or 'both')
export const normalizeTrackKey = (rawTrack) => {
  if (!rawTrack) return 'pop_science';
  const str = String(rawTrack).toLowerCase().trim();
  if (str === 'both' || str === 'all' || str === 'both_tracks' || str === 'all_tracks' || str.includes('both') || str.includes('all') || str === 'common') {
    return 'both';
  }
  if (str.includes('journal') || str.includes('article') || str.includes('news') || str.includes('press')) {
    return 'science_journalism';
  }
  return 'pop_science';
};

// Rich formatting renderer for Markdown description text (headings, bold, bullets, numbered lists, paragraphs, RTL & Arabic support)
export const renderFormattedDescription = (text) => {
  if (!text) return null;
  if (typeof text !== 'string') return text;

  let cleanedText = text
    .replace(/بالاستعارات التشبيهات/g, 'بالاستعارات والتشبيهات')
    .trim();

  // If text is a single long paragraph containing multiple "Header Title: description" points, convert to newlines with bullet points
  if (!cleanedText.includes('\n') && (cleanedText.match(/[:：]/g) || []).length >= 2) {
    cleanedText = cleanedText.replace(/([\.\!\?\؟\)])\s*([^\.\!\?\؟\)\n]+?[:：])/g, '$1\n• $2');
    if (!cleanedText.startsWith('• ') && !cleanedText.startsWith('#') && cleanedText.includes(':')) {
      cleanedText = '• ' + cleanedText;
    }
  }

  const lines = cleanedText.split('\n');
  const elements = [];
  let currentList = null;
  let listType = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      const ListTag = listType === 'ul' ? 'ul' : 'ol';
      elements.push(
        React.createElement(ListTag, {
          key: `list-${elements.length}`,
          dir: 'auto',
          style: {
            margin: '0.4rem 0 0.75rem 1.4rem',
            padding: 0,
            color: 'inherit',
            textAlign: 'initial'
          }
        }, currentList)
      );
      currentList = null;
      listType = null;
    }
  };

  const parseInlineBoldAndColon = (str) => {
    let processed = str;
    // Auto-bold label prefix before colon if not already formatted with **
    if (!processed.includes('**') && processed.includes(':')) {
      const colonIdx = processed.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) {
        const titlePart = processed.slice(0, colonIdx).trim();
        const bodyPart = processed.slice(colonIdx + 1);
        processed = `**${titlePart}:** ${bodyPart}`;
      }
    }

    const parts = processed.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return React.createElement('strong', { key: i, style: { fontWeight: 800, color: 'inherit' } }, part.slice(2, -2));
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
        React.createElement('h2', { key: index, dir: 'auto', style: { fontSize: '1.2rem', fontWeight: 900, color: 'inherit', margin: '0.8rem 0 0.35rem 0', fontFamily: "'Outfit', sans-serif" } }, parseInlineBoldAndColon(trimmed.slice(2)))
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        React.createElement('h3', { key: index, dir: 'auto', style: { fontSize: '1.08rem', fontWeight: 900, color: 'inherit', margin: '0.75rem 0 0.3rem 0', fontFamily: "'Outfit', sans-serif" } }, parseInlineBoldAndColon(trimmed.slice(3)))
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        React.createElement('h4', { key: index, dir: 'auto', style: { fontSize: '0.98rem', fontWeight: 900, color: 'inherit', margin: '0.65rem 0 0.25rem 0', fontFamily: "'Outfit', sans-serif" } }, parseInlineBoldAndColon(trimmed.slice(4)))
      );
      return;
    }

    // Bullet List (* or - or •)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.slice(2);
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
        currentList = [];
      }
      currentList.push(
        React.createElement('li', { key: `item-${index}`, dir: 'auto', style: { margin: '0.35rem 0', lineHeight: 1.6 } }, parseInlineBoldAndColon(content))
      );
      return;
    }

    // Numbered List (1. , 2. , etc.)
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      const content = numMatch[2];
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
        currentList = [];
      }
      currentList.push(
        React.createElement('li', { key: `item-${index}`, dir: 'auto', style: { margin: '0.35rem 0', lineHeight: 1.6 } }, parseInlineBoldAndColon(content))
      );
      return;
    }

    // Normal Paragraph line
    flushList();
    elements.push(
      React.createElement('p', { key: index, dir: 'auto', style: { margin: '0.35rem 0', lineHeight: 1.6, color: 'inherit', whiteSpace: 'pre-wrap' } }, parseInlineBoldAndColon(trimmed))
    );
  });

  flushList();

  return React.createElement('div', { dir: 'auto', style: { display: 'flex', flexDirection: 'column', gap: '0.15rem' } }, elements);
};
