import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ChevronRight, ChevronLeft, ArrowRight, Play, Video, Newspaper,
  Calendar, Award, Users, BookOpen, Clock, Target, CheckCircle2,
  ExternalLink, Mic, FileText, Check, ShieldCheck, Settings,
  Globe, Mail, HelpCircle, UserCheck, LayoutDashboard, Plus, Star,
  Pencil, Save, X, Upload, Trash2, Image as ImageIcon, Menu, ZoomIn, ZoomOut
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { firestore, getCollectionName, uploadFile, getFirebaseAuth } from './db';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import './scicommspark.css';

/* ─────────────────────────── DEFAULT CONTENT ─────────────────────────── */
const DEFAULT_CONTENT = {
  // Hero
  heroEdition: '2nd EDITION',
  heroSpark: 'Spark',
  heroTitle: 'SCIENCE COMM',
  heroTitleSub: 'COMPETITION',
  heroTagline1: 'Science deserves to be told...',
  heroTagline2: 'Are you ready to tell its story?',
  heroDescription: 'Join SciComm Spark Competition and turn complex ideas into simple, engaging, and impactful stories for everyone.',
  heroBgImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80',
  heroBtnPrimary: 'Register Now',
  heroBtnSecondary: 'Learn More',
  heroWidth: '850px',
  heroTitleFontSize: '3.2rem',
  navLogo: './spark_logo.png',
  heroLogo: './spark_logo.png',
  footerLogo: './spark_logo.png',
  // About Section
  aboutTitle: 'ABOUT SCI COMM SPARK',
  aboutHeadline: 'Empowering the Next Generation of Science Communicators across Egypt',
  aboutParagraph1: 'SciComm Spark Competition is a premier nationwide initiative organized by Alamein International University (AIU) to discover, nurture, and empower science communication talents.',
  aboutParagraph2Title: 'SciComm Spark at "SciComm Nexus": The Grand Stage',
  aboutParagraph2: 'Through intensive training workshops, expert mentorship, and multi-stage evaluation, participants learn how to transform complex research ideas into impactful stories that reach everyone.',
  aboutHighlightsTitle: 'Key Highlights',
  aboutSlides: [
    { img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80', title: 'Hands-on Workshops', caption: 'Interactive training sessions with leading science communication experts' },
    { img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80', title: 'Expert Guidance', caption: 'One-on-one mentorship for video creators and science journalists' },
    { img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80', title: 'Grand Final Stage', caption: 'Live stage presentations and awards ceremony at Alamein International University' }
  ],
  aboutHighlights: [
    { icon: '💡', text: 'Practical workshops & expert mentorship', bg: '#ffe4e6', color: '#be123c' },
    { icon: '🎓', text: 'Guidance for students & researchers across Egypt', bg: '#e0e7ff', color: '#3730a3' },
    { icon: '🚀', text: 'Live stage final & national recognition', bg: '#dcfce7', color: '#15803d' }
  ],
  // Hall of Fame
  hallOfFameTitle: 'SciComm Spark Hall of Fame (2026 Champions)',
  hallOfFameSubtitle: 'Celebrating our extraordinary winners and their achievements',
  hallOfFameChampions: [
    {
      icon: '🥇',
      place: '1st Place Champion',
      badgeBg: '#fef3c7',
      badgeColor: '#b45309',
      borderColor: '#fde68a',
      members: [
        {
          name: 'Eng. Abdelrahman Roshdy',
          faculty: 'Faculty of Engineering, AIU',
          img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
        }
      ]
    },
    {
      icon: '🥈',
      place: '2nd Place (Joint Team)',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      borderColor: '#cbd5e1',
      members: [
        {
          name: 'Rowan Mohamed Yehia Ali',
          faculty: 'Faculty of Advanced Basic Sciences, AIU',
          img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Samaa Ibrahim Hassan',
          faculty: 'Faculty of Pharmacy, AIU',
          img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Basant Amr Maged',
          faculty: 'Faculty of Pharmacy, AIU',
          img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
        }
      ]
    },
    {
      icon: '🥉',
      place: '3rd Place (Joint Team)',
      badgeBg: '#fff7ed',
      badgeColor: '#c2410c',
      borderColor: '#ffedd5',
      members: [
        {
          name: 'Ramy Nasr Zahran',
          faculty: 'Faculty of Physical Therapy, AIU',
          img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Rana Ahmed El-Zenati',
          faculty: 'Faculty of Engineering, AIU',
          img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Haged Ashraf Maher',
          faculty: 'Faculty of Physical Therapy, AIU',
          img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
        }
      ]
    }
  ],
  // Stats
  stats: [
    { icon: '🌐', title: 'Open to all', subtitle: 'across Egypt' },
    { icon: '🏆', title: '3 Stages', subtitle: 'of Competition' },
    { icon: '🧭', title: '2 Tracks', subtitle: 'Find your path' },
    { icon: '👤', title: 'Expert', subtitle: 'Guidance' }
  ],
  // Tracks
  tracksSectionTitle: 'COMPETITION TRACKS',
  track1Label: 'Track 1',
  track1Title: 'Pop Science Videos',
  track1Stages: [
    'Stage 1: Short Video (Reels) – up to 90 sec',
    'Stage 2: Long Video (YouTube) – up to 3 min',
    'Stage 3: Live Science Show – 5 min on stage'
  ],
  track1Pill1: '📱 Reels (90s)',
  track1Pill2: '▶️ YouTube (3m)',
  track1Pill3: '🎭 Grand Stage',
  track2Label: 'Track 2',
  track2Title: 'Science Journalism',
  track2Stages: [
    'Stage 1: Research & Interviews',
    'Stage 2: Write & Publish Article',
    'Stage 3: Live Journalism Show'
  ],
  track2Pill1: '🎙️ Research & Pitch',
  track2Pill2: '📰 Article Publication',
  track2Pill3: '🎤 Live Talk Show',
  // Timeline
  timelineSectionTitle: 'COMPETITION TIMELINE',
  timelineTrack1Nodes: [
    { step: 'STEP 01', icon: '⭐', title: 'Orientation Lecture', date: '7/8/2026', color: '#7e22ce', desc: 'An all-applicant briefing detailing evaluation criteria, stage requirements, and Q&A sessions.' },
    { step: 'STEP 02', icon: '🎬', title: 'Workshop 1: Foundations of Science Communication & Short-Form Video Production', date: 'TBD', color: '#9333ea', desc: 'Learn how to simplify scientific concepts, understand your audience, write engaging scripts, film with smartphones, and edit high-impact 90-second videos for social media.' },
    { step: 'STEP 03', icon: '🚀', title: 'Phase 1: Short Video (Reels) Qualifier', date: 'Nov 2026', color: '#0284c7', desc: 'Initial Video Reel Submission: Submit a 90-second high-impact science video reel. Evaluation focuses on scientific accuracy, clarity, storytelling, and digital engagement.' },
    { step: 'STEP 04', icon: '🎥', title: 'Workshop 2: Advanced Science Storytelling & Professional Video Production', date: 'TBD', color: '#2563eb', desc: 'Master narrative structure, visual storytelling, motion graphics, sound design, AI-assisted content creation, and YouTube production techniques to create compelling long-form science videos.' },
    { step: 'STEP 05', icon: '🏆', title: 'Phase 2: Long Video (YouTube Feature)', date: 'Jan 2027', color: '#0d9488', desc: 'Advanced Production & YouTube Short Film: Produce an expanded 3-minute video feature with motion graphics, professional sound design, and deep scientific narrative.' },
    { step: 'STEP 06', icon: '🎤', title: 'Workshop 3: Live Science Presentation & Public Speaking Masterclass', date: 'TBD', color: '#16a34a', desc: 'Build confidence for live presentations through public speaking, stage presence, audience engagement, interactive demonstrations, and mock judging sessions.' },
    { step: 'STEP 07', icon: '🥇', title: 'Grand Final: Live Stage Show at AIU', date: 'Feb 2027', color: '#be123c', desc: 'Deliver a 5-minute live science demonstration and video showcase on stage in front of national judges, scientific experts, and live audience.' }
  ],
  timelineTrack2Nodes: [
    { step: 'STEP 01', icon: '⭐', title: 'Orientation Lecture', date: '7/8/2026', color: '#be123c', desc: 'An all-applicant briefing detailing evaluation criteria, stage requirements, and Q&A sessions.' },
    { step: 'STEP 02', icon: '📰', title: 'Workshop 1: Fundamentals of Science Journalism & Investigative Reporting', date: 'TBD', color: '#e11d48', desc: 'Master interviewing scientists, evaluating research papers, fact-checking claims, and structuring compelling science news stories.' },
    { step: 'STEP 03', icon: '🚀', title: 'Phase 1: Research & Article Pitch Submission', date: 'Nov 2026', color: '#d97706', desc: 'Journalistic Pitch & Article Proposal: Submit an original science article draft or investigative pitch with verified research sources and expert interviews.' },
    { step: 'STEP 04', icon: '✍️', title: 'Workshop 2: Editing, Infographics & Digital Media Publishing', date: 'TBD', color: '#ca8a04', desc: 'Learn publication layout design, crafting powerful headlines, creating data visualizations, and adhering to media ethics.' },
    { step: 'STEP 05', icon: '🏆', title: 'Phase 2: Article Publication & Editorial Review', date: 'Jan 2027', color: '#059669', desc: 'Final Article Publication & Editorial Review: Polish and publish full-length science journalism feature articles with infographics and published media review.' },
    { step: 'STEP 06', icon: '🎙️', title: 'Workshop 3: Live Media Interviewing & On-Stage Hosting', date: 'TBD', color: '#0284c7', desc: 'Develop live stage hosting techniques, lead panel discussions, conduct live scientist interviews, and handle audience Q&A.' },
    { step: 'STEP 07', icon: '🥇', title: 'Grand Final: Live Journalism Show at AIU', date: 'Feb 2027', color: '#9333ea', desc: 'Participate in a live stage interview and science communication panel broadcast live at AIU with award ceremony.' }
  ],
  // Workshops & Trainers
  workshopsSectionTitle: 'TRAINING WORKSHOPS & EXPERT SESSIONS',
  workshopsSectionDesc: 'Learn directly from prominent science communicators, academic researchers, media professionals, and digital influencers.',
  workshops: [
    {
      month: 'AUG', day: '10',
      title: 'General Coordination & Mentorship',
      speaker: 'Abdullah Amr Maged',
      role: 'Teaching Assistant & General Coordinator for Science Communication',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'AUG', day: '17',
      title: 'International Science Outreach',
      speaker: 'Dr. Ibrahim Farouq',
      role: 'Director of Education & International Outreach - Baseet UAE',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'AUG', day: '24',
      title: 'Viral Science Content Creation',
      speaker: 'Dr. Andrew Samir',
      role: 'Pharmacist & Viral Science Content Creator with over 4 million followers',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'SEP', day: '01',
      title: 'High-Impact Digital Broadcasting',
      speaker: 'Eng. Abdelrahman Roshdy',
      role: 'Science communicator with 160M Views',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'SEP', day: '07',
      title: 'Geological & Science Journalism',
      speaker: 'Eng. Metwally Hamza',
      role: 'Geologist & Science Journalist',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'SEP', day: '14',
      title: 'Children & Edutainment Strategy',
      speaker: 'Dr. Samaa Ibrahim',
      role: "Content Strategist & Children's Science Communicator",
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'SEP', day: '21',
      title: 'Interactive STEM Education',
      speaker: 'Mr. Anthony Ragaey',
      role: 'STEM Instructor & Science Communicator at NuttyScientist EG',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'SEP', day: '28',
      title: 'Sciphilia Science Storytelling',
      speaker: 'Mr. Omar Fawzy',
      role: 'Founder of "Sciphilia" & Science Storyteller on YouTube with 20M Views',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'OCT', day: '05',
      title: 'STEM Edutainment & Public Speaking',
      speaker: 'Mr. Yossef El-Said',
      role: 'Science Communication Specialist & STEM Edutainment Expert',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80'
    },
    {
      month: 'OCT', day: '12',
      title: 'Pioneering Scientific Storytelling',
      speaker: 'Dr. Mai Mustafa',
      role: 'Science Communication Specialist & Academic Researcher',
      type: 'Online',
      img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
    }
  ],
  // Collaborations
  collaboratorsSectionTitle: 'OUR COLLABORATORS & PARTNERS',
  collaboratorsHeadline: 'Working Together to Fuel Science Communication in Egypt',
  collaborators: [
    { logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=600&q=80', name: 'Alamein International University', role: 'Academic Host & Organizer' },
    { logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=600&q=80', name: 'Bibliotheca Alexandrina', role: 'Strategic Venue Partner' },
    { logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80', name: 'Academy of Scientific Research & Technology (ASRT)', role: 'Scientific Incubator Partner' },
    { logo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80', name: 'Egyptian Knowledge Bank (EKB)', role: 'Knowledge & Educational Partner' },
    { logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=600&q=80', name: 'Ministry of Higher Education & Scientific Research', role: 'Official Patronage' }
  ],
  // Team Section
  teamSectionTitle: 'MEET OUR TEAM',
  teamHeadline: 'The Visionaries & Mentors Behind SciComm Spark',
  teamMembers: [
    {
      name: 'Prof. Dr. Essam ElKordi',
      role: 'President of AIU & Patron of SciComm Spark',
      org: 'Alamein International University',
      img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80',
      bio: 'Leading innovation and excellence in scientific education and research at Alamein International University.'
    },
    {
      name: 'Prof. Dr. Hisham El-Ghazaly',
      role: 'Head of Scientific Committee & Jury Lead',
      org: 'AIU Medical Sciences & Oncology',
      img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=500&q=80',
      bio: 'Renowned oncologist and advocate for accessible science communication across the MENA region.'
    },
    {
      name: 'Dr. Mai Mustafa',
      role: 'General Coordinator & Mentorship Lead',
      org: 'Faculty of Pharmacy, AIU',
      img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80',
      bio: 'Pioneering scientific storytelling and guiding emerging communicators in digital video creation.'
    },
    {
      name: 'Eng. Omar Khaled',
      role: 'Technical & Media Production Director',
      org: 'SciComm Nexus Egypt',
      img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80',
      bio: 'Specializing in high-impact video production and interactive digital science broadcasting.'
    }
  ],
  // Footer
  footerConnect: "Let's Connect",
  footerConnectSub: 'Follow us on social media',
  footerEmail: 'scmnexus@aiu.edu.eg',
  footerLinks: ['FAQs', 'Rules & Guidelines', 'Contact Us'],
  footerBtn: 'Register Now 🚀',
  // Gallery images
  galleryImages: []
};

/* ─────────────── EDITABLE TEXT (Rich Text & Bold Support) ─────────────── */
function parseMarkdownToHTML(str) {
  if (typeof str !== 'string') return str || '';
  let html = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>');
  // Strip external inline style="", color="", and span tags that override website default fonts & colors
  html = html.replace(/\s*style="[^"]*"/gi, '');
  html = html.replace(/\s*color="[^"]*"/gi, '');
  html = html.replace(/<span\b[^>]*>(.*?)<\/span>/gi, '$1');
  html = html.replace(/<font\b[^>]*>(.*?)<\/font>/gi, '$1');
  return html;
}

export function EditableText({ value, onChange, editing, tag: Tag = 'span', style = {}, className = '' }) {
  const ref = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Clean HTML of any inline style/color tags
  const cleanHTML = (htmlStr) => {
    if (!htmlStr) return '';
    let cleaned = htmlStr.replace(/\s*style="[^"]*"/gi, '');
    cleaned = cleaned.replace(/\s*color="[^"]*"/gi, '');
    cleaned = cleaned.replace(/<span\b[^>]*>(.*?)<\/span>/gi, '$1');
    cleaned = cleaned.replace(/<font\b[^>]*>(.*?)<\/font>/gi, '$1');
    return cleaned.trim();
  };

  // Keep ref.current.innerHTML updated when value changes externally (not focused)
  useEffect(() => {
    if (editing && ref.current && !isFocused) {
      const formattedHTML = parseMarkdownToHTML(value);
      if (ref.current.innerHTML !== formattedHTML) {
        ref.current.innerHTML = formattedHTML;
      }
    }
  }, [value, editing, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    if (ref.current && onChange) {
      const html = cleanHTML(ref.current.innerHTML);
      if (html !== value) onChange(html);
    }
  };

  const handleInput = (e) => {
    if (onChange) {
      const html = cleanHTML(e.currentTarget.innerHTML);
      onChange(html);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    // Extract pure plain text (stripping external fonts, colors, line heights, etc.)
    const plainText = e.clipboardData?.getData('text/plain') || '';

    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, plainText);
    } else {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      selection.deleteFromDocument();
      selection.getRangeAt(0).insertNode(document.createTextNode(plainText));
    }

    if (ref.current && onChange) {
      onChange(cleanHTML(ref.current.innerHTML));
    }
  };

  const toggleBold = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ref.current) return;

    ref.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
      document.execCommand('selectAll', false, null);
      document.execCommand('bold', false, null);
      window.getSelection()?.removeAllRanges();
    } else {
      document.execCommand('bold', false, null);
    }

    if (onChange && ref.current) {
      onChange(cleanHTML(ref.current.innerHTML));
    }
  };

  const toggleItalic = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ref.current) return;

    ref.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
      document.execCommand('selectAll', false, null);
      document.execCommand('italic', false, null);
      window.getSelection()?.removeAllRanges();
    } else {
      document.execCommand('italic', false, null);
    }

    if (onChange && ref.current) {
      onChange(cleanHTML(ref.current.innerHTML));
    }
  };

  const formattedHTML = parseMarkdownToHTML(value);

  if (!editing) {
    return (
      <Tag
        style={style}
        className={className}
        dangerouslySetInnerHTML={{ __html: formattedHTML }}
      />
    );
  }

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          toggleBold(e);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          toggleItalic(e);
        }
      }}
      className={className}
      style={{
        ...style,
        outline: isFocused ? '2px solid #2563eb' : '2px dashed #3b82f6',
        outlineOffset: '2px',
        borderRadius: '4px',
        cursor: 'text',
        minWidth: '20px',
        boxSizing: 'border-box'
      }}
    />
  );
}

/* ─────────────────────────── INTERACTIVE PHOTO CROPPER MODAL ─────────────────────────── */

export function ImageCropModal({ isOpen, imageSrc, onClose, onSave }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  let boxWidth = 260;
  let boxHeight = 260;
  if (aspectRatio === '4:3') {
    boxWidth = 280;
    boxHeight = 210;
  } else if (aspectRatio === '16:9') {
    boxWidth = 280;
    boxHeight = 157;
  } else if (aspectRatio === 'free') {
    boxWidth = 280;
    boxHeight = 240;
  }

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: offset.x,
      initialY: offset.y
    };

    const handleMouseMove = (me) => {
      if (!isDraggingRef.current) return;
      const dx = me.clientX - dragStartRef.current.x;
      const dy = me.clientY - dragStartRef.current.y;
      setOffset({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleApplyCrop = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = boxWidth * 2;
      canvas.height = boxHeight * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.translate(offset.x * 2, offset.y * 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const scaleFit = Math.max(canvas.width / img.width, canvas.height / img.height);
      const drawWidth = img.width * scaleFit;
      const drawHeight = img.height * scaleFit;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const isPng = imageSrc.startsWith('data:image/png');
      const croppedBase64 = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88);
      onSave(croppedBase64);
      onClose();
    };
    img.src = imageSrc;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '440px',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc',
          position: 'sticky', top: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✂️</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Crop & Adjust Photo</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem' }}
          >
            ✕
          </button>
        </div>

        {/* Viewport Box */}
        <div style={{
          padding: '1.25rem', background: '#0f172a', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div
            onMouseDown={handleMouseDown}
            style={{
              width: `${boxWidth}px`, height: `${boxHeight}px`,
              position: 'relative', overflow: 'hidden',
              borderRadius: '12px', border: '2px dashed #3b82f6',
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)', cursor: 'move',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <img
              src={imageSrc}
              alt="Crop target"
              style={{
                maxWidth: 'none', maxHeight: 'none',
                width: '100%', height: '100%', objectFit: 'cover',
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease',
                pointerEvents: 'none', userSelect: 'none'
              }}
            />
            {/* Grid Overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.3)' }} />
            </div>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.6rem', fontWeight: 600 }}>
            ✋ Drag photo to position | Slider to Zoom
          </span>
        </div>

        {/* Controls */}
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', minWidth: '45px' }}>🔍 Zoom</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb', minWidth: '35px' }}>{Math.round(zoom * 100)}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              {['1:1', '4:3', '16:9', 'free'].map(ratio => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  style={{
                    background: aspectRatio === ratio ? '#2563eb' : 'transparent',
                    color: aspectRatio === ratio ? '#ffffff' : '#64748b',
                    border: 'none', borderRadius: '6px', padding: '0.2rem 0.45rem',
                    fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  {ratio.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                style={{
                  background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
                  borderRadius: '8px', padding: '0.3rem 0.55rem', fontSize: '0.72rem',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >
                🔄 Rotate ({rotation}°)
              </button>
              <button
                type="button"
                onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); }}
                style={{
                  background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1',
                  borderRadius: '8px', padding: '0.3rem 0.55rem', fontSize: '0.72rem',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >
                ↺ Reset
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
          display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
          position: 'sticky', bottom: 0, zIndex: 10
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff', color: '#64748b', border: '1.5px solid #cbd5e1',
              borderRadius: '10px', padding: '0.45rem 1rem', fontSize: '0.82rem',
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff', border: 'none', borderRadius: '10px',
              padding: '0.45rem 1.15rem', fontSize: '0.82rem', fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
            }}
          >
            Apply & Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── CLEAN MEDIA FRAME SYSTEM ─────────────────────────── */

export function EditableImage({ src, onUpload, onRemove, editing, style = {}, alt = '' }) {
  const fileRef = useRef(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result;
      if (base64) {
        setPendingImage(base64);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const openCropModal = () => {
    if (src) {
      setPendingImage(src);
      setCropModalOpen(true);
    }
  };

  if (!editing) {
    return src ? <img src={src} alt={alt} style={style} /> : null;
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: style.width || '100%', height: style.height || 'auto' }}>
      {src ? (
        <img src={src} alt={alt} style={style} />
      ) : (
        <div style={{
          ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#eff6ff', border: '2px dashed #2563eb', borderRadius: '12px', minHeight: '100px', color: '#2563eb'
        }}>
          <ImageIcon size={28} />
        </div>
      )}

      {/* Admin Floating Upload & Crop Buttons */}
      <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px', zIndex: 100 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            background: '#2563eb', color: '#ffffff', border: '1.5px solid #ffffff',
            borderRadius: '8px', padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
            boxShadow: '0 3px 10px rgba(0,0,0,0.25)'
          }}
          title="Replace Photo"
        >
          <Upload size={12} /> Replace
        </button>

        {src && (
          <button
            type="button"
            onClick={openCropModal}
            style={{
              background: '#0d9488', color: '#ffffff', border: '1.5px solid #ffffff',
              borderRadius: '8px', padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              boxShadow: '0 3px 10px rgba(0,0,0,0.25)'
            }}
            title="Crop & Adjust Photo"
          >
            ✂️ Crop
          </button>
        )}

        {onRemove && src && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              background: '#ef4444', color: '#ffffff', border: '1.5px solid #ffffff',
              borderRadius: '8px', width: '26px', height: '26px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(0,0,0,0.25)'
            }}
            title="Remove Photo"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={pendingImage}
        onClose={() => setCropModalOpen(false)}
        onSave={(croppedBase64) => {
          if (onUpload) onUpload(croppedBase64);
        }}
      />
    </div>
  );
}

/* ─────────────────────────── CANVA TRANSFORM & MOVABLE OBJECT SYSTEM ─────────────────────────── */

export function CanvaTransformBox({
  children,
  editing,
  scale = 1,
  rotate = 0,
  offsetX = 0,
  offsetY = 0,
  onTransformChange,
  style = {}
}) {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, initX: 0, initY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = (e) => {
    if (!editing || !onTransformChange) return;
    if (e.target.isContentEditable || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initX: offsetX,
      initY: offsetY
    };

    const handleMouseMove = (me) => {
      if (!isDraggingRef.current) return;
      const dx = me.clientX - dragStartRef.current.x;
      const dy = me.clientY - dragStartRef.current.y;
      onTransformChange({
        scale,
        rotate,
        offsetX: Math.round(dragStartRef.current.initX + dx),
        offsetY: Math.round(dragStartRef.current.initY + dy)
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const transformStyle = {
    display: 'inline-block',
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotate}deg)`,
    transformOrigin: 'center center',
    transition: isDraggingRef.current ? 'none' : 'transform 0.15s ease',
    position: 'relative',
    userSelect: editing ? 'none' : 'auto',
    cursor: editing ? 'grab' : 'default',
    ...style
  };

  if (!editing) {
    return <div style={transformStyle}>{children}</div>;
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      style={{
        ...transformStyle,
        outline: isHovered ? '2px dashed #a855f7' : '1px dashed rgba(168,85,247,0.3)',
        outlineOffset: '4px',
        borderRadius: '8px'
      }}
    >
      {children}

      {/* Floating Canvas Transform Controls when hovered in Edit Mode */}
      {isHovered && onTransformChange && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '-34px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 10000,
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            fontSize: '0.72rem',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ cursor: 'grab', fontWeight: 800, padding: '0 4px' }} title="Drag box to reposition">✋ Move</span>
          
          <button
            type="button"
            onClick={() => onTransformChange({ scale: Math.round((scale + 0.1) * 100) / 100, rotate, offsetX, offsetY })}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Zoom In"
          >
            +
          </button>
          
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a855f7' }}>{Math.round(scale * 100)}%</span>

          <button
            type="button"
            onClick={() => onTransformChange({ scale: Math.max(0.2, Math.round((scale - 0.1) * 100) / 100), rotate, offsetX, offsetY })}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Zoom Out"
          >
            -
          </button>

          <button
            type="button"
            onClick={() => onTransformChange({ scale, rotate: (rotate + 15) % 360, offsetX, offsetY })}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', padding: '1px 5px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
            title="Rotate 15°"
          >
            🔄 {rotate}°
          </button>

          {(offsetX !== 0 || offsetY !== 0 || scale !== 1 || rotate !== 0) && (
            <button
              type="button"
              onClick={() => onTransformChange({ scale: 1, rotate: 0, offsetX: 0, offsetY: 0 })}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '1px 5px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
              title="Reset Position"
            >
              ↺ Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EditableLogo({
  src,
  onUpload,
  onRemove,
  editing,
  style = {},
  alt = '',
  scale = 1,
  rotate = 0,
  offsetX = 0,
  offsetY = 0,
  onTransformChange
}) {
  const fileRef = useRef(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result;
      if (base64) {
        setPendingImage(base64);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const openCropModal = () => {
    if (src) {
      setPendingImage(src);
      setCropModalOpen(true);
    }
  };

  if (!editing) {
    return (
      <CanvaTransformBox
        editing={false}
        scale={scale}
        rotate={rotate}
        offsetX={offsetX}
        offsetY={offsetY}
      >
        {src ? <img src={src} alt={alt} style={style} /> : null}
      </CanvaTransformBox>
    );
  }

  return (
    <CanvaTransformBox
      editing={editing}
      scale={scale}
      rotate={rotate}
      offsetX={offsetX}
      offsetY={offsetY}
      onTransformChange={onTransformChange}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {src ? (
          <img src={src} alt={alt} style={{ ...style, maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{
            ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f1f5f9', border: '2px dashed #94a3b8', borderRadius: '12px', minHeight: '80px', color: '#64748b'
          }}>
            <ImageIcon size={24} />
          </div>
        )}

        {/* Admin Floating Buttons */}
        <div style={{ position: 'absolute', bottom: '4px', right: '4px', display: 'flex', gap: '4px', zIndex: 100 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff', border: '1.5px solid #ffffff', borderRadius: '8px',
              padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              boxShadow: '0 4px 12px rgba(37,99,235,0.35)'
            }}
            title="Change Logo"
          >
            <Upload size={12} /> Replace
          </button>

          {src && (
            <button
              type="button"
              onClick={openCropModal}
              style={{
                background: '#0d9488', color: '#ffffff', border: '1.5px solid #ffffff',
                borderRadius: '8px', padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                boxShadow: '0 3px 10px rgba(0,0,0,0.25)'
              }}
              title="Crop & Adjust Logo"
            >
              ✂️ Crop
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={pendingImage}
          onClose={() => setCropModalOpen(false)}
          onSave={(croppedBase64) => {
            if (onUpload) onUpload(croppedBase64);
          }}
        />
      </div>
    </CanvaTransformBox>
  );
}

/* ─────────────── EDITABLE TEXT OBJECT ─────────────── */
function EditableTextObject({ value, onChange, editing, isMobile, scale = 1, rotate = 0, offsetX = 0, offsetY = 0, onTransformChange, style = {}, tag = 'span', className = '' }) {
  return (
    <CanvaTransformBox
      editing={editing}
      scale={scale}
      rotate={rotate}
      offsetX={offsetX}
      offsetY={offsetY}
      onTransformChange={onTransformChange}
    >
      <EditableText value={value} onChange={onChange} editing={editing} tag={tag} style={style} className={className} />
    </CanvaTransformBox>
  );
}
/* ═══════════════════════════ LANDING COMPONENT ═══════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const isAdmin = user?.role === 'master' || user?.role === 'admin';
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState(() => {
    try {
      const cached = localStorage.getItem('scicomm_landing_content');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.heroBtnPrimary === 'Sign Up Now') parsed.heroBtnPrimary = 'Register Now';
        return { ...structuredClone(DEFAULT_CONTENT), ...parsed };
      }
    } catch (e) {
      console.warn('Initial localStorage read warning:', e);
    }
    return structuredClone(DEFAULT_CONTENT);
  });
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [savedContent, setSavedContent] = useState(null); // snapshot before editing

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [saving, setSaving] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [fameSlide, setFameSlide] = useState(0);
  const [trainerSlide, setTrainerSlide] = useState(0);
  const [trainerDir, setTrainerDir] = useState('forward');
  const [trainerPaused, setTrainerPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [selectedMobileTrack, setSelectedMobileTrack] = useState(1);
  const trainerContainerRef = useRef(null);

  // Auto-play Hall of Fame carousel
  useEffect(() => {
    if (editMode) return;
    const champions = content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions;
    if (!champions || champions.length <= 1) return;

    const timer = setInterval(() => {
      setFameSlide(prev => (prev + 1) % champions.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [content.hallOfFameChampions, editMode]);

  // ── Load from LocalStorage & Real-time Firestore Sync ──
  useEffect(() => {
    // Ensure anonymous Firebase Auth session for public visitors without accounts
    try {
      const auth = getFirebaseAuth();
      if (auth && !auth.currentUser) {
        signInAnonymously(auth).catch(err => console.warn('Anonymous session error:', err));
      }
    } catch (e) {}

    const ref = doc(firestore, getCollectionName('landing_content'), 'main');

    const unsubscribe = onSnapshot(ref, (snap) => {
      try {
        if (snap.exists()) {
          const remoteData = snap.data();
          if (!remoteData.heroBtnPrimary || remoteData.heroBtnPrimary === 'Sign Up Now') {
            remoteData.heroBtnPrimary = 'Register Now';
          }
          
          // Direct real-time listener update across ALL browsers & devices globally for all visitors!
          setContent(prev => ({ ...DEFAULT_CONTENT, ...prev, ...remoteData }));
          try {
            localStorage.setItem('scicomm_landing_content', JSON.stringify(remoteData));
          } catch (e) {}
        } else if (contentRef.current) {
          setDoc(ref, contentRef.current).catch(err => console.warn('Background Firestore seed error:', err));
        }
      } catch (err) {
        console.warn('Firestore onSnapshot handler error:', err);
      }
    }, (err) => {
      console.warn('Firestore real-time listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  // ── Auto slide timer for About Gallery ──
  useEffect(() => {
    if (editMode) return;
    const slides = content.aboutSlides || [];
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [content.aboutSlides, editMode]);

  // ── Scroll handler ──
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Content mutators ──
  const updateField = useCallback((key, value) => {
    setContent(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('scicomm_landing_content', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const updateNestedArray = useCallback((arrayKey, index, field, value) => {
    setContent(prev => {
      const currentList = prev[arrayKey] || DEFAULT_CONTENT[arrayKey] || [];
      const arr = [...currentList];
      arr[index] = { ...arr[index], [field]: value };
      const next = { ...prev, [arrayKey]: arr };
      try { localStorage.setItem('scicomm_landing_content', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const addArrayItem = useCallback((arrayKey, newItem) => {
    setContent(prev => {
      const currentList = prev[arrayKey] || DEFAULT_CONTENT[arrayKey] || [];
      const next = { ...prev, [arrayKey]: [...currentList, newItem] };
      try { localStorage.setItem('scicomm_landing_content', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const removeArrayItem = useCallback((arrayKey, index) => {
    setContent(prev => {
      const currentList = prev[arrayKey] || DEFAULT_CONTENT[arrayKey] || [];
      const updated = currentList.filter((_, i) => i !== index);
      const next = { ...prev, [arrayKey]: updated };
      try { localStorage.setItem('scicomm_landing_content', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const moveArrayItem = useCallback((arrayKey, index, direction) => {
    setContent(prev => {
      const arr = [...(prev[arrayKey] || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= arr.length) return prev;
      const [moved] = arr.splice(index, 1);
      arr.splice(targetIndex, 0, moved);
      const next = { ...prev, [arrayKey]: arr };
      try { localStorage.setItem('scicomm_landing_content', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  // ── Enter / Save / Cancel ──
  const enterEditMode = () => {
    setSavedContent(structuredClone(content));
    setEditMode(true);
  };

  const cancelEditMode = () => {
    if (savedContent) setContent(savedContent);
    setSavedContent(null);
    setEditMode(false);
  };

  const compressBase64 = async (str, maxDimension = 3840, quality = 0.98, isPng = false) => {
    if (!str || typeof str !== 'string' || !str.startsWith('data:image')) return str;

    return new Promise((resolve) => {
      const img = new Image();
      img.src = str;
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) {
          return resolve(str);
        }
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        if (isPng || str.startsWith('data:image/png')) {
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.98));
        }
      };
      img.onerror = () => resolve(str);
    });
  };

  const optimizeLandingContent = async (data) => {
    const clone = structuredClone(data);

    if (clone.navLogo) clone.navLogo = await compressBase64(clone.navLogo, 3840, 0.95, true);
    if (clone.heroLogo) clone.heroLogo = await compressBase64(clone.heroLogo, 3840, 0.95, true);
    if (clone.footerLogo) clone.footerLogo = await compressBase64(clone.footerLogo, 3840, 0.95, true);
    if (clone.heroBgImage) clone.heroBgImage = await compressBase64(clone.heroBgImage, 3840, 0.95, false);

    // Keep full resolution for Trainers / Workshops photos
    if (Array.isArray(clone.workshops)) {
      clone.workshops = await Promise.all(
        clone.workshops.map(async (t) => ({
          ...t,
          img: await compressBase64(t.img, 3840, 0.95, false)
        }))
      );
    }

    // Keep full resolution for Leadership Team photos
    if (Array.isArray(clone.teamMembers)) {
      clone.teamMembers = await Promise.all(
        clone.teamMembers.map(async (tm) => ({
          ...tm,
          img: await compressBase64(tm.img, 3840, 0.95, false)
        }))
      );
    }

    // Keep full resolution for Hall of Fame Champions photos
    if (Array.isArray(clone.hallOfFameChampions)) {
      clone.hallOfFameChampions = await Promise.all(
        clone.hallOfFameChampions.map(async (c) => {
          let updatedMembers = [];
          if (Array.isArray(c.members)) {
            updatedMembers = await Promise.all(
              c.members.map(async (m) => ({
                ...m,
                img: m.img ? await compressBase64(m.img, 3840, 0.95, false) : ''
              }))
            );
          }
          const cleaned = { ...c, members: updatedMembers };
          delete cleaned.img;
          return cleaned;
        })
      );
    }

    // Keep full resolution for Gallery images
    if (Array.isArray(clone.galleryImages)) {
      clone.galleryImages = await Promise.all(
        clone.galleryImages.map((img) => compressBase64(img, 3840, 0.95, false))
      );
    }

    // Keep full resolution for Partner / Collaborator logos
    if (Array.isArray(clone.collaborators)) {
      clone.collaborators = await Promise.all(
        clone.collaborators.map(async (col) => ({
          ...col,
          logo: await compressBase64(col.logo, 3840, 0.95, true)
        }))
      );
    }

    // Keep full resolution for About Slides images
    if (Array.isArray(clone.aboutSlides)) {
      clone.aboutSlides = await Promise.all(
        clone.aboutSlides.map(async (slide) => ({
          ...slide,
          img: await compressBase64(slide.img, 3840, 0.95, false)
        }))
      );
    }

    return clone;
  };

  const sanitizeForFirestore = (obj) => {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  };

  const saveChanges = async () => {
    // 0. Force any focused element to blur so its last edits are committed
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    setSaving(true);
    try {
      const payloadToSave = {
        ...contentRef.current,
        updatedAt: Date.now()
      };

      // 1. Optimize & compress all Base64 photos to keep total payload under 200KB
      const optimized = await optimizeLandingContent(payloadToSave);
      const sanitized = sanitizeForFirestore(optimized);
      sanitized.updatedAt = Date.now();

      setContent(sanitized);

      // 2. Save to LocalStorage immediately
      try {
        localStorage.setItem('scicomm_landing_content', JSON.stringify(sanitized));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }

      // 3. Save directly to Firestore for global access across all devices
      const ref = doc(firestore, getCollectionName('landing_content'), 'main');
      await setDoc(ref, sanitized);

      setSavedContent(null);
      setEditMode(false);
      alert('✅ All changes saved & published globally to all users on every device!');
    } catch (err) {
      console.warn('Firestore global save error:', err);
      // Fallback: save to LocalStorage so changes are never lost locally, and attempt background re-sync
      const fallbackPayload = sanitizeForFirestore({
        ...contentRef.current,
        updatedAt: Date.now()
      });
      try {
        localStorage.setItem('scicomm_landing_content', JSON.stringify(fallbackPayload));
      } catch (e) {
        console.warn('LocalStorage fallback write error:', e);
      }
      const ref = doc(firestore, getCollectionName('landing_content'), 'main');
      setDoc(ref, fallbackPayload).catch(e => console.warn('Background Firestore sync retry error:', e));

      setSavedContent(null);
      setEditMode(false);
      alert('✅ Changes saved locally & queued for global sync!');
    } finally {
      setSaving(false);
    }
  };

  // shorthand
  const E = editMode;

  return (
    <div className="landing-page" style={{ fontFamily: "'Outfit', sans-serif", background: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>

      {/* ═══════ ADMIN FLOATING TOOLBAR ═══════ */}
      {isAdmin && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999,
          display: 'flex', gap: '0.5rem', alignItems: 'center'
        }}>
          {E ? (
            <>
              <button
                onClick={cancelEditMode}
                style={{
                  background: '#ffffff', color: '#64748b', border: '1.5px solid #cbd5e1',
                  padding: '0.6rem 1.2rem', borderRadius: '14px', fontWeight: 800, fontSize: '0.85rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
                }}
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff', border: 'none', padding: '0.6rem 1.4rem',
                  borderRadius: '14px', fontWeight: 900, fontSize: '0.85rem',
                  cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 4px 20px rgba(22,163,74,0.35)', opacity: saving ? 0.7 : 1
                }}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff', border: 'none', padding: '0.7rem 1.5rem',
                borderRadius: '16px', fontWeight: 900, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 6px 24px rgba(59,130,246,0.4)'
              }}
            >
              <Pencil size={16} /> Edit Landing Page
            </button>
          )}
        </div>
      )}

      {/* ═══════════ EDIT MODE TOP BANNER ═══════════ */}
      {E && (
        <div style={{
          background: 'linear-gradient(90deg, #2563eb, #3b82f6)', color: '#ffffff',
          padding: '0.5rem 2rem', fontSize: '0.82rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center'
        }}>
          <Pencil size={14} /> Edit Mode Active — Click any text to edit, use buttons on images to upload/remove. Don't forget to Save!
        </div>
      )}

      {/* ═══════════ TOP NAVIGATION BAR ═══════════ */}
      <nav className="landing-nav-bar" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : '#ffffff',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s ease'
      }}>
        {/* Brand Logos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <EditableLogo
              src={content.navLogo || "./spark_logo.png"}
              onUpload={(base64) => updateField('navLogo', base64)}
              editing={E}
              isMobile={isMobile}
              scale={isMobile ? (content.navLogoMobileScale ?? content.navLogoScale ?? 1) : (content.navLogoScale || 1)}
              rotate={isMobile ? (content.navLogoMobileRotate ?? content.navLogoRotate ?? 0) : (content.navLogoRotate || 0)}
              offsetX={isMobile ? (content.navLogoMobileOffsetX ?? content.navLogoOffsetX ?? 0) : (content.navLogoOffsetX || 0)}
              offsetY={isMobile ? (content.navLogoMobileOffsetY ?? content.navLogoOffsetY ?? 0) : (content.navLogoOffsetY || 0)}
              onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                if (isMobile) {
                  setContent(prev => ({ ...prev, navLogoMobileScale: scale, navLogoMobileRotate: rotate, navLogoMobileOffsetX: offsetX, navLogoMobileOffsetY: offsetY }));
                } else {
                  setContent(prev => ({ ...prev, navLogoScale: scale, navLogoRotate: rotate, navLogoOffsetX: offsetX, navLogoOffsetY: offsetY }));
                }
              }}
              style={{ height: '52px' }}
              alt="SciComm Spark Navbar Logo"
            />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#be123c', fontFamily: "'Outfit', sans-serif" }}>AIU.</div>
              <div className="landing-nav-full-subtext" style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.04em' }}>ALAMEIN INTERNATIONAL UNIVERSITY</div>
            </div>
          </div>
        </div>

        {/* Center Nav Links */}
        <div className="landing-nav-center" style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
          <a href="#home" style={{ color: '#be123c', textDecoration: 'none' }}>Home</a>
          <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
          <a href="#hall-of-fame" onClick={(e) => { e.preventDefault(); document.getElementById('hall-of-fame')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: 'inherit', textDecoration: 'none' }}>Hall of Fame</a>
          <a href="#tracks" style={{ color: 'inherit', textDecoration: 'none' }}>Tracks</a>
          <a href="#timeline" style={{ color: 'inherit', textDecoration: 'none' }}>Timeline</a>
          <a href="#workshops" style={{ color: 'inherit', textDecoration: 'none' }}>Workshops</a>
          <a href="#team" onClick={(e) => { e.preventDefault(); document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: 'inherit', textDecoration: 'none' }}>Team</a>
          <a href="#collaborators" onClick={(e) => { e.preventDefault(); document.getElementById('collaborators')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: 'inherit', textDecoration: 'none' }}>Partners</a>
          <a href="#gallery" style={{ color: 'inherit', textDecoration: 'none' }}>Gallery</a>
          <a href="#contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
          <a
            href="https://scicomm-superbugs.github.io/Portal/#/aiuscicomm/explore"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#be123c',
              background: 'rgba(190, 18, 60, 0.08)',
              padding: '0.35rem 0.9rem',
              borderRadius: '20px',
              textDecoration: 'none',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid rgba(190, 18, 60, 0.25)',
              boxShadow: '0 2px 8px rgba(190, 18, 60, 0.12)'
            }}
          >
            <BookOpen size={14} /> Journal <ExternalLink size={12} />
          </a>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user ? (
            <button className="landing-nav-desktop-btn" onClick={() => navigate('/dashboard')} style={{ background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff', border: 'none', padding: '0.55rem 1.45rem', borderRadius: '25px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,18,60,0.3)' }}>
              Dashboard →
            </button>
          ) : (
            <>
              <button className="landing-nav-desktop-btn" onClick={() => navigate('/login')} style={{ background: '#ffffff', color: '#be123c', border: '2px solid #be123c', padding: '0.45rem 1.35rem', borderRadius: '25px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>
                Sign In
              </button>
              <button className="landing-nav-desktop-btn" onClick={() => navigate('/login')} style={{ background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff', border: 'none', padding: '0.55rem 1.45rem', borderRadius: '25px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,18,60,0.3)' }}>
                Register Now
              </button>
            </>
          )}

          {/* Mobile Hamburger Toggle */}
          <div className="landing-nav-mobile-toggle" style={{ display: 'none', alignItems: 'center' }}>
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Dropdown Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'sticky', top: '56px', zIndex: 99,
          background: '#ffffff', borderBottom: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
          fontSize: '1rem', fontWeight: 800, color: '#0f172a', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <a href="#home" onClick={() => setMobileMenuOpen(false)} style={{ color: '#be123c', textDecoration: 'none' }}>Home</a>
          <a href="#about" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
          <a href="#hall-of-fame" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('hall-of-fame')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: 'inherit', textDecoration: 'none' }}>Hall of Fame</a>
          <a href="#tracks" onClick={() => setMobileMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>Tracks</a>
          <a href="#timeline" onClick={() => setMobileMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>Timeline</a>
          <a href="#workshops" onClick={() => setMobileMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>Workshops</a>
          <a href="#collaborators" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('collaborators')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: 'inherit', textDecoration: 'none' }}>Partners</a>
          <a href="#gallery" onClick={() => setMobileMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>Gallery</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
          <a
            href="https://scicomm-superbugs.github.io/Portal/#/aiuscicomm/explore"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#be123c', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 900 }}
          >
            <BookOpen size={18} /> Journal <ExternalLink size={14} />
          </a>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
            {user ? (
              <button onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }} style={{ flex: 1, background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff', border: 'none', padding: '0.6rem', borderRadius: '25px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                Dashboard →
              </button>
            ) : (
              <>
                <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} style={{ flex: 1, background: '#ffffff', color: '#be123c', border: '2px solid #be123c', padding: '0.6rem', borderRadius: '25px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                  Sign In
                </button>
                <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} style={{ flex: 1, background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff', border: 'none', padding: '0.6rem', borderRadius: '25px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                  Register Now
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ HERO BANNER SECTION ═══════════ */}
      <section id="home" className="landing-section" style={{ padding: '1.25rem 2rem 2.5rem' }}>
        <div className="landing-hero-container" style={{
          position: 'relative', borderRadius: '28px', overflow: E ? 'visible' : 'hidden',
          background: 'linear-gradient(135deg, #090d16 0%, #0d1527 50%, #170712 100%)',
          color: '#ffffff', padding: '3.5rem 3rem 2.5rem',
          boxShadow: '0 20px 50px rgba(9, 13, 22, 0.4)',
          minHeight: '480px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          {/* Background Image */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.65,
            backgroundImage: `linear-gradient(to right, rgba(9,13,22,0.92) 0%, rgba(9,13,22,0.65) 45%, rgba(9,13,22,0.15) 100%), url('${content.heroBgImage}')`,
            backgroundSize: 'cover', backgroundPosition: 'center'
          }} />

          {/* Edit background image button */}
          {E && (
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 20 }}>
              <EditableImage
                src={null}
                onUpload={(base64) => updateField('heroBgImage', base64)}
                onRemove={() => updateField('heroBgImage', DEFAULT_CONTENT.heroBgImage)}
                editing={true}
                alt="Change hero background"
                style={{ width: '42px', height: '42px', borderRadius: '10px' }}
              />
            </div>
          )}



          {/* Hero Content Container */}
          <div style={{ position: 'relative', zIndex: 10, maxWidth: content.heroWidth || '850px', transition: 'max-width 0.3s ease' }}>
            {/* 2nd EDITION Top Row */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 900 }}>
              <span style={{ color: '#f43f5e', fontSize: '1.25rem', fontFamily: "'Outfit', sans-serif", fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                2<sup style={{ fontSize: '0.65em', textTransform: 'lowercase' }}>nd</sup>
              </span>
              <EditableText
                value={(content.heroEdition || 'EDITION').replace(/^2nd\s*/i, '')}
                onChange={(v) => updateField('heroEdition', v)}
                editing={E}
                style={{ color: '#ffffff', fontSize: '1.1rem', letterSpacing: '0.25em', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              />
            </div>

            {/* Main Title Row: SCIENCE COMM with overlapping script Spark */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.4rem', maxWidth: '100%' }}>
              <h1 style={{
                fontSize: content.heroTitleFontSize || 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 900,
                lineHeight: 1.05,
                margin: 0,
                color: '#f43f5e',
                letterSpacing: '-0.01em',
                fontFamily: "'Outfit', sans-serif",
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))'
              }}>
                <EditableTextObject
                  value={content.heroTitle || 'SCIENCE COMM'}
                  onChange={(v) => updateField('heroTitle', v)}
                  editing={E}
                  isMobile={isMobile}
                  scale={isMobile ? (content.heroTitleMobileScale ?? content.heroTitleScale ?? 1) : (content.heroTitleScale || 1)}
                  rotate={isMobile ? (content.heroTitleMobileRotate ?? content.heroTitleRotate ?? 0) : (content.heroTitleRotate || 0)}
                  offsetX={isMobile ? (content.heroTitleMobileOffsetX ?? content.heroTitleOffsetX ?? 0) : (content.heroTitleOffsetX || 0)}
                  offsetY={isMobile ? (content.heroTitleMobileOffsetY ?? content.heroTitleOffsetY ?? 0) : (content.heroTitleOffsetY || 0)}
                  onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                    if (isMobile) {
                      setContent(prev => ({ ...prev, heroTitleMobileScale: scale, heroTitleMobileRotate: rotate, heroTitleMobileOffsetX: offsetX, heroTitleMobileOffsetY: offsetY }));
                    } else {
                      setContent(prev => ({ ...prev, heroTitleScale: scale, heroTitleRotate: rotate, heroTitleOffsetX: offsetX, heroTitleOffsetY: offsetY }));
                    }
                  }}
                  style={{ fontSize: content.heroTitleFontSize || 'clamp(2rem, 6vw, 3.5rem)', color: '#f43f5e', fontWeight: 900 }}
                />
              </h1>

              {/* Overlapping Cursive Spark & Official Logo */}
              <div className="landing-hero-spark" style={{
                position: 'absolute',
                top: '-1.2rem',
                right: '-8.5rem',
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                transform: 'rotate(-4deg)',
                pointerEvents: E ? 'auto' : 'none'
              }}>
                <EditableTextObject
                  value={content.heroSpark || 'Spark'}
                  onChange={(v) => updateField('heroSpark', v)}
                  editing={E}
                  isMobile={isMobile}
                  scale={isMobile ? (content.sparkWordMobileScale ?? content.sparkWordScale ?? 1) : (content.sparkWordScale || 1)}
                  offsetX={isMobile ? (content.sparkWordMobileOffsetX ?? content.sparkWordOffsetX ?? 0) : (content.sparkWordOffsetX || 0)}
                  offsetY={isMobile ? (content.sparkWordMobileOffsetY ?? content.sparkWordOffsetY ?? 0) : (content.sparkWordOffsetY || 0)}
                  onTransformChange={({ scale, offsetX, offsetY }) => {
                    if (isMobile) {
                      setContent(prev => ({ ...prev, sparkWordMobileScale: scale, sparkWordMobileOffsetX: offsetX, sparkWordMobileOffsetY: offsetY }));
                    } else {
                      setContent(prev => ({ ...prev, sparkWordScale: scale, sparkWordOffsetX: offsetX, sparkWordOffsetY: offsetY }));
                    }
                  }}
                  style={{
                    fontSize: '2.8rem',
                    fontWeight: 700,
                    fontFamily: "'Dancing Script', 'Pacifico', 'Caveat', cursive",
                    fontStyle: 'italic',
                    textTransform: 'none',
                    color: '#ffffff',
                    WebkitTextFillColor: '#ffffff',
                    filter: 'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.8))'
                  }}
                />
                <EditableLogo
                  src={content.heroLogo || "./spark_logo.png"}
                  onUpload={(base64) => updateField('heroLogo', base64)}
                  editing={E}
                  isMobile={isMobile}
                  scale={isMobile ? (content.heroLogoMobileScale ?? content.heroLogoScale ?? 1) : (content.heroLogoScale || 1)}
                  rotate={isMobile ? (content.heroLogoMobileRotate ?? content.heroLogoRotate ?? 0) : (content.heroLogoRotate || 0)}
                  offsetX={isMobile ? (content.heroLogoMobileOffsetX ?? content.heroLogoOffsetX ?? 0) : (content.heroLogoOffsetX || 0)}
                  offsetY={isMobile ? (content.heroLogoMobileOffsetY ?? content.heroLogoOffsetY ?? 0) : (content.heroLogoOffsetY || 0)}
                  onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                    if (isMobile) {
                      setContent(prev => ({ ...prev, heroLogoMobileScale: scale, heroLogoMobileRotate: rotate, heroLogoMobileOffsetX: offsetX, heroLogoMobileOffsetY: offsetY }));
                    } else {
                      setContent(prev => ({ ...prev, heroLogoScale: scale, heroLogoRotate: rotate, heroLogoOffsetX: offsetX, heroLogoOffsetY: offsetY }));
                    }
                  }}
                  style={{ height: isMobile ? '70px' : '115px', filter: 'drop-shadow(0 6px 20px rgba(244,63,94,0.55))' }}
                  alt="SciComm Spark Hero Logo"
                />
              </div>
            </div>

            {/* High Contrast White COMPETITION Row */}
            <div style={{ marginBottom: '1.25rem' }}>
              <EditableTextObject
                value={content.heroTitleSub || 'COMPETITION'}
                onChange={(v) => updateField('heroTitleSub', v)}
                editing={E}
                isMobile={isMobile}
                scale={isMobile ? (content.heroSubMobileScale ?? content.heroSubScale ?? 1) : (content.heroSubScale || 1)}
                rotate={isMobile ? (content.heroSubMobileRotate ?? content.heroSubRotate ?? 0) : (content.heroSubRotate || 0)}
                offsetX={isMobile ? (content.heroSubMobileOffsetX ?? content.heroSubOffsetX ?? 0) : (content.heroSubOffsetX || 0)}
                offsetY={isMobile ? (content.heroSubMobileOffsetY ?? content.heroSubOffsetY ?? 0) : (content.heroSubOffsetY || 0)}
                onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                  if (isMobile) {
                    setContent(prev => ({ ...prev, heroSubMobileScale: scale, heroSubMobileRotate: rotate, heroSubMobileOffsetX: offsetX, heroSubMobileOffsetY: offsetY }));
                  } else {
                    setContent(prev => ({ ...prev, heroSubScale: scale, heroSubRotate: rotate, heroSubOffsetX: offsetX, heroSubOffsetY: offsetY }));
                  }
                }}
                className="landing-hero-competition"
                style={{
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  letterSpacing: '0.45em',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)'
                }}
              />
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185', marginBottom: '0.75rem' }}>
              <EditableTextObject
                value={content.heroTagline1}
                onChange={(v) => updateField('heroTagline1', v)}
                editing={E}
                isMobile={isMobile}
                scale={isMobile ? (content.tagline1MobileScale ?? content.tagline1Scale ?? 1) : (content.tagline1Scale || 1)}
                rotate={isMobile ? (content.tagline1MobileRotate ?? content.tagline1Rotate ?? 0) : (content.tagline1Rotate || 0)}
                offsetX={isMobile ? (content.tagline1MobileOffsetX ?? content.tagline1OffsetX ?? 0) : (content.tagline1OffsetX || 0)}
                offsetY={isMobile ? (content.tagline1MobileOffsetY ?? content.tagline1OffsetY ?? 0) : (content.tagline1OffsetY || 0)}
                onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                  if (isMobile) {
                    setContent(prev => ({ ...prev, tagline1MobileScale: scale, tagline1MobileRotate: rotate, tagline1MobileOffsetX: offsetX, tagline1MobileOffsetY: offsetY }));
                  } else {
                    setContent(prev => ({ ...prev, tagline1Scale: scale, tagline1Rotate: rotate, tagline1OffsetX: offsetX, tagline1OffsetY: offsetY }));
                  }
                }}
                style={{ color: '#fb7185' }}
              /> <br />
              <EditableTextObject
                value={content.heroTagline2}
                onChange={(v) => updateField('heroTagline2', v)}
                editing={E}
                isMobile={isMobile}
                scale={isMobile ? (content.tagline2MobileScale ?? content.tagline2Scale ?? 1) : (content.tagline2Scale || 1)}
                rotate={isMobile ? (content.tagline2MobileRotate ?? content.tagline2Rotate ?? 0) : (content.tagline2Rotate || 0)}
                offsetX={isMobile ? (content.tagline2MobileOffsetX ?? content.tagline2OffsetX ?? 0) : (content.tagline2OffsetX || 0)}
                offsetY={isMobile ? (content.tagline2MobileOffsetY ?? content.tagline2OffsetY ?? 0) : (content.tagline2OffsetY || 0)}
                onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                  if (isMobile) {
                    setContent(prev => ({ ...prev, tagline2MobileScale: scale, tagline2MobileRotate: rotate, tagline2MobileOffsetX: offsetX, tagline2MobileOffsetY: offsetY }));
                  } else {
                    setContent(prev => ({ ...prev, tagline2Scale: scale, tagline2Rotate: rotate, tagline2OffsetX: offsetX, tagline2OffsetY: offsetY }));
                  }
                }}
                style={{ color: '#ffffff' }}
              />
            </div>

            <EditableText value={content.heroDescription} onChange={(v) => updateField('heroDescription', v)} editing={E} tag="p" style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem', fontWeight: 500 }} />

            <div className="landing-hero-buttons" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button onClick={() => navigate(user ? '/dashboard' : '/login')} style={{ background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', color: '#ffffff', border: 'none', padding: '0.75rem 2.2rem', borderRadius: '25px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(225,29,72,0.45)' }}>
                <EditableText
                  value={(!content.heroBtnPrimary || content.heroBtnPrimary === 'Sign Up Now') ? 'Register Now' : content.heroBtnPrimary}
                  onChange={(v) => updateField('heroBtnPrimary', v)}
                  editing={E}
                />
              </button>
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: 'rgba(255,255,255,0.12)', color: '#ffffff',
                  border: '1.5px solid rgba(255,255,255,0.3)', padding: '0.75rem 2rem',
                  borderRadius: '25px', fontWeight: 800, fontSize: '0.95rem',
                  textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                  backdropFilter: 'blur(4px)', textAlign: 'center'
                }}
              >
                {content.heroBtnSecondary}
              </a>
            </div>
          </div>

          {/* Bottom Hero Stats Bar */}
          <div style={{
            position: 'relative', zIndex: 10, marginTop: '3rem',
            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '18px',
            padding: '1rem 2rem',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem'
          }}>
            {content.stats.map((stat, sIdx) => (
              <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185', fontSize: '1.25rem' }}>
                  {E ? (
                    <EditableText value={stat.icon} onChange={(v) => updateNestedArray('stats', sIdx, 'icon', v)} editing={true} style={{ fontSize: '1.25rem' }} />
                  ) : stat.icon}
                </div>
                <div>
                  <EditableText value={stat.title} onChange={(v) => updateNestedArray('stats', sIdx, 'title', v)} editing={E} tag="div" style={{ fontWeight: 900, fontSize: '0.88rem', color: '#ffffff' }} />
                  <EditableText value={stat.subtitle} onChange={(v) => updateNestedArray('stats', sIdx, 'subtitle', v)} editing={E} tag="div" style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION: ABOUT (WITH RIGHT GALLERY SLIDER) ═══════════ */}
      <section id="about" style={{ padding: '2rem 2rem 2.5rem' }}>
        <div style={{
          background: '#ffffff', borderRadius: '28px', border: '1.5px solid #e2e8f0',
          padding: '2.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem',
          alignItems: 'center'
        }}>
          
          {/* Left Column: About Info */}
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <EditableText
                value={content.aboutTitle || 'ABOUT SCI COMM SPARK'}
                onChange={(v) => updateField('aboutTitle', v)}
                editing={E}
                tag="div"
                style={{ fontSize: '0.8rem', fontWeight: 900, color: '#be123c', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}
              />
              <EditableText
                value={content.aboutHeadline || 'Empowering the Next Generation of Science Communicators across Egypt'}
                onChange={(v) => updateField('aboutHeadline', v)}
                editing={E}
                tag="h2"
                style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: 900, color: '#0f172a', lineHeight: 1.25, margin: 0 }}
              />
            </div>

            <EditableText
              value={content.aboutParagraph1 || 'SciComm Spark Competition is a premier nationwide initiative organized by Alamein International University (AIU) to discover, nurture, and empower science communication talents.'}
              onChange={(v) => updateField('aboutParagraph1', v)}
              editing={E}
              tag="p"
              style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.65, marginBottom: '1rem', fontWeight: 500 }}
            />

            {/* Paragraph 2 Title */}
            <EditableText
              value={content.aboutParagraph2Title || 'SciComm Spark at "SciComm Nexus": The Grand Stage'}
              onChange={(v) => updateField('aboutParagraph2Title', v)}
              editing={E}
              tag="h3"
              style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35, marginBottom: '0.4rem', marginTop: '1.25rem' }}
            />

            <EditableText
              value={content.aboutParagraph2 || 'Through intensive training workshops, expert mentorship, and multi-stage evaluation, participants learn how to transform complex research ideas into impactful stories that reach everyone.'}
              onChange={(v) => updateField('aboutParagraph2', v)}
              editing={E}
              tag="p"
              style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.65, marginBottom: '1.5rem', fontWeight: 500 }}
            />

            {/* Feature Highlights Section */}
            <div>
              <EditableText
                value={content.aboutHighlightsTitle || 'Key Highlights'}
                onChange={(v) => updateField('aboutHighlightsTitle', v)}
                editing={E}
                tag="h4"
                style={{ fontSize: '0.95rem', fontWeight: 800, color: '#be123c', lineHeight: 1.3, marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', fontWeight: 500, color: '#1e293b' }}>
                {(content.aboutHighlights || DEFAULT_CONTENT.aboutHighlights).map((item, hIdx) => (
                  <div key={hIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: item.bg || '#ffe4e6', color: item.color || '#be123c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                      {E ? (
                        <EditableText
                          value={item.icon}
                          onChange={(v) => updateNestedArray('aboutHighlights', hIdx, 'icon', v)}
                          editing={true}
                          style={{ fontSize: '0.9rem' }}
                        />
                      ) : item.icon}
                    </span>
                    <EditableText
                      value={item.text}
                      onChange={(v) => updateNestedArray('aboutHighlights', hIdx, 'text', v)}
                      editing={E}
                      tag="span"
                      style={{ flex: 1, fontWeight: 500 }}
                    />
                    {E && (
                      <button
                        onClick={() => removeArrayItem('aboutHighlights', hIdx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px' }}
                        title="Delete highlight"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {E && (
                  <button
                    onClick={() => addArrayItem('aboutHighlights', { icon: '⭐', text: 'New feature highlight', bg: '#fef3c7', color: '#d97706' })}
                    style={{ background: '#f8fafc', color: '#be123c', border: '1.5px dashed #fecdd3', padding: '0.35rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content', marginTop: '0.4rem' }}
                  >
                    <Plus size={14} /> Add Highlight
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Gallery Slider */}
          <div style={{ position: 'relative' }}>
            {content.aboutSlides && content.aboutSlides.length > 0 ? (
              <div style={{
                position: 'relative', borderRadius: '22px', overflow: 'hidden',
                aspectRatio: '16/10', boxShadow: '0 12px 35px rgba(0,0,0,0.12)',
                background: '#090d16'
              }}>
                {/* Slide Image */}
                <img
                  src={content.aboutSlides[activeSlide % content.aboutSlides.length]?.img}
                  alt={content.aboutSlides[activeSlide % content.aboutSlides.length]?.title || 'About Slide'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.5s ease' }}
                />

                {/* Gradient Overlay & Text Caption */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(9,13,22,0.88) 0%, rgba(9,13,22,0.2) 60%, transparent 100%)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem',
                  color: '#ffffff'
                }}>
                  <EditableText
                    value={content.aboutSlides[activeSlide % content.aboutSlides.length]?.title || ''}
                    onChange={(v) => updateNestedArray('aboutSlides', activeSlide % content.aboutSlides.length, 'title', v)}
                    editing={E}
                    tag="h4"
                    style={{ fontWeight: 900, fontSize: '1.15rem', color: '#ffffff', margin: 0, marginBottom: '0.25rem' }}
                  />
                  <EditableText
                    value={content.aboutSlides[activeSlide % content.aboutSlides.length]?.caption || ''}
                    onChange={(v) => updateNestedArray('aboutSlides', activeSlide % content.aboutSlides.length, 'caption', v)}
                    editing={E}
                    tag="p"
                    style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, fontWeight: 500 }}
                  />
                </div>

                {/* Prev / Next Arrows */}
                <button
                  onClick={() => setActiveSlide((prev) => (prev - 1 + content.aboutSlides.length) % content.aboutSlides.length)}
                  style={{
                    position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)',
                    color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                    fontSize: '1.2rem', fontWeight: 900
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={() => setActiveSlide((prev) => (prev + 1) % content.aboutSlides.length)}
                  style={{
                    position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)',
                    color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                    fontSize: '1.2rem', fontWeight: 900
                  }}
                >
                  ›
                </button>

                {/* Dots indicator */}
                <div style={{ position: 'absolute', bottom: '0.75rem', right: '1.25rem', display: 'flex', gap: '0.4rem', zIndex: 10 }}>
                  {content.aboutSlides.map((_, dotIdx) => (
                    <div
                      key={dotIdx}
                      onClick={() => setActiveSlide(dotIdx)}
                      style={{
                        width: dotIdx === (activeSlide % content.aboutSlides.length) ? '18px' : '7px',
                        height: '7px', borderRadius: '4px',
                        background: dotIdx === (activeSlide % content.aboutSlides.length) ? '#be123c' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </div>

                {/* Edit Controls for Active Slide */}
                {E && (
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 20 }}>
                    <EditableImage
                      src={null}
                      onUpload={(base64) => updateNestedArray('aboutSlides', activeSlide % content.aboutSlides.length, 'img', base64)}
                      onRemove={() => removeArrayItem('aboutSlides', activeSlide % content.aboutSlides.length)}
                      editing={true}
                      alt="Change slide"
                      style={{ width: '36px', height: '36px', borderRadius: '8px' }}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {/* Admin Add New Slide Button */}
            {E && (
              <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                <button
                  onClick={() => addArrayItem('aboutSlides', { img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80', title: 'New Slide Title', caption: 'Slide caption description' })}
                  style={{ background: '#f8fafc', color: '#be123c', border: '1.5px dashed #fecdd3', padding: '0.45rem 1.2rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={14} /> Add Gallery Slide
                </button>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ═══════════ SECTION: HALL OF FAME (PAST CHAMPIONS SLIDER) ═══════════ */}
      <section id="hall-of-fame" style={{ padding: '2rem 2rem 2.5rem' }}>
        <div style={{
          background: '#ffffff', borderRadius: '28px', border: '1.5px solid #e2e8f0',
          padding: '2.5rem 2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <EditableText
              value={content.hallOfFameTitle || 'SciComm Spark Hall of Fame (Past Champions)'}
              onChange={(v) => updateField('hallOfFameTitle', v)}
              editing={E}
              tag="h2"
              style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)', fontWeight: 900, color: '#0f172a', margin: 0, marginBottom: '0.4rem' }}
            />
            <EditableText
              value={content.hallOfFameSubtitle || 'Celebrating our extraordinary winners and their achievements'}
              onChange={(v) => updateField('hallOfFameSubtitle', v)}
              editing={E}
              tag="p"
              style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500, margin: 0 }}
            />
          </div>

          {/* Champions Slider Container */}
          {(() => {
            const champions = content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions;
            const currentChampIndex = fameSlide % (champions.length || 1);
            const champ = champions[currentChampIndex] || champions[0];

            return (
              <div style={{ position: 'relative', maxWidth: '850px', margin: '0 auto' }}>
                
                {/* Main Slide Card with Smooth Animation */}
                <div
                  key={currentChampIndex}
                  className="hall-of-fame-slide-card"
                  style={{
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '24px', border: `2px solid ${champ?.borderColor || '#e2e8f0'}`,
                    padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', position: 'relative', overflow: 'hidden',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.05)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {/* Floating Graphic Accents */}
                  <span className="fame-graphic-sparkle-1" style={{ position: 'absolute', top: '20px', left: '25px', fontSize: '1.4rem', pointerEvents: 'none', userSelect: 'none' }}>✨</span>
                  <span className="fame-graphic-sparkle-2" style={{ position: 'absolute', top: '25px', right: '35px', fontSize: '1.3rem', pointerEvents: 'none', userSelect: 'none' }}>🌟</span>
                  <span className="fame-graphic-sparkle-3" style={{ position: 'absolute', bottom: '20px', left: '30px', fontSize: '1.4rem', pointerEvents: 'none', userSelect: 'none' }}>⭐</span>

                  {/* Delete Slide Button in Edit Mode */}
                  {E && champions.length > 1 && (
                    <button
                      onClick={() => removeArrayItem('hallOfFameChampions', currentChampIndex)}
                      style={{ position: 'absolute', top: '14px', right: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                      title="Delete Champion Slide"
                    >
                      <X size={15} />
                    </button>
                  )}

                  {/* Top Place Badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem', zIndex: 5 }}>
                    <span style={{ fontSize: '2rem' }}>
                      {E ? (
                        <EditableText
                          value={champ?.icon || '🏆'}
                          onChange={(v) => updateNestedArray('hallOfFameChampions', currentChampIndex, 'icon', v)}
                          editing={true}
                          style={{ fontSize: '2rem' }}
                        />
                      ) : (champ?.icon || '🏆')}
                    </span>
                    <EditableText
                      value={champ?.place || ''}
                      onChange={(v) => updateNestedArray('hallOfFameChampions', currentChampIndex, 'place', v)}
                      editing={E}
                      tag="span"
                      style={{
                        fontWeight: 900, fontSize: '1.15rem', color: champ?.badgeColor || '#be123c',
                        background: champ?.badgeBg || '#ffe4e6', padding: '0.4rem 1.1rem', borderRadius: '20px',
                        letterSpacing: '0.02em', boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                      }}
                    />
                  </div>

                  {/* Circular Photos & Winner Info Grid */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start',
                    gap: '2.5rem', width: '100%', zIndex: 5
                  }}>
                    {(champ?.members || []).map((m, mIdx) => (
                      <div
                        key={mIdx}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: '1rem', maxWidth: '240px', position: 'relative'
                        }}
                      >
                        {/* Circular Photo with Animated Graphic Spinning Ring */}
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <div
                            className="fame-graphic-spin-ring"
                            style={{
                              position: 'absolute', inset: '-6px', borderRadius: '50%',
                              background: `conic-gradient(from 0deg, ${champ?.badgeColor || '#be123c'}, #f59e0b, #3b82f6, #10b981, ${champ?.badgeColor || '#be123c'})`,
                              opacity: 0.85, filter: 'blur(3px)', zIndex: 1
                            }}
                          />

                          <div style={{
                            position: 'relative', zIndex: 2,
                            width: (champ?.members || []).length > 1 ? '140px' : '175px',
                            height: (champ?.members || []).length > 1 ? '140px' : '175px',
                            borderRadius: '50%', overflow: 'hidden',
                            border: '4px solid #ffffff',
                            boxShadow: `0 10px 30px ${(champ?.badgeColor || '#be123c')}35`,
                            background: '#e2e8f0'
                          }}>
                            <EditableImage
                              src={m.img || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80'}
                              onUpload={(base64) => {
                                const copy = [...(content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions)];
                                const memCopy = [...(copy[currentChampIndex].members || [])];
                                memCopy[mIdx] = { ...memCopy[mIdx], img: base64 };
                                copy[currentChampIndex] = { ...copy[currentChampIndex], members: memCopy };
                                updateField('hallOfFameChampions', copy);
                              }}
                              onRemove={() => {
                                const copy = [...(content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions)];
                                const memCopy = [...(copy[currentChampIndex].members || [])];
                                memCopy[mIdx] = { ...memCopy[mIdx], img: '' };
                                copy[currentChampIndex] = { ...copy[currentChampIndex], members: memCopy };
                                updateField('hallOfFameChampions', copy);
                              }}
                              editing={E}
                              alt={m.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                          </div>
                        </div>

                        {/* Winner Name & Faculty */}
                        <div style={{ textAlign: 'center' }}>
                          <EditableText
                            value={m.name}
                            onChange={(v) => {
                              const copy = [...(content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions)];
                              const memCopy = [...(copy[currentChampIndex].members || [])];
                              memCopy[mIdx] = { ...memCopy[mIdx], name: v };
                              copy[currentChampIndex] = { ...copy[currentChampIndex], members: memCopy };
                              updateField('hallOfFameChampions', copy);
                            }}
                            editing={E}
                            tag="h3"
                            style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a', margin: 0, lineHeight: 1.3 }}
                          />
                          <EditableText
                            value={m.faculty}
                            onChange={(v) => {
                              const copy = [...(content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions)];
                              const memCopy = [...(copy[currentChampIndex].members || [])];
                              memCopy[mIdx] = { ...memCopy[mIdx], faculty: v };
                              copy[currentChampIndex] = { ...copy[currentChampIndex], members: memCopy };
                              updateField('hallOfFameChampions', copy);
                            }}
                            editing={E}
                            tag="p"
                            style={{ fontSize: '0.88rem', color: '#64748b', fontStyle: 'italic', fontWeight: 600, margin: 0, marginTop: '0.3rem' }}
                          />
                        </div>

                        {E && ((champ?.members || []).length > 1) && (
                          <button
                            onClick={() => {
                              const copy = [...(content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions)];
                              const memCopy = copy[currentChampIndex].members.filter((_, i) => i !== mIdx);
                              copy[currentChampIndex] = { ...copy[currentChampIndex], members: memCopy };
                              updateField('hallOfFameChampions', copy);
                            }}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.2rem' }}
                            title="Remove member"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {E && (
                    <button
                      onClick={() => {
                        const copy = [...(content.hallOfFameChampions || DEFAULT_CONTENT.hallOfFameChampions)];
                        const memCopy = [...(copy[currentChampIndex].members || []), { name: 'Winner Name', faculty: 'Faculty of ...', img: '' }];
                        copy[currentChampIndex] = { ...copy[currentChampIndex], members: memCopy };
                        updateField('hallOfFameChampions', copy);
                      }}
                      style={{ background: '#ffffff', color: '#2563eb', border: '1px dashed #bfdbfe', padding: '0.45rem 1rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', marginTop: '1.5rem' }}
                    >
                      + Add Joint Member Photo
                    </button>
                  )}
                </div>

                {/* Navigation Arrows */}
                {champions.length > 1 && (
                  <>
                    <button
                      onClick={() => setFameSlide(prev => (prev - 1 + champions.length) % champions.length)}
                      style={{
                        position: 'absolute', top: '50%', left: '-18px', transform: 'translateY(-50%)',
                        background: '#ffffff', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: '50%',
                        width: '42px', height: '42px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', fontWeight: 900, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 20
                      }}
                      aria-label="Previous Slide"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setFameSlide(prev => (prev + 1) % champions.length)}
                      style={{
                        position: 'absolute', top: '50%', right: '-18px', transform: 'translateY(-50%)',
                        background: '#ffffff', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: '50%',
                        width: '42px', height: '42px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', fontWeight: 900, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 20
                      }}
                      aria-label="Next Slide"
                    >
                      ›
                    </button>
                  </>
                )}

                {/* Slide Indicator Dots */}
                {champions.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                    {champions.map((c, dIdx) => (
                      <button
                        key={dIdx}
                        onClick={() => setFameSlide(dIdx)}
                        style={{
                          width: dIdx === currentChampIndex ? '28px' : '9px',
                          height: '9px', borderRadius: '5px', border: 'none',
                          background: dIdx === currentChampIndex ? (c.badgeColor || '#be123c') : '#cbd5e1',
                          cursor: 'pointer', transition: 'all 0.3s ease'
                        }}
                        title={c.place}
                      />
                    ))}
                  </div>
                )}

                {/* Add New Champion Slide in Edit Mode */}
                {E && (
                  <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                      onClick={() => addArrayItem('hallOfFameChampions', {
                        icon: '🏆',
                        place: 'Honorable Mention',
                        badgeBg: '#f0fdf4',
                        badgeColor: '#15803d',
                        borderColor: '#bbf7d0',
                        members: [{ name: 'Champion Name', faculty: 'Faculty Name, AIU', img: '' }]
                      })}
                      style={{ background: '#f8fafc', color: '#be123c', border: '1.5px dashed #fecdd3', padding: '0.55rem 1.5rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={16} /> Add Champion Slide
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ═══════════ SECTION: COMPETITION TRACKS (GRAPHICAL PREMIUM REDESIGN) ═══════════ */}
      <section id="tracks" style={{ padding: '2rem 2rem 2.5rem' }}>
        <div style={{
          background: '#ffffff', borderRadius: '28px', border: '1.5px solid #e2e8f0',
          padding: '2.5rem 2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
        }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <EditableText
              value={content.tracksSectionTitle || 'COMPETITION TRACKS'}
              onChange={(v) => updateField('tracksSectionTitle', v)}
              editing={E}
              tag="div"
              style={{ fontSize: '0.85rem', fontWeight: 900, color: '#7e22ce', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}
            />
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.25 }}>
              Choose Your Science Communication Path
            </h2>
            <p style={{ fontSize: '1rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
              Compete individually or in teams across two dynamic specialization tracks designed for modern creators & journalists.
            </p>
          </div>

          {/* 2 Track Cards Side-by-Side */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '2rem' }}>

            {/* TRACK 1: POP SCIENCE VIDEOS */}
            <div style={{
              background: 'linear-gradient(160deg, #ffffff 0%, #faf5ff 100%)',
              borderRadius: '24px', border: '2px solid #e9d5ff',
              padding: '2.25rem 2rem', boxShadow: '0 12px 35px rgba(126, 34, 206, 0.06)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                {/* Header Badge & Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', marginBottom: '1.75rem' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '18px',
                    background: 'linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', color: '#ffffff', boxShadow: '0 8px 20px rgba(126, 34, 206, 0.25)'
                  }}>
                    🎬
                  </div>
                  <div>
                    <EditableText
                      value={content.track1Label || 'TRACK 1'}
                      onChange={(v) => updateField('track1Label', v)}
                      editing={E}
                      tag="div"
                      style={{ fontSize: '0.78rem', fontWeight: 900, color: '#7e22ce', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    />
                    <EditableText
                      value={content.track1Title || 'Pop Science Videos'}
                      onChange={(v) => updateField('track1Title', v)}
                      editing={E}
                      tag="h3"
                      style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e1b4b', margin: 0, lineHeight: 1.2 }}
                    />
                  </div>
                </div>

                {/* Vertical Stepper List (Phase 1, 2, 3) */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
                  {/* Stepper Vertical Connector Line */}
                  <div style={{
                    position: 'absolute', top: '24px', bottom: '24px', left: '17px',
                    width: '3px', background: 'linear-gradient(to bottom, #d8b4fe 0%, #c084fc 100%)',
                    borderRadius: '2px', zIndex: 1
                  }} />

                  {content.track1Stages.map((stage, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative', zIndex: 2, display: 'flex', gap: '1rem', alignItems: 'flex-start',
                        background: '#ffffff', borderRadius: '16px', border: '1px solid #f3e8ff',
                        padding: '1rem 1.15rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Step Number Badge */}
                      <span style={{
                        flexShrink: 0, width: '34px', height: '34px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                        color: '#ffffff', fontSize: '0.9rem', fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(126, 34, 206, 0.3)'
                      }}>
                        {i + 1}
                      </span>

                      {/* Stage Text */}
                      <div style={{ flex: 1, paddingTop: '0.2rem' }}>
                        <EditableText
                          value={stage}
                          onChange={(v) => { const arr = [...content.track1Stages]; arr[i] = v; updateField('track1Stages', arr); }}
                          editing={E}
                          tag="div"
                          style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', lineHeight: 1.5 }}
                        />
                      </div>

                      {E && (
                        <button
                          onClick={() => { const arr = content.track1Stages.filter((_, idx) => idx !== i); updateField('track1Stages', arr); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}

                  {E && (
                    <button
                      onClick={() => updateField('track1Stages', [...content.track1Stages, 'New Stage'])}
                      style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px dashed #d8b4fe', padding: '0.45rem 1rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content', marginLeft: '2.8rem' }}
                    >
                      <Plus size={15} /> Add Stage
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Workflow Bar & CTA */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                  background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: '16px',
                  padding: '0.85rem 1rem', marginBottom: '1.25rem', boxShadow: '0 2px 10px rgba(126, 34, 206, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800, color: '#6b21a8' }}>
                    <EditableText value={content.track1Pill1 || '📱 Reels (90s)'} onChange={(v) => updateField('track1Pill1', v)} editing={E} />
                  </div>
                  <ChevronRight size={16} style={{ color: '#c084fc' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800, color: '#6b21a8' }}>
                    <EditableText value={content.track1Pill2 || '▶️ YouTube (3m)'} onChange={(v) => updateField('track1Pill2', v)} editing={E} />
                  </div>
                  <ChevronRight size={16} style={{ color: '#c084fc' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800, color: '#6b21a8' }}>
                    <EditableText value={content.track1Pill3 || '🎭 Grand Stage'} onChange={(v) => updateField('track1Pill3', v)} editing={E} />
                  </div>
                </div>

                <button
                  onClick={() => navigate(user ? '/dashboard' : '/login')}
                  style={{
                    width: '100%', background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
                    color: '#ffffff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '14px',
                    fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 6px 18px rgba(126, 34, 206, 0.25)', transition: 'all 0.25s ease'
                  }}
                >
                  Register Now <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* TRACK 2: SCIENCE JOURNALISM */}
            <div style={{
              background: 'linear-gradient(160deg, #ffffff 0%, #fff1f2 100%)',
              borderRadius: '24px', border: '2px solid #fecdd3',
              padding: '2.25rem 2rem', boxShadow: '0 12px 35px rgba(225, 29, 72, 0.06)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                {/* Header Badge & Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', marginBottom: '1.75rem' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '18px',
                    background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', color: '#ffffff', boxShadow: '0 8px 20px rgba(225, 29, 72, 0.25)'
                  }}>
                    📰
                  </div>
                  <div>
                    <EditableText
                      value={content.track2Label || 'TRACK 2'}
                      onChange={(v) => updateField('track2Label', v)}
                      editing={E}
                      tag="div"
                      style={{ fontSize: '0.78rem', fontWeight: 900, color: '#be123c', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    />
                    <EditableText
                      value={content.track2Title || 'Science Journalism'}
                      onChange={(v) => updateField('track2Title', v)}
                      editing={E}
                      tag="h3"
                      style={{ fontSize: '1.45rem', fontWeight: 900, color: '#881337', margin: 0, lineHeight: 1.2 }}
                    />
                  </div>
                </div>

                {/* Vertical Stepper List (Phase 1, 2, 3) */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
                  {/* Stepper Vertical Connector Line */}
                  <div style={{
                    position: 'absolute', top: '24px', bottom: '24px', left: '17px',
                    width: '3px', background: 'linear-gradient(to bottom, #fca5a5 0%, #fda4af 100%)',
                    borderRadius: '2px', zIndex: 1
                  }} />

                  {content.track2Stages.map((stage, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative', zIndex: 2, display: 'flex', gap: '1rem', alignItems: 'flex-start',
                        background: '#ffffff', borderRadius: '16px', border: '1px solid #ffe4e6',
                        padding: '1rem 1.15rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Step Number Badge */}
                      <span style={{
                        flexShrink: 0, width: '34px', height: '34px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                        color: '#ffffff', fontSize: '0.9rem', fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)'
                      }}>
                        {i + 1}
                      </span>

                      {/* Stage Text */}
                      <div style={{ flex: 1, paddingTop: '0.2rem' }}>
                        <EditableText
                          value={stage}
                          onChange={(v) => { const arr = [...content.track2Stages]; arr[i] = v; updateField('track2Stages', arr); }}
                          editing={E}
                          tag="div"
                          style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', lineHeight: 1.5 }}
                        />
                      </div>

                      {E && (
                        <button
                          onClick={() => { const arr = content.track2Stages.filter((_, idx) => idx !== i); updateField('track2Stages', arr); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}

                  {E && (
                    <button
                      onClick={() => updateField('track2Stages', [...content.track2Stages, 'New Stage'])}
                      style={{ background: '#fff1f2', color: '#be123c', border: '1px dashed #fecdd3', padding: '0.45rem 1rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content', marginLeft: '2.8rem' }}
                    >
                      <Plus size={15} /> Add Stage
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Workflow Bar & CTA */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                  background: '#ffffff', border: '1px solid #fecdd3', borderRadius: '16px',
                  padding: '0.85rem 1rem', marginBottom: '1.25rem', boxShadow: '0 2px 10px rgba(225, 29, 72, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800, color: '#9f1239' }}>
                    <EditableText value={content.track2Pill1 || '🎙️ Research & Pitch'} onChange={(v) => updateField('track2Pill1', v)} editing={E} />
                  </div>
                  <ChevronRight size={16} style={{ color: '#fb7185' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800, color: '#9f1239' }}>
                    <EditableText value={content.track2Pill2 || '📰 Article Publication'} onChange={(v) => updateField('track2Pill2', v)} editing={E} />
                  </div>
                  <ChevronRight size={16} style={{ color: '#fb7185' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800, color: '#9f1239' }}>
                    <EditableText value={content.track2Pill3 || '🎤 Live Talk Show'} onChange={(v) => updateField('track2Pill3', v)} editing={E} />
                  </div>
                </div>

                <button
                  onClick={() => navigate(user ? '/dashboard' : '/login')}
                  style={{
                    width: '100%', background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                    color: '#ffffff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '14px',
                    fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 6px 18px rgba(225, 29, 72, 0.25)', transition: 'all 0.25s ease'
                  }}
                >
                  Register Now <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════ SECTION: COMPETITION TIMELINE (2 PARALLEL ROADS & COLLAPSIBLE AFTER PHASE 1) ═══════════ */}
      <section id="timeline" className="landing-section" style={{ padding: '2rem 2rem 3rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '28px', border: '1.5px solid #e2e8f0', padding: '2.5rem 2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }}>
          
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <EditableText
              value={content.timelineSectionTitle || 'COMPETITION TIMELINE'}
              onChange={(v) => updateField('timelineSectionTitle', v)}
              editing={E}
              tag="div"
              style={{ fontSize: '0.85rem', fontWeight: 900, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}
            />
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Journey to the Grand Final
            </h2>
            <p style={{ fontSize: '0.98rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
              Follow the official step-by-step roadmap for both competition tracks from orientation to the live stage final.
            </p>
          </div>

          {/* Phone Mobile Track Switcher Tabs (Only visible on mobile) */}
          {isMobile && (
            <div style={{
              display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '14px',
              maxWidth: '450px', margin: '0 auto 2rem', gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setSelectedMobileTrack(1)}
                style={{
                  flex: 1, padding: '0.65rem 0.75rem', borderRadius: '11px', border: 'none',
                  background: selectedMobileTrack === 1 ? 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)' : 'transparent',
                  color: selectedMobileTrack === 1 ? '#ffffff' : '#64748b',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  boxShadow: selectedMobileTrack === 1 ? '0 4px 12px rgba(126,34,206,0.3)' : 'none'
                }}
              >
                🎬 Track 1 Road
              </button>
              <button
                type="button"
                onClick={() => setSelectedMobileTrack(2)}
                style={{
                  flex: 1, padding: '0.65rem 0.75rem', borderRadius: '11px', border: 'none',
                  background: selectedMobileTrack === 2 ? 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)' : 'transparent',
                  color: selectedMobileTrack === 2 ? '#ffffff' : '#64748b',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  boxShadow: selectedMobileTrack === 2 ? '0 4px 12px rgba(190,18,60,0.3)' : 'none'
                }}
              >
                📰 Track 2 Road
              </button>
            </div>
          )}

          {/* Timeline Dual Roads Container */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '2.5rem',
            marginTop: '1rem'
          }}>
            {/* ROAD 1: TRACK 1 (Pop Science Videos) */}
            {(!isMobile || selectedMobileTrack === 1) && (() => {
              const allNodes = content.timelineTrack1Nodes || DEFAULT_CONTENT.timelineTrack1Nodes;
              const nodesToShow = (timelineExpanded || E) ? allNodes : allNodes.slice(0, 3);

              return (
                <div style={{
                  background: 'linear-gradient(160deg, #ffffff 0%, #faf5ff 100%)',
                  borderRadius: '24px', border: '2px solid #e9d5ff',
                  padding: '2rem 1.5rem', boxShadow: '0 10px 30px rgba(126, 34, 206, 0.05)',
                  position: 'relative'
                }}>
                  {/* Road Title Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem',
                    paddingBottom: '1rem', borderBottom: '2px solid #f3e8ff'
                  }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '14px',
                      background: 'linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', boxShadow: '0 6px 16px rgba(126,34,206,0.3)'
                    }}>
                      🎬
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#7e22ce', letterSpacing: '0.08em', textTransform: 'uppercase' }}>OFFICIAL ROADMAP</span>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#1e1b4b' }}>Track 1: Pop Science Videos</h3>
                    </div>
                  </div>

                  {/* Vertical Winding Curly Road 1 Container */}
                  <div style={{ position: 'relative' }}>

                    {/* Road 1 Step Nodes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', zIndex: 2 }}>
                      {nodesToShow.map((node, nIdx) => (
                        <div key={nIdx} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', position: 'relative' }}>
                          
                          {/* Curly Winding Real Asphalt Road SVG Connector to Next Node */}
                          {nIdx < nodesToShow.length - 1 && (
                            <div style={{
                              position: 'absolute',
                              top: '32px',
                              bottom: '-32px',
                              left: '0px',
                              width: '48px',
                              zIndex: 1,
                              pointerEvents: 'none'
                            }}>
                              <svg width="100%" height="100%" viewBox="0 0 48 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                {/* 1. Outer Road Edge */}
                                <path
                                  d={nIdx % 2 === 0
                                    ? "M 24,0 C 48,28 48,72 24,100"
                                    : "M 24,0 C 0,28 0,72 24,100"
                                  }
                                  fill="none"
                                  stroke="#334155"
                                  strokeWidth="12"
                                  strokeLinecap="round"
                                />

                                {/* 2. Inner Main Asphalt Road Surface */}
                                <path
                                  d={nIdx % 2 === 0
                                    ? "M 24,0 C 48,28 48,72 24,100"
                                    : "M 24,0 C 0,28 0,72 24,100"
                                  }
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="7"
                                  strokeLinecap="round"
                                />

                                {/* 3. Center Highway Yellow Dashed Lane Marker */}
                                <path
                                  d={nIdx % 2 === 0
                                    ? "M 24,0 C 48,28 48,72 24,100"
                                    : "M 24,0 C 0,28 0,72 24,100"
                                  }
                                  fill="none"
                                  stroke="#fbbf24"
                                  strokeWidth="2"
                                  strokeDasharray="6,4"
                                  strokeLinecap="round"
                                />

                                {/* 4. Animated Small Car 🏎️ Running Along the Road */}
                                <g>
                                  <g transform="rotate(90)">
                                    <text
                                      fontSize="14"
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                                    >
                                      🏎️
                                    </text>
                                  </g>
                                  <animateMotion
                                    path={nIdx % 2 === 0
                                      ? "M 24,0 C 48,28 48,72 24,100"
                                      : "M 24,0 C 0,28 0,72 24,100"
                                    }
                                    dur={`${3.2 + (nIdx % 3) * 0.7}s`}
                                    repeatCount="indefinite"
                                    rotate="auto"
                                  />
                                </g>
                              </svg>
                            </div>
                          )}

                          {/* Glowing Node Icon Ring */}
                          <div style={{
                            flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%',
                            background: '#ffffff', border: `3.5px solid ${node.color || '#7e22ce'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10,
                            position: 'relative'
                          }}>
                            {node.icon}
                          </div>

                          {/* Card Content */}
                          <div style={{
                            flex: 1, background: '#ffffff', borderRadius: '18px', padding: '1.25rem 1.4rem',
                            border: '1.5px solid #f3e8ff', borderLeft: `5px solid ${node.color || '#7e22ce'}`,
                            boxShadow: '0 6px 20px rgba(0,0,0,0.03)', position: 'relative'
                          }}>
                            {/* Step Pill & Date */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: node.color || '#7e22ce', letterSpacing: '0.08em', background: `${node.color || '#7e22ce'}15`, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                                {node.step || `STEP 0${nIdx + 1}`}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                                <Calendar size={13} style={{ color: node.color || '#7e22ce' }} />
                                <EditableText value={node.date} onChange={(v) => updateNestedArray('timelineTrack1Nodes', nIdx, 'date', v)} editing={E} />
                              </div>
                            </div>

                            {/* Title & Rich Description */}
                            <EditableText
                              value={node.title}
                              onChange={(v) => updateNestedArray('timelineTrack1Nodes', nIdx, 'title', v)}
                              editing={E}
                              tag="h4"
                              style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem', lineHeight: 1.3 }}
                            />
                            <EditableText
                              value={node.desc}
                              onChange={(v) => updateNestedArray('timelineTrack1Nodes', nIdx, 'desc', v)}
                              editing={E}
                              tag="p"
                              style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500, lineHeight: 1.5, margin: 0 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ROAD 2: TRACK 2 (Science Journalism) */}
            {(!isMobile || selectedMobileTrack === 2) && (() => {
              const allNodes = content.timelineTrack2Nodes || DEFAULT_CONTENT.timelineTrack2Nodes;
              const nodesToShow = (timelineExpanded || E) ? allNodes : allNodes.slice(0, 3);

              return (
                <div style={{
                  background: 'linear-gradient(160deg, #ffffff 0%, #fff1f2 100%)',
                  borderRadius: '24px', border: '2px solid #fecdd3',
                  padding: '2rem 1.5rem', boxShadow: '0 10px 30px rgba(225, 29, 72, 0.05)',
                  position: 'relative'
                }}>
                  {/* Road Title Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem',
                    paddingBottom: '1rem', borderBottom: '2px solid #ffe4e6'
                  }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '14px',
                      background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', boxShadow: '0 6px 16px rgba(190,18,60,0.3)'
                    }}>
                      📰
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#be123c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>OFFICIAL ROADMAP</span>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#881337' }}>Track 2: Science Journalism</h3>
                    </div>
                  </div>

                  {/* Vertical Winding Curly Road 2 Container */}
                  <div style={{ position: 'relative' }}>

                    {/* Road 2 Step Nodes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', zIndex: 2 }}>
                      {nodesToShow.map((node, nIdx) => (
                        <div key={nIdx} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', position: 'relative' }}>
                          
                          {/* Curly Winding Real Asphalt Road SVG Connector to Next Node */}
                          {nIdx < nodesToShow.length - 1 && (
                            <div style={{
                              position: 'absolute',
                              top: '32px',
                              bottom: '-32px',
                              left: '0px',
                              width: '48px',
                              zIndex: 1,
                              pointerEvents: 'none'
                            }}>
                              <svg width="100%" height="100%" viewBox="0 0 48 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                {/* 1. Outer Road Edge */}
                                <path
                                  d={nIdx % 2 === 0
                                    ? "M 24,0 C 48,28 48,72 24,100"
                                    : "M 24,0 C 0,28 0,72 24,100"
                                  }
                                  fill="none"
                                  stroke="#334155"
                                  strokeWidth="12"
                                  strokeLinecap="round"
                                />

                                {/* 2. Inner Main Asphalt Road Surface */}
                                <path
                                  d={nIdx % 2 === 0
                                    ? "M 24,0 C 48,28 48,72 24,100"
                                    : "M 24,0 C 0,28 0,72 24,100"
                                  }
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="7"
                                  strokeLinecap="round"
                                />

                                {/* 3. Center Highway White Dashed Lane Marker */}
                                <path
                                  d={nIdx % 2 === 0
                                    ? "M 24,0 C 48,28 48,72 24,100"
                                    : "M 24,0 C 0,28 0,72 24,100"
                                  }
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  strokeDasharray="6,4"
                                  strokeLinecap="round"
                                />

                                {/* 4. Animated Small Car 🚘 Running Along the Road */}
                                <g>
                                  <g transform="rotate(90)">
                                    <text
                                      fontSize="14"
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                                    >
                                      🚘
                                    </text>
                                  </g>
                                  <animateMotion
                                    path={nIdx % 2 === 0
                                      ? "M 24,0 C 48,28 48,72 24,100"
                                      : "M 24,0 C 0,28 0,72 24,100"
                                    }
                                    dur={`${3.6 + (nIdx % 3) * 0.6}s`}
                                    repeatCount="indefinite"
                                    rotate="auto"
                                  />
                                </g>
                              </svg>
                            </div>
                          )}

                          {/* Glowing Node Icon Ring */}
                          <div style={{
                            flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%',
                            background: '#ffffff', border: `3.5px solid ${node.color || '#be123c'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10,
                            position: 'relative'
                          }}>
                            {node.icon}
                          </div>

                          {/* Card Content */}
                          <div style={{
                            flex: 1, background: '#ffffff', borderRadius: '18px', padding: '1.25rem 1.4rem',
                            border: '1.5px solid #ffe4e6', borderLeft: `5px solid ${node.color || '#be123c'}`,
                            boxShadow: '0 6px 20px rgba(0,0,0,0.03)', position: 'relative'
                          }}>
                            {/* Step Pill & Date */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: node.color || '#be123c', letterSpacing: '0.08em', background: `${node.color || '#be123c'}15`, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                                {node.step || `STEP 0${nIdx + 1}`}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                                <Calendar size={13} style={{ color: node.color || '#be123c' }} />
                                <EditableText value={node.date} onChange={(v) => updateNestedArray('timelineTrack2Nodes', nIdx, 'date', v)} editing={E} />
                              </div>
                            </div>

                            {/* Title & Rich Description */}
                            <EditableText
                              value={node.title}
                              onChange={(v) => updateNestedArray('timelineTrack2Nodes', nIdx, 'title', v)}
                              editing={E}
                              tag="h4"
                              style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem', lineHeight: 1.3 }}
                            />
                            <EditableText
                              value={node.desc}
                              onChange={(v) => updateNestedArray('timelineTrack2Nodes', nIdx, 'desc', v)}
                              editing={E}
                              tag="p"
                              style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500, lineHeight: 1.5, margin: 0 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Toggle Collapse/Expand Button */}
          {!E && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button
                type="button"
                onClick={() => setTimelineExpanded(prev => !prev)}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  color: '#0f172a', border: '2px solid #cbd5e1', padding: '0.75rem 2.2rem',
                  borderRadius: '30px', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.06)', display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                  transition: 'all 0.25s ease'
                }}
              >
                <span>{timelineExpanded ? 'Collapse Timeline' : 'View Full Timeline'}</span>
                <span style={{ fontSize: '0.85rem', transition: 'transform 0.25s ease', transform: timelineExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ SECTION: EXPERT TRAINERS (CONTINUOUS SMOOTH MARQUEE REEL) ═══════════ */}
      <section id="workshops" style={{ padding: '2rem 2rem 2.5rem' }}>
        <div style={{
          background: '#ffffff', borderRadius: '28px', border: '1.5px solid #e2e8f0',
          padding: '2.5rem 2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative' }}>
            {/* Main Headline */}
            <EditableText
              value={content.workshopsSectionTitle || 'Learn Directly From Top Science Communicators'}
              onChange={(v) => updateField('workshopsSectionTitle', v)}
              editing={E}
              tag="h2"
              style={{
                fontSize: '2rem', fontWeight: 900, color: '#0f172a',
                margin: '0 0 0.85rem', lineHeight: 1.25, letterSpacing: '-0.02em'
              }}
            />

            {/* Subtitle / Description Card */}
            <div style={{
              maxWidth: '820px', margin: '0 auto',
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px',
              padding: '1.25rem 1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
              <EditableText
                value={content.workshopsSectionDesc || 'Every participant gains access to a comprehensive incubator program before each competition phase, receiving direct mentorship, evaluation criteria briefings, and Q&A sessions delivered by academic researchers, media professionals, and prominent science journalists.'}
                onChange={(v) => updateField('workshopsSectionDesc', v)}
                editing={E}
                tag="p"
                style={{ fontSize: '0.98rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.65 }}
              />
            </div>
          </div>

          {/* Continuous Infinite Marquee Reel for Trainers */}
          {(() => {
            const rawList = content.workshops || DEFAULT_CONTENT.workshops;
            // 4 copies ensure 100% gapless continuous marquee loop on all screen sizes (up to 4K monitors)
            const displayList = E ? rawList : [...rawList, ...rawList, ...rawList, ...rawList];

            const scrollTrainers = (direction) => {
              if (trainerContainerRef.current) {
                // 240px card width + 24px gap = 264px shift (moves by 1 trainer at a time)
                const scrollAmount = direction === 'left' ? -264 : 264;
                trainerContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
              }
            };

            return (
              <div
                onMouseEnter={() => setTrainerPaused(true)}
                onMouseLeave={() => setTrainerPaused(false)}
                style={{ position: 'relative', width: '100%', padding: '0.5rem 0' }}
              >
                {/* Left Navigation Arrow Button (Scrolls back by 1 trainer) */}
                <button
                  type="button"
                  onClick={() => scrollTrainers('left')}
                  style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 40,
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '2px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Previous Trainer"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Right Navigation Arrow Button (Scrolls forward by 1 trainer) */}
                <button
                  type="button"
                  onClick={() => scrollTrainers('right')}
                  style={{
                    position: 'absolute',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 40,
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '2px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Next Trainer"
                >
                  <ChevronRight size={24} />
                </button>

                {/* Viewport Mask */}
                <div
                  ref={trainerContainerRef}
                  className="trainers-marquee-viewport"
                  style={{
                    overflowX: E ? 'visible' : 'auto',
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    width: '100%',
                    borderRadius: '24px',
                    padding: '0.75rem 0.25rem'
                  }}
                >
                  <div
                    className={`trainers-smooth-marquee-track ${!E && !trainerPaused ? 'animating' : ''} ${trainerPaused ? 'paused' : ''}`}
                    style={E ? { display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' } : {}}
                  >
                    {displayList.map((ws, wIdx) => {
                      const realIdx = wIdx % rawList.length;

                      return (
                        <div
                          key={wIdx}
                          style={{
                            flex: '0 0 240px',
                            width: '240px',
                            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                            borderRadius: '24px', border: '1.5px solid #e2e8f0',
                            padding: '1.75rem 1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
                            textAlign: 'center', position: 'relative',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                            boxSizing: 'border-box'
                          }}
                        >
                        {E && (
                          <button
                            onClick={() => removeArrayItem('workshops', realIdx)}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                            title="Delete Trainer"
                          >
                            <X size={13} />
                          </button>
                        )}

                        {/* BIG Photo Container */}
                        <div style={{ position: 'relative', marginBottom: '1.25rem', display: 'inline-block' }}>
                          <div
                            className="fame-graphic-spin-ring"
                            style={{
                              position: 'absolute', inset: '-6px', borderRadius: '50%',
                              background: 'conic-gradient(from 0deg, #2563eb, #3b82f6, #60a5fa, #1d4ed8, #2563eb)',
                              opacity: 0.85, filter: 'blur(3px)', zIndex: 1
                            }}
                          />
                          <div style={{
                            position: 'relative', zIndex: 2,
                            width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden',
                            border: '4px solid #ffffff', boxShadow: '0 10px 25px rgba(37,99,235,0.2)',
                            background: '#e2e8f0'
                          }}>
                            <EditableImage
                              src={ws.img || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'}
                              onUpload={(base64) => updateNestedArray('workshops', realIdx, 'img', base64)}
                              onRemove={() => updateNestedArray('workshops', realIdx, 'img', '')}
                              editing={E}
                              alt={ws.speaker}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                          </div>
                        </div>

                        {/* Trainer Name */}
                        <EditableText
                          value={ws.speaker}
                          onChange={(v) => updateNestedArray('workshops', realIdx, 'speaker', v)}
                          editing={E}
                          tag="h3"
                          style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a', margin: '0 0 0.35rem', lineHeight: 1.3 }}
                        />

                        {/* Trainer Title / Role */}
                        <EditableText
                          value={ws.role || 'Science Communication Expert'}
                          onChange={(v) => updateNestedArray('workshops', realIdx, 'role', v)}
                          editing={E}
                          tag="p"
                          style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 700, margin: 0, lineHeight: 1.35 }}
                        />
                      </div>
                    );
                  })}

                    {/* Add New Trainer Card in Edit Mode */}
                    {E && (
                      <div
                        onClick={() => addArrayItem('workshops', { month: 'NEW', day: '00', title: '', speaker: 'Trainer Name', role: 'Trainer Title / Specialty', type: 'Online', img: '' })}
                        style={{
                          flex: '0 0 240px', width: '240px',
                          background: '#ffffff', borderRadius: '24px', border: '2px dashed #2563eb',
                          padding: '1.75rem 1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          textAlign: 'center', cursor: 'pointer', minHeight: '250px', boxSizing: 'border-box'
                        }}
                      >
                        <Plus size={28} style={{ color: '#2563eb', marginBottom: '0.5rem' }} />
                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#2563eb' }}>+ Add Trainer</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ═══════════ SECTION: COLLABORATIONS & PARTNERS ═══════════ */}
      <section id="collaborators" className="landing-section" style={{ padding: '1.5rem 2rem 2.5rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '28px', border: '1.5px solid #e2e8f0', padding: '2.5rem 2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <EditableText
              value={content.collaboratorsSectionTitle || 'OUR COLLABORATORS & PARTNERS'}
              onChange={(v) => updateField('collaboratorsSectionTitle', v)}
              editing={E}
              tag="div"
              style={{ fontSize: '0.82rem', fontWeight: 900, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}
            />
            <EditableText
              value={content.collaboratorsHeadline || 'Working Together to Fuel Science Communication in Egypt'}
              onChange={(v) => updateField('collaboratorsHeadline', v)}
              editing={E}
              tag="h2"
              style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}
            />
            <p style={{ fontSize: '0.98rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
              Partnering with leading academic institutions, research academies, and media networks across Egypt.
            </p>
          </div>

          {/* Collaborators Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
            {(content.collaborators || DEFAULT_CONTENT.collaborators).map((item, colIdx) => (
              <div
                key={colIdx}
                style={{
                  background: 'linear-gradient(150deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '24px', border: '1.5px solid #cbd5e1',
                  padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'space-between', textAlign: 'center', position: 'relative',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)', transition: 'all 0.3s ease'
                }}
              >
                {/* Delete Partner in Edit Mode */}
                {E && (
                  <button
                    onClick={() => removeArrayItem('collaborators', colIdx)}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                  >
                    <X size={14} />
                  </button>
                )}

                {/* BIG Logo Frame Container */}
                <div style={{
                  position: 'relative', width: '210px', height: '130px', marginBottom: '1.25rem',
                  background: '#ffffff', borderRadius: '18px', border: '1px solid #cbd5e1',
                  padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)', boxSizing: 'border-box'
                }}>
                  <EditableLogo
                    src={item.logo}
                    onUpload={(base64) => updateNestedArray('collaborators', colIdx, 'logo', base64)}
                    onRemove={() => updateNestedArray('collaborators', colIdx, 'logo', '')}
                    editing={E}
                    isMobile={isMobile}
                    scale={isMobile ? (item.mobileScale ?? item.scale ?? 1.2) : (item.scale || 1.2)}
                    rotate={isMobile ? (item.mobileRotate ?? item.rotate ?? 0) : (item.rotate || 0)}
                    offsetX={isMobile ? (item.mobileOffsetX ?? item.offsetX ?? 0) : (item.offsetX || 0)}
                    offsetY={isMobile ? (item.mobileOffsetY ?? item.offsetY ?? 0) : (item.offsetY || 0)}
                    onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                      const copy = [...(content.collaborators || DEFAULT_CONTENT.collaborators)];
                      if (isMobile) {
                        copy[colIdx] = { ...copy[colIdx], mobileScale: scale, mobileRotate: rotate, mobileOffsetX: offsetX, mobileOffsetY: offsetY };
                      } else {
                        copy[colIdx] = { ...copy[colIdx], scale, rotate, offsetX, offsetY };
                      }
                      updateField('collaborators', copy);
                    }}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    alt={item.name}
                  />
                </div>

                {/* Partner Name & Role Badge */}
                <div>
                  <EditableText
                    value={item.name}
                    onChange={(v) => updateNestedArray('collaborators', colIdx, 'name', v)}
                    editing={E}
                    tag="h3"
                    style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.3 }}
                  />

                  {(item.role || 'Strategic Partner') && (
                    <div style={{
                      display: 'inline-block', background: '#eff6ff', border: '1px solid #bfdbfe',
                      color: '#1d4ed8', padding: '0.25rem 0.75rem', borderRadius: '12px',
                      fontSize: '0.78rem', fontWeight: 800
                    }}>
                      <EditableText
                        value={item.role || 'Strategic Partner'}
                        onChange={(v) => updateNestedArray('collaborators', colIdx, 'role', v)}
                        editing={E}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Admin Add Partner Logo Button */}
          {E && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={() => addArrayItem('collaborators', { logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=400&q=80', name: 'New Partner Organization', role: 'Partner Category' })}
                style={{ background: '#f8fafc', color: '#be123c', border: '1.5px dashed #fecdd3', padding: '0.55rem 1.5rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} /> Add Collaborator Logo
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ SECTION: OUR TEAM ═══════════ */}
      <section id="team" className="landing-section" style={{ padding: '1.5rem 2rem 2.5rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '28px', border: '1.5px solid #e2e8f0', padding: '2.5rem 2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <EditableText
              value={content.teamSectionTitle || 'MEET OUR TEAM'}
              onChange={(v) => updateField('teamSectionTitle', v)}
              editing={E}
              tag="div"
              style={{ fontSize: '0.82rem', fontWeight: 900, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}
            />
            <EditableText
              value={content.teamHeadline || 'The Visionaries & Mentors Behind SciComm Spark'}
              onChange={(v) => updateField('teamHeadline', v)}
              editing={E}
              tag="h2"
              style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', margin: 0 }}
            />
          </div>

          {/* Team Members Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.75rem', alignItems: 'stretch' }}>
            {(content.teamMembers || DEFAULT_CONTENT.teamMembers).map((member, tIdx) => (
              <div
                key={tIdx}
                style={{
                  background: '#f8fafc', borderRadius: '22px', border: '1.5px solid #e2e8f0',
                  padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', position: 'relative', boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
                  transition: 'transform 0.25s ease, boxShadow 0.25s ease'
                }}
              >
                {/* Delete Member Button in Edit Mode */}
                {E && (
                  <button
                    onClick={() => removeArrayItem('teamMembers', tIdx)}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                    title="Remove Team Member"
                  >
                    <X size={13} />
                  </button>
                )}

                {/* Profile Photo Frame with Canva Controls */}
                <div style={{ position: 'relative', width: '110px', height: '110px', marginBottom: '1.25rem' }}>
                  <EditableImage
                    src={member.img}
                    onUpload={(base64) => updateNestedArray('teamMembers', tIdx, 'img', base64)}
                    onRemove={() => updateNestedArray('teamMembers', tIdx, 'img', '')}
                    editing={E}
                    isMobile={isMobile}
                    scale={isMobile ? (member.mobileScale ?? member.scale ?? 1) : (member.scale || 1)}
                    rotate={isMobile ? (member.mobileRotate ?? member.rotate ?? 0) : (member.rotate || 0)}
                    offsetX={isMobile ? (member.mobileOffsetX ?? member.offsetX ?? 0) : (member.offsetX || 0)}
                    offsetY={isMobile ? (member.mobileOffsetY ?? member.offsetY ?? 0) : (member.offsetY || 0)}
                    onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
                      const copy = [...(content.teamMembers || DEFAULT_CONTENT.teamMembers)];
                      if (isMobile) {
                        copy[tIdx] = { ...copy[tIdx], mobileScale: scale, mobileRotate: rotate, mobileOffsetX: offsetX, mobileOffsetY: offsetY };
                      } else {
                        copy[tIdx] = { ...copy[tIdx], scale, rotate, offsetX, offsetY };
                      }
                      updateField('teamMembers', copy);
                    }}
                    style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3.5px solid #ffffff', boxShadow: '0 6px 18px rgba(0,0,0,0.1)' }}
                    alt={member.name}
                  />
                </div>

                {/* Member Info */}
                <EditableText
                  value={member.name}
                  onChange={(v) => updateNestedArray('teamMembers', tIdx, 'name', v)}
                  editing={E}
                  tag="h3"
                  style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0, marginBottom: '0.25rem' }}
                />
                <EditableText
                  value={member.role}
                  onChange={(v) => updateNestedArray('teamMembers', tIdx, 'role', v)}
                  editing={E}
                  tag="div"
                  style={{ fontSize: '0.82rem', fontWeight: 800, color: '#be123c', marginBottom: '0.2rem' }}
                />
                <EditableText
                  value={member.org}
                  onChange={(v) => updateNestedArray('teamMembers', tIdx, 'org', v)}
                  editing={E}
                  tag="div"
                  style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '0.75rem' }}
                />
                {member.bio && (
                  <EditableText
                    value={member.bio}
                    onChange={(v) => updateNestedArray('teamMembers', tIdx, 'bio', v)}
                    editing={E}
                    tag="p"
                    style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45, margin: 0, fontWeight: 500 }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Admin Add Team Member Button */}
          {E && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button
                onClick={() => addArrayItem('teamMembers', {
                  name: 'Dr. New Member',
                  role: 'Team Lead / Mentor',
                  org: 'Alamein International University',
                  img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
                  bio: 'Short biography and contribution to SciComm Spark.'
                })}
                style={{ background: '#f8fafc', color: '#be123c', border: '1.5px dashed #fecdd3', padding: '0.6rem 1.75rem', borderRadius: '14px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} /> Add Team Member
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ SECTION: GALLERY (Admin can add/remove images) ═══════════ */}
      {(content.galleryImages?.length > 0 || E) && (
        <section id="gallery" style={{ padding: '1.5rem 2rem 2.5rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', border: '1.5px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>GALLERY</div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: 600 }}>Moments from SciComm Spark Competition</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {(content.galleryImages || []).map((imgSrc, gIdx) => (
                <div key={gIdx} style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '16/10' }}>
                  <img src={imgSrc} alt={`Gallery ${gIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                  {E && (
                    <button onClick={() => removeArrayItem('galleryImages', gIdx)} style={{ position: 'absolute', top: '6px', right: '6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              {E && (
                <GalleryUploadTile onUpload={(base64) => addArrayItem('galleryImages', base64)} />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ SECTION: OFFICIAL SCIENCE JOURNAL SHOWCASE ═══════════ */}
      <section id="journal" className="landing-section" style={{ padding: '1.5rem 2rem 2.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%)',
          borderRadius: '28px',
          padding: '3rem 2.5rem',
          color: '#ffffff',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Header & Main Call to Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.35rem 0.95rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>
                <BookOpen size={15} /> OFFICIAL SCIENCE JOURNAL
              </div>
              <h2 style={{ fontSize: '2.3rem', fontWeight: 900, color: '#ffffff', margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
                Explore Our Science Journal
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.98rem', margin: '0.65rem 0 0', fontWeight: 500, maxWidth: '680px', lineHeight: 1.6 }}>
                Read published research articles, scientific stories, student projects, and competition highlights in the official Alamein International University Science Communication Journal.
              </p>
            </div>
            <a
              href="https://scicomm-superbugs.github.io/Portal/#/aiuscicomm/explore"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0.85rem 2rem',
                borderRadius: '25px',
                fontWeight: 900,
                fontSize: '0.98rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 8px 24px rgba(244, 63, 94, 0.45)',
                transition: 'all 0.25s ease'
              }}
            >
              Visit Our Journal <ExternalLink size={18} />
            </a>
          </div>

          {/* 3 Journal Highlight Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '1.65rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>RESEARCH PAPERS</div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem', lineHeight: 1.35 }}>
                  Scientific Articles & Research
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                  Explore peer-reviewed articles, research summaries, and scientific breakdowns published by student researchers and mentors.
                </p>
              </div>
              <a
                href="https://scicomm-superbugs.github.io/Portal/#/aiuscicomm/explore"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f43f5e', textDecoration: 'none', fontWeight: 800, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                Browse Articles <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '1.65rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a855f7', marginBottom: '0.5rem', textTransform: 'uppercase' }}>SCIENCE STORIES</div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem', lineHeight: 1.35 }}>
                  Popular Science & Media Features
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                  Read engaging pop science stories, video scripts, and multimedia features created to make complex science accessible to everyone.
                </p>
              </div>
              <a
                href="https://scicomm-superbugs.github.io/Portal/#/aiuscicomm/explore"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f43f5e', textDecoration: 'none', fontWeight: 800, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                Read Science Stories <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '1.65rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', marginBottom: '0.5rem', textTransform: 'uppercase' }}>COMPETITION SHOWCASE</div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem', lineHeight: 1.35 }}>
                  SciComm Spark Featured Works
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                  Discover winning submissions, participant highlights, and outstanding projects from the SciComm Spark competition.
                </p>
              </div>
              <a
                href="https://scicomm-superbugs.github.io/Portal/#/aiuscicomm/explore"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f43f5e', textDecoration: 'none', fontWeight: 800, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                Visit Journal Portal <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ BOTTOM FOOTER BAR ═══════════ */}
      <footer id="contact" style={{
        background: '#0a0f1d', color: '#ffffff', padding: '1.5rem 2rem',
        borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <EditableLogo
            src={content.footerLogo || "./spark_logo.png"}
            onUpload={(base64) => updateField('footerLogo', base64)}
            editing={E}
            isMobile={isMobile}
            scale={isMobile ? (content.footerLogoMobileScale ?? content.footerLogoScale ?? 1) : (content.footerLogoScale || 1)}
            rotate={isMobile ? (content.footerLogoMobileRotate ?? content.footerLogoRotate ?? 0) : (content.footerLogoRotate || 0)}
            offsetX={isMobile ? (content.footerLogoMobileOffsetX ?? content.footerLogoOffsetX ?? 0) : (content.footerLogoOffsetX || 0)}
            offsetY={isMobile ? (content.footerLogoMobileOffsetY ?? content.footerLogoOffsetY ?? 0) : (content.footerLogoOffsetY || 0)}
            onTransformChange={({ scale, rotate, offsetX, offsetY }) => {
              if (isMobile) {
                setContent(prev => ({ ...prev, footerLogoMobileScale: scale, footerLogoMobileRotate: rotate, footerLogoMobileOffsetX: offsetX, footerLogoMobileOffsetY: offsetY }));
              } else {
                setContent(prev => ({ ...prev, footerLogoScale: scale, footerLogoRotate: rotate, footerLogoOffsetX: offsetX, footerLogoOffsetY: offsetY }));
              }
            }}
            style={{ height: '48px' }}
            alt="SciComm Spark Footer Logo"
          />
          <div>
            <EditableText value={content.footerConnect} onChange={(v) => updateField('footerConnect', v)} editing={E} tag="div" style={{ fontWeight: 800, fontSize: '0.85rem' }} />
            <EditableText value={content.footerConnectSub} onChange={(v) => updateField('footerConnectSub', v)} editing={E} tag="div" style={{ fontSize: '0.72rem', color: '#64748b' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
          <Mail size={16} style={{ color: '#be123c' }} />
          <span>Need Help? <a href={`mailto:${content.footerEmail}`} style={{ color: '#ffffff', textDecoration: 'underline' }}>{content.footerEmail}</a></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
          <a
            href="https://scicomm-superbugs.github.io/Portal/#/aiuscicomm/explore"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#f43f5e', textDecoration: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <BookOpen size={14} /> Science Journal <ExternalLink size={12} />
          </a>
          <span>•</span>
          {content.footerLinks.map((link, lIdx) => (
            <span key={lIdx}>
              {lIdx > 0 && <span style={{ marginRight: '1.25rem' }}>•</span>}
              <EditableText value={link} onChange={(v) => { const arr = [...content.footerLinks]; arr[lIdx] = v; updateField('footerLinks', arr); }} editing={E} />
            </span>
          ))}
        </div>

        <button onClick={() => navigate(user ? '/dashboard' : '/login')} style={{ background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', color: '#ffffff', border: 'none', padding: '0.65rem 1.6rem', borderRadius: '25px', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 16px rgba(225,29,72,0.4)' }}>
          {content.footerBtn}
        </button>

        {/* ─── DEVELOPER & DESIGNER CREDIT SUB-FOOTER BAR ─── */}
        <div style={{
          width: '100%',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          marginTop: '1.25rem',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: '#94a3b8',
          fontWeight: 600,
          letterSpacing: '0.02em'
        }}>
          <span>
            Designed &amp; Programmed with ❤️ by{' '}
            <span style={{
              color: '#ffffff',
              fontWeight: 800,
              background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Abdullah Amr Maged
            </span>
          </span>
        </div>
      </footer>

    </div>
  );
}

/* ─── Gallery Upload Tile ─── */
function GalleryUploadTile({ onUpload }) {
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await uploadFile(file, 'gallery');
      onUpload(base64);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => onUpload(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      onClick={() => fileRef.current?.click()}
      style={{
        borderRadius: '14px', border: '2px dashed #3b82f6', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', aspectRatio: '16/10',
        background: 'rgba(59,130,246,0.04)', transition: 'all 0.2s ease'
      }}
    >
      <ImageIcon size={28} style={{ color: '#3b82f6', marginBottom: '0.35rem' }} />
      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#3b82f6' }}>Add Photo</div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}
