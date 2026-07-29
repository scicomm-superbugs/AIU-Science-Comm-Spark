import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { db, firestore, getCollectionName, uploadFile, useLiveCollection } from './db';
import { collection, getDocs } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { useAuth } from './context/AuthContext';
import './scicommspark.css';

export default function Register() {
  const location = useLocation();
  const [googleData, setGoogleData] = useState(location.state?.googleData || null);
  const { user, setUser, loginWithGoogle, completeGoogleRegistration } = useAuth();

  const [formData, setFormData] = useState({
    name: location.state?.googleData?.name || '',
    username: location.state?.googleData?.email ? location.state.googleData.email.split('@')[0] : '',
    email: location.state?.googleData?.email || '',
    phone: '',
    password: '',
    confirmPassword: '',
    department: '',
    universityId: '',
    title: '',
    role: 'competitor',
    registeredTrack: 'pop_science',
    participationMode: 'team',
    nationalId: '',
    institutionName: '',
    isAlameinStudent: false
  });

  useEffect(() => {
    if (googleData) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || googleData.name || '',
        email: prev.email || googleData.email || '',
        username: prev.username || (googleData.email ? googleData.email.split('@')[0] : '')
      }));
      if (googleData.avatar) {
        setAvatar(googleData.avatar);
        setAvatarMode('upload');
      }
    }
  }, [googleData]);

  const handleGoogleSignUp = async () => {
    setError('');
    try {
      const res = await loginWithGoogle();
      if (res && res.needsCompletion) {
        setGoogleData(res.googleData);
      } else if (res) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };
  const SCIENTIST_AVATARS = [
    { name: 'Mad Genius', propTop: '🧠', propLeft: '⚡', propBottom: '💡', seed: 'FelixMad', style: 'adventurer' },
    { name: 'Lab Researcher', propTop: '🧪', propLeft: '💥', propBottom: '🥼', seed: 'SophiaLab', style: 'open-peeps' },
    { name: 'Quantum Theorist', propTop: '⚛️', propLeft: '🌌', propBottom: '✨', seed: 'QuantumAria', style: 'lorelei' },
    { name: 'Cosmic Presenter', propTop: '🚀', propLeft: '✨', propBottom: '🌟', seed: 'LeoCosmic', style: 'adventurer' },
    { name: 'Radioactive Doc', propTop: '☣️', propLeft: '🥼', propBottom: '⚡', seed: 'DocHazard', style: 'bottts' },
    { name: 'Biotech Scientist', propTop: '🧬', propLeft: '🔬', propBottom: '🧫', seed: 'MayaBio', style: 'micah' },
    { name: 'Stargazer', propTop: '🔭', propLeft: '🌌', propBottom: '🌙', seed: 'OrionStar', style: 'open-peeps' },
    { name: 'High-Voltage', propTop: '⚡', propLeft: '🔋', propBottom: '💥', seed: 'TeslaVolt99', style: 'bottts' },
    { name: 'SciComm Host', propTop: '🎙️', propLeft: '🔊', propBottom: '⭐', seed: 'ChrisPresenter', style: 'adventurer' },
    { name: 'Astro Explorer', propTop: '🛰️', propLeft: '🌙', propBottom: '🪐', seed: 'LunaAstro', style: 'lorelei' },
    { name: 'Mad Botanist', propTop: '🌿', propLeft: '🌱', propBottom: '🌸', seed: 'FloraPlant', style: 'micah' },
    { name: 'Cyber Researcher', propTop: '🤖', propLeft: '💡', propBottom: '⚙️', seed: 'CyberNode', style: 'bottts-neutral' },
    { name: 'Quantum Bot', propTop: '⚡', propLeft: '🤖', propBottom: '🔮', seed: 'QuantumCore', style: 'bottts-neutral' },
    { name: 'Lab Android', propTop: '🤖', propLeft: '⚡', propBottom: '⚙️', seed: 'AndroidFuturisticV2', style: 'bottts-neutral' },
    { name: 'Journalist', propTop: '📰', propLeft: '✍️', propBottom: '🗞️', seed: 'JournalistAlex', style: 'open-peeps' },
    { name: 'Tech Pioneer', propTop: '💻', propLeft: '⚡', propBottom: '🌐', seed: 'AdaCode', style: 'adventurer' },
    { name: 'Mad Chemist', propTop: '🧪', propLeft: '💥', propBottom: '⚗️', seed: 'ChemistExplode', style: 'fun-emoji' },
    { name: 'Geneticist', propTop: '🧬', propLeft: '🧫', propBottom: '🔬', seed: 'GeneticsElena', style: 'lorelei' },
    { name: 'Neuroscientist', propTop: '🧠', propLeft: '⚡', propBottom: '🔬', seed: 'BrainOliver', style: 'micah' },
    { name: 'AI Strategist', propTop: '🔮', propLeft: '🤖', propBottom: '⚡', seed: 'ZoeAI', style: 'adventurer' },
    { name: 'Nanotech Engineer', propTop: '🔬', propLeft: '⚙️', propBottom: '✨', seed: 'NanoEthan', style: 'open-peeps' },
    { name: 'Space Aviator', propTop: '🌌', propLeft: '🚀', propBottom: '⭐', seed: 'SpaceStella', style: 'lorelei' },
    { name: 'Media Creator', propTop: '🎥', propLeft: '🎬', propBottom: '✨', seed: 'MediaNoah', style: 'adventurer' },
    { name: 'Nuclear Physicist', propTop: '☢️', propLeft: '⚡', propBottom: '💥', seed: 'NuclearVapor', style: 'bottts' },
    { name: 'Marine Biologist', propTop: '🌊', propLeft: '🐬', propBottom: '🧫', seed: 'MarineMarina', style: 'micah' },
    { name: 'Robotics Architect', propTop: '🦾', propLeft: '⚙️', propBottom: '🤖', seed: 'RoboVictor', style: 'adventurer' },
    { name: 'Data Scientist', propTop: '📊', propLeft: '💻', propBottom: '📈', seed: 'DataChloe', style: 'open-peeps' },
    { name: 'Exoplanet Hunter', propTop: '🪐', propLeft: '🔭', propBottom: '🌌', seed: 'ExoAstra', style: 'lorelei' },
    { name: 'Eco Warrior', propTop: '🌍', propLeft: '🌿', propBottom: '🌱', seed: 'EcoGaia', style: 'micah' },
    { name: 'Spark Champion', propTop: '🏆', propLeft: '⚡', propBottom: '🥇', seed: 'SparkChampion', style: 'adventurer' },
    { name: 'Normal Person', propTop: '👋', propLeft: '✨', propBottom: '😊', seed: 'NormalPersonSam', style: 'adventurer' },
    { name: 'University Student', propTop: '🎓', propLeft: '📚', propBottom: '✏️', seed: 'StudentAdam', style: 'open-peeps' },
    { name: 'Friendly Scholar', propTop: '🎒', propLeft: '📖', propBottom: '✨', seed: 'FriendlyEmma', style: 'micah' },
    { name: 'Classic Competitor', propTop: '⭐', propLeft: '🌟', propBottom: '🎯', seed: 'ClassicLucas', style: 'lorelei' }
  ];

  const customTracks = useLiveCollection('ft_tracks') || [];

  const availableTracks = useMemo(() => {
    if (customTracks.length > 0) {
      return customTracks;
    }
    return [
      {
        id: 'pop_science',
        name: 'Pop Science Videos / فيديوهات تبسيط العلوم',
        icon: '🎥',
        description: 'Transform complex scientific concepts into engaging, creative video content (Reels, TikTok & YouTube) for the public.'
      },
      {
        id: 'science_journalism',
        name: 'Science Journalism / الصحافة العلمية',
        icon: '📰',
        description: 'Investigate, research, craft simplified science articles, and conduct professional interviews with leading scientists.'
      }
    ];
  }, [customTracks]);

  const [avatarMode, setAvatarMode] = useState('preset'); // 'preset' | 'upload'
  const [selectedSeed, setSelectedSeed] = useState('Einstein');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Einstein');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [modalTab, setModalTab] = useState('presets'); // 'presets' | 'upload'
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleRandomizeAvatar = () => {
    const randomSeed = 'mad_scientist_' + Math.random().toString(36).substring(2, 9);
    setSelectedSeed(randomSeed);
    setAvatarMode('preset');
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const base64 = await uploadFile(file);
      setAvatar(base64);
      setAvatarMode('upload');
    } catch (err) {
      alert('Avatar upload failed: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsRegistering(true);

    if (googleData) {
      try {
        await completeGoogleRegistration(googleData, {
          ...formData,
          avatar,
          password: formData.password || 'GoogleAuthPass123!'
        });
        navigate('/dashboard');
        return;
      } catch (err) {
        if (err.message?.includes('pending review')) {
          setSuccess(err.message);
          setIsRegistering(false);
          return;
        }
        setError(err.message);
        setIsRegistering(false);
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsRegistering(false);
      return;
    }
    
    // Check if username or email is already registered
    const existing = await db.scientists.where('username').equals(formData.username.trim()).first()
      || await db.scientists.where('email').equals(formData.username.trim()).first();
    if (existing) {
      setError('Username is already in use.');
      setIsRegistering(false);
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      setIsRegistering(false);
      return;
    }

    const existingEmail = await db.scientists.where('email').equals(formData.email.trim()).first();
    if (existingEmail) {
      setError('Email is already in use.');
      setIsRegistering(false);
      return;
    }

    try {
      const salt = await bcrypt.genSalt(4);
      const hash = await bcrypt.hash(formData.password, salt);
      const isJudge = formData.role === 'judge';
      const generatedId = (isJudge ? 'SV-' : 'ST-') + Math.floor(1000 + Math.random() * 9000);

      // Check if this is the first user registering on the platform
      const sciCol = getCollectionName('scientists');
      const allSnap = await getDocs(collection(firestore, sciCol));
      const isFirstUser = allSnap.empty;

      const userRole = isFirstUser ? 'master' : (isJudge ? 'judge' : 'competitor');
      const userStatus = isFirstUser ? 'active' : 'pending';

      const newId = await db.scientists.add({
        username: formData.username.trim(),
        passwordHash: hash,
        name: formData.name.trim(),
        email: formData.email ? formData.email.trim() : '',
        department: formData.department,
        universityId: isJudge ? '' : (formData.isAlameinStudent ? formData.universityId.trim() : ''),
        title: isFirstUser ? 'Master Admin' : (formData.title ? formData.title.trim() : (isJudge ? 'Judge' : 'Competitor')),
        role: userRole,
        registeredTrack: isJudge ? '' : formData.registeredTrack,
        participationMode: isJudge ? 'individual' : (formData.participationMode || 'team'),
        phone: formData.phone.trim(),
        accountStatus: userStatus,
        employeeId: generatedId,
        avatarUrl: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + formData.username,
        nationalId: formData.nationalId.trim(),
        institutionName: formData.isAlameinStudent ? 'Alamein International University' : (formData.institutionName ? formData.institutionName.trim() : ''),
        isAlameinStudent: !!formData.isAlameinStudent,
        competitorIdNumber: isJudge ? '' : 'C-' + Math.floor(100 + Math.random() * 900),
        profileViews: 0,
        createdAt: new Date().toISOString()
      });

      // Send Notification to Admins for New User Registration / Approval Request
      try {
        await db.ft_notifications.add({
          targetRoles: ['admin', 'master'],
          type: 'registration',
          title: `👤 New Account Registration Request`,
          message: `New account registered: ${formData.name.trim()} (${userRole}, Track: ${formData.registeredTrack || 'General'}).`,
          link: '/dashboard/competitors',
          createdAt: new Date().toISOString(),
          status: 'unread'
        });
      } catch (nErr) {
        console.warn('Failed to send admin registration notification:', nErr);
      }

      if (isFirstUser) {
        const userData = {
          id: newId,
          username: formData.username.trim(),
          name: formData.name.trim(),
          role: 'master',
          avatar: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + formData.username
        };
        setUser(userData);
        localStorage.setItem('ft_userId', newId);
        sessionStorage.setItem('ft_userId', newId);
        alert('👑 Welcome! As the first registered user on the platform, you have been granted Master Admin access.');
        navigate('/dashboard');
        return;
      }

      setSuccess('Registration successful! Your account is pending review and approval by an administrator.');
      setFormData({ name: '', username: '', email: '', phone: '', password: '', confirmPassword: '', department: '', universityId: '', title: '', role: 'competitor', registeredTrack: 'pop_science', nationalId: '', institutionName: '', isAlameinStudent: false });
      setAvatar('');
      setIsRegistering(false);
    } catch (err) {
      setError('Registration failed: ' + err.message);
      setIsRegistering(false);
    }
  };

  const [currentStep, setCurrentStep] = useState(1);

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    // Step 1 validation
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }

    // Step 2 validation
    if (currentStep === 2) {
      if (!formData.name.trim()) {
        setError('Please enter your full name / يرجى إدخال الاسم الكامل');
        return;
      }
      if (!formData.nationalId.trim() || formData.nationalId.trim().length !== 14) {
        setError('Please enter a valid 14-digit National ID number / يرجى إدخال رقم القومي الصحيح المكون من 14 رقم');
        return;
      }
      if (formData.role === 'competitor') {
        if (formData.isAlameinStudent && !formData.universityId.trim()) {
          setError('Please enter your AIU University ID / يرجى إدخال الرقم الجامعي');
          return;
        }
        if (!formData.isAlameinStudent && !formData.institutionName.trim()) {
          setError('Please enter your institution name / يرجى إدخال اسم المؤسسة/الجامعة');
          return;
        }
      } else {
        if (!formData.title.trim()) {
          setError('Please enter your academic or professional title / يرجى إدخال اللقب أو المسمى الوظيفي');
          return;
        }
      }
      setCurrentStep(3);
      return;
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="ft-app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', padding: '2.5rem 1rem', background: '#f8fafc' }}>
      <div className="ft-card ft-animate-in" style={{ maxWidth: '780px', width: '100%', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.06)' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'var(--ft-bg-card)', border: '1.5px solid var(--ft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 6px 20px rgba(0,0,0,0.05)' }}>
            <img src="./logo.png" alt="University Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.75rem', fontWeight: 900, color: 'var(--ft-primary)', marginBottom: '0.25rem' }}>
            {formData.role === 'competitor' ? '🎓 Competitor Registration' : '🧑‍🏫 Judge Registration'}
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--ft-text-muted)', fontWeight: 600 }}>
            SciComm Spark Competition Portal · Step {currentStep} of 3
          </div>
        </div>

        {/* Multi-Step Wizard Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: '2.5rem', position: 'relative', padding: '0 1rem' }}>
          <div style={{ position: 'absolute', top: '18px', left: '10%', right: '10%', height: '3px', background: '#e2e8f0', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '18px', left: '10%', width: currentStep === 1 ? '0%' : currentStep === 2 ? '40%' : '80%', height: '3px', background: '#be123c', transition: 'width 0.4s ease', zIndex: 0 }} />

          {[
            { num: 1, label: 'Profile & Role', icon: '👤' },
            { num: 2, label: 'Personal & Track', icon: '📜' },
            { num: 3, label: 'Account & Security', icon: '🔒' }
          ].map((stg) => {
            const isActive = currentStep === stg.num;
            const isDone = currentStep > stg.num;
            return (
              <div key={stg.num} onClick={() => { if (isDone) setCurrentStep(stg.num); }} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1, cursor: isDone ? 'pointer' : 'default' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto 0.4rem',
                  background: isDone ? '#22c55e' : isActive ? '#be123c' : '#ffffff',
                  border: isDone ? '2px solid #22c55e' : isActive ? '3px solid #be123c' : '2px solid #cbd5e1',
                  color: isDone || isActive ? '#ffffff' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem', boxShadow: isActive ? '0 0 15px rgba(190,18,60,0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {isDone ? '✓' : stg.num}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#be123c' : isDone ? '#15803d' : '#64748b' }}>
                  {stg.label}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'var(--ft-danger-bg)', 
            color: 'var(--ft-danger)', 
            padding: '0.85rem 1.25rem', 
            borderRadius: '14px', 
            marginBottom: '1.5rem', 
            fontSize: '0.88rem',
            fontWeight: 600,
            border: '1.5px solid rgba(239, 68, 68, 0.2)'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{ 
            backgroundColor: 'var(--ft-success-bg)', 
            color: 'var(--ft-success)', 
            padding: '1.25rem', 
            borderRadius: '16px', 
            marginBottom: '1.5rem', 
            fontSize: '0.92rem',
            fontWeight: 600,
            border: '1.5px solid rgba(34, 197, 94, 0.2)'
          }}>
            ✅ {success}
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
              Go to <Link to="/login" style={{ color: 'var(--ft-primary)', textDecoration: 'underline', fontWeight: 800 }}>Login page ➔</Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: ROLE, AVATAR & PARTICIPATION MODE */}
          {currentStep === 1 && (
            <div className="ft-animate-in">
              {!googleData ? (
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '16px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.65rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                    marginBottom: '1.75rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Sign Up / Autofill with Google
                </button>
              ) : (
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  color: '#166534',
                  padding: '0.85rem 1.2rem',
                  borderRadius: '16px',
                  marginBottom: '1.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.08)'
                }}>
                  <span>✨ Connected to Google as <strong>{googleData.email}</strong></span>
                  <button
                    type="button"
                    onClick={() => setGoogleData(null)}
                    style={{ background: 'transparent', border: 'none', color: '#be123c', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                
                {/* Account Type Graphical Selection Cards */}
                <div className="ft-input-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                  <label className="ft-label" style={{ marginBottom: '0.6rem' }}>Account Type / نوع الحساب *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Competitor Card */}
                    <div
                      onClick={() => setFormData({ ...formData, role: 'competitor' })}
                      style={{
                        padding: '1.25rem 1rem', borderRadius: '18px', cursor: 'pointer',
                        background: formData.role === 'competitor' ? '#fff1f2' : '#ffffff',
                        border: formData.role === 'competitor' ? '2.5px solid #be123c' : '1.5px solid #cbd5e1',
                        boxShadow: formData.role === 'competitor' ? '0 6px 18px rgba(190, 18, 60, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                    >
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px',
                        background: formData.role === 'competitor' ? '#be123c' : '#f1f5f9',
                        color: formData.role === 'competitor' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
                      }}>
                        🎓
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: formData.role === 'competitor' ? '#be123c' : '#0f172a' }}>
                          Competitor (متسابق)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                          Student participant in tracks
                        </div>
                      </div>
                    </div>

                    {/* Judge / Instructor Card */}
                    <div
                      onClick={() => setFormData({ ...formData, role: 'judge' })}
                      style={{
                        padding: '1.25rem 1rem', borderRadius: '18px', cursor: 'pointer',
                        background: formData.role === 'judge' ? '#eff6ff' : '#ffffff',
                        border: formData.role === 'judge' ? '2.5px solid #2563eb' : '1.5px solid #cbd5e1',
                        boxShadow: formData.role === 'judge' ? '0 6px 18px rgba(37, 99, 235, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                    >
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px',
                        background: formData.role === 'judge' ? '#2563eb' : '#f1f5f9',
                        color: formData.role === 'judge' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
                      }}>
                        🧑‍🏫
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: formData.role === 'judge' ? '#2563eb' : '#0f172a' }}>
                          Judge / Instructor (محكم أو مدرب)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                          Evaluator & workshop trainer
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Picture Card */}
                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label" style={{ marginBottom: '0.6rem' }}>Profile Picture / صورة الملف الشخصي</label>
                  <div style={{
                    padding: '0.85rem 1rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '16px',
                    display: 'flex', alignItems: 'center', gap: '1rem'
                  }}>
                    <img
                      src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedSeed}`}
                      alt="Profile Avatar"
                      style={{
                        width: '52px', height: '52px', borderRadius: '50%', border: '2.5px solid #be123c',
                        objectFit: 'cover', background: '#ffffff', flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                        {avatarMode === 'preset' ? 'Preset Avatar' : 'Custom Photo'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAvatarModal(true)}
                        style={{
                          background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          padding: '0.45rem 0.95rem',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: '0 4px 12px rgba(190, 18, 60, 0.25)',
                          marginTop: '0.35rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        🎨 Select / Change Picture
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {formData.role === 'competitor' && (
                <div className="ft-input-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="ft-label" style={{ marginBottom: '0.6rem' }}>
                    Participation Type / نوع المشاركة *
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Solo */}
                    <div
                      onClick={() => setFormData({ ...formData, participationMode: 'individual' })}
                      style={{
                        padding: '1.25rem 1rem', borderRadius: '18px', cursor: 'pointer',
                        background: formData.participationMode === 'individual' ? '#eff6ff' : '#ffffff',
                        border: formData.participationMode === 'individual' ? '2.5px solid #2563eb' : '1.5px solid #cbd5e1',
                        boxShadow: formData.participationMode === 'individual' ? '0 6px 18px rgba(37, 99, 235, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                    >
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px',
                        background: formData.participationMode === 'individual' ? '#2563eb' : '#f1f5f9',
                        color: formData.participationMode === 'individual' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
                      }}>
                        👤
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: formData.participationMode === 'individual' ? '#2563eb' : '#0f172a' }}>
                          Individual (فردي)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                          Solo competitor entry
                        </div>
                      </div>
                    </div>

                    {/* Team */}
                    <div
                      onClick={() => setFormData({ ...formData, participationMode: 'team' })}
                      style={{
                        padding: '1.25rem 1rem', borderRadius: '18px', cursor: 'pointer',
                        background: formData.participationMode === 'team' ? '#fff1f2' : '#ffffff',
                        border: formData.participationMode === 'team' ? '2.5px solid #be123c' : '1.5px solid #cbd5e1',
                        boxShadow: formData.participationMode === 'team' ? '0 6px 18px rgba(190, 18, 60, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                    >
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px',
                        background: formData.participationMode === 'team' ? '#be123c' : '#f1f5f9',
                        color: formData.participationMode === 'team' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
                      }}>
                        👥
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: formData.participationMode === 'team' ? '#be123c' : '#0f172a' }}>
                          Team (فريق)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                          Group team (Up to 3 members)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PERSONAL & TRACK INFO */}
          {currentStep === 2 && (
            <div className="ft-animate-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">Full Name / الاسم الكامل *</label>
                  <input type="text" className="ft-input" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Abdullah Amr Maged" />
                </div>

                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">National ID Number / بطاقة الرقم القومي *</label>
                  <input type="text" className="ft-input" name="nationalId" required value={formData.nationalId} onChange={handleChange} placeholder="14-digit National ID" maxLength={14} pattern="[0-9]{14}" />
                </div>
              </div>

              {formData.role === 'competitor' && (
                <div className="ft-input-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="ft-label" style={{ marginBottom: '0.6rem' }}>
                    Competition Track / مسار المسابقة *
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {availableTracks.map((tr) => {
                      const isSelected = formData.registeredTrack === tr.id;
                      return (
                        <div
                          key={tr.id}
                          onClick={() => setFormData({ ...formData, registeredTrack: tr.id })}
                          style={{
                            padding: '1.1rem 1.25rem', borderRadius: '18px', cursor: 'pointer',
                            background: isSelected ? '#fff1f2' : '#ffffff',
                            border: isSelected ? '2.5px solid #be123c' : '1.5px solid #cbd5e1',
                            boxShadow: isSelected ? '0 6px 18px rgba(190, 18, 60, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease', display: 'flex', alignItems: 'flex-start', gap: '0.85rem'
                          }}
                        >
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: isSelected ? '#be123c' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#475569',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.3rem', flexShrink: 0
                          }}>
                            {tr.icon || '🏆'}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <div style={{ fontWeight: 900, fontSize: '0.92rem', color: isSelected ? '#be123c' : '#0f172a' }}>
                                {tr.name}
                              </div>
                              {isSelected && (
                                <span style={{ background: '#be123c', color: '#ffffff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                                  ✓
                                </span>
                              )}
                            </div>
                            {tr.description && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45, fontWeight: 500 }}>
                                {tr.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formData.role === 'competitor' ? (
                <>
                  <div className="ft-input-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="ft-label" style={{ marginBottom: '0.6rem' }}>
                      Are you a student at Alamein International University? / هل أنت طالب بجامعة العلمين؟ *
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div
                        onClick={() => setFormData({ ...formData, isAlameinStudent: true, institutionName: 'Alamein International University' })}
                        style={{
                          padding: '1rem', borderRadius: '16px', cursor: 'pointer',
                          background: formData.isAlameinStudent ? '#fff1f2' : '#ffffff',
                          border: formData.isAlameinStudent ? '2.5px solid #be123c' : '1.5px solid #cbd5e1',
                          boxShadow: formData.isAlameinStudent ? '0 6px 18px rgba(190, 18, 60, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.85rem'
                        }}
                      >
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px',
                          background: formData.isAlameinStudent ? '#be123c' : '#f1f5f9',
                          color: formData.isAlameinStudent ? '#ffffff' : '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0
                        }}>
                          🏛️
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.9rem', color: formData.isAlameinStudent ? '#be123c' : '#0f172a' }}>Yes (نعم)</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>AIU Student</div>
                        </div>
                      </div>

                      <div
                        onClick={() => setFormData({ ...formData, isAlameinStudent: false })}
                        style={{
                          padding: '1rem', borderRadius: '16px', cursor: 'pointer',
                          background: !formData.isAlameinStudent ? '#eff6ff' : '#ffffff',
                          border: !formData.isAlameinStudent ? '2.5px solid #2563eb' : '1.5px solid #cbd5e1',
                          boxShadow: !formData.isAlameinStudent ? '0 6px 18px rgba(37, 99, 235, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.85rem'
                        }}
                      >
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px',
                          background: !formData.isAlameinStudent ? '#2563eb' : '#f1f5f9',
                          color: !formData.isAlameinStudent ? '#ffffff' : '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0
                        }}>
                          🌐
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.9rem', color: !formData.isAlameinStudent ? '#2563eb' : '#0f172a' }}>No (لا)</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Other University</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {formData.isAlameinStudent ? (
                    <div className="ft-input-group">
                      <label className="ft-label">University ID Number / الرقم الجامعي *</label>
                      <input type="text" className="ft-input" name="universityId" required value={formData.universityId} onChange={handleChange} placeholder="e.g. 202100456" />
                    </div>
                  ) : (
                    <div className="ft-input-group">
                      <label className="ft-label">Institution Name / اسم المؤسسة *</label>
                      <input type="text" className="ft-input" name="institutionName" required value={formData.institutionName} onChange={handleChange} placeholder="Enter your university or institution name" />
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="ft-input-group" style={{ margin: 0 }}>
                    <label className="ft-label">Title / اللقب أو المسمى الوظيفي (e.g. Associate Professor, Science Journalist, Evaluator) *</label>
                    <input type="text" className="ft-input" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Associate Professor, Science Journalist, Doctor" />
                  </div>
                  <div className="ft-input-group" style={{ margin: 0 }}>
                    <label className="ft-label">Institution / University Name (اسم الجامعة أو المؤسسة) *</label>
                    <input type="text" className="ft-input" name="institutionName" required value={formData.institutionName} onChange={handleChange} placeholder="e.g. Cairo University, Alexandria University, AIU, Al-Ahram" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ACCOUNT CREDENTIALS & SECURITY */}
          {currentStep === 3 && (
            <div className="ft-animate-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">Username / اسم المستخدم *</label>
                  <input type="text" className="ft-input" name="username" required value={formData.username} onChange={handleChange} placeholder="Username for login" />
                </div>

                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">Email Address / البريد الإلكتروني *</label>
                  <input type="email" className="ft-input" name="email" required value={formData.email} onChange={handleChange} placeholder="name@example.com" />
                </div>

                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">WhatsApp Phone / رقم الواتساب *</label>
                  <input type="tel" className="ft-input" name="phone" required value={formData.phone} onChange={handleChange} placeholder="e.g. 01012345678" />
                </div>

                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">Department / التخصص *</label>
                  <input type="text" className="ft-input" name="department" required value={formData.department} onChange={handleChange} placeholder="e.g. Biotechnology, Chemistry" />
                </div>

                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">Password / كلمة المرور *</label>
                  <input type="password" className="ft-input" name="password" required value={formData.password} onChange={handleChange} placeholder="Min 6 characters" />
                </div>

                <div className="ft-input-group" style={{ margin: 0 }}>
                  <label className="ft-label">Confirm Password / تأكيد كلمة المرور *</label>
                  <input type="password" className="ft-input" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" />
                </div>
              </div>
            </div>
          )}

          {/* WIZARD NAVIGATION CONTROLS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            {currentStep > 1 ? (
              <button
                type="button"
                className="ft-btn"
                onClick={handlePrevStep}
                style={{
                  background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1',
                  fontWeight: 800, fontSize: '0.9rem', padding: '0.75rem 1.6rem', borderRadius: '14px', cursor: 'pointer'
                }}
              >
                ⬅ Previous / السابق
              </button>
            ) : <div />}

            {currentStep < 3 ? (
              <button
                type="button"
                className="ft-btn"
                onClick={handleNextStep}
                style={{
                  background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff',
                  fontWeight: 800, fontSize: '0.95rem', padding: '0.75rem 1.8rem', borderRadius: '14px',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(190, 18, 60, 0.3)'
                }}
              >
                Next / التالي ➔
              </button>
            ) : (
              <button
                type="submit"
                className="ft-btn"
                disabled={isRegistering}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#ffffff',
                  fontWeight: 800, fontSize: '0.95rem', padding: '0.75rem 2rem', borderRadius: '14px',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)'
                }}
              >
                {isRegistering ? 'Registering...' : 'Complete Registration 🚀'}
              </button>
            )}
          </div>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1.5rem', color: 'var(--ft-text-secondary)', fontWeight: 500 }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 700, color: 'var(--ft-primary)', textDecoration: 'none' }}>Login here</Link>
        </div>
      </div>

      {/* POPUP MODAL: SCIENTISTS & MAD PERSONAS / PHOTO UPLOAD */}
      {showAvatarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="ft-card ft-animate-in" style={{
            width: '100%', maxWidth: '580px', padding: '2rem', background: '#ffffff',
            borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                  🎨 Avatars Gallery
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0', fontWeight: 500 }}>
                  Select an avatar or upload your custom profile photo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.1rem', fontWeight: 800, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setModalTab('presets')}
                style={{
                  flex: 1, padding: '0.55rem', fontSize: '0.85rem', fontWeight: 800, borderRadius: '10px', border: 'none',
                  background: modalTab === 'presets' ? '#ffffff' : 'transparent',
                  color: modalTab === 'presets' ? '#be123c' : '#64748b',
                  boxShadow: modalTab === 'presets' ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer'
                }}
              >
                🧪 Avatars
              </button>
              <button
                type="button"
                onClick={() => setModalTab('upload')}
                style={{
                  flex: 1, padding: '0.55rem', fontSize: '0.85rem', fontWeight: 800, borderRadius: '10px', border: 'none',
                  background: modalTab === 'upload' ? '#ffffff' : 'transparent',
                  color: modalTab === 'upload' ? '#be123c' : '#64748b',
                  boxShadow: modalTab === 'upload' ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer'
                }}
              >
                📸 Upload Custom Photo
              </button>
            </div>

            {/* Tab 1: Scientist & Persona Gallery Grid */}
            {modalTab === 'presets' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>
                    Choose an avatar:
                  </span>
                  <button
                    type="button"
                    onClick={handleRandomizeAvatar}
                    style={{
                      background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#0f172a',
                      fontSize: '0.78rem', fontWeight: 800, padding: '0.35rem 0.8rem', borderRadius: '8px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    🎲 Random Avatar
                  </button>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '0.85rem',
                  maxHeight: '340px', overflowY: 'auto', padding: '0.75rem', background: '#f8fafc',
                  border: '1.5px solid #e2e8f0', borderRadius: '18px'
                }}>
                  {SCIENTIST_AVATARS.map((item) => {
                    const url = `https://api.dicebear.com/7.x/${item.style}/svg?seed=${item.seed}`;
                    const isSelected = avatar === url || (selectedSeed === item.seed && avatarMode === 'preset');
                    return (
                      <div
                        key={item.seed}
                        onClick={() => {
                          setSelectedSeed(item.seed);
                          setAvatar(url);
                          setAvatarMode('preset');
                        }}
                        className={`ft-avatar-card ${isSelected ? 'selected' : ''}`}
                      >
                        {/* 4D Persona Props Breaking Out of Frame */}
                        {item.propTop && <span className="ft-4d-prop-top">{item.propTop}</span>}
                        {item.propLeft && <span className="ft-4d-prop-left">{item.propLeft}</span>}
                        {item.propBottom && <span className="ft-4d-prop-bottom">{item.propBottom}</span>}

                        <div className="ft-4d-portal-wrap">
                          <div className="ft-4d-portal-base" />
                          <img
                            src={url}
                            alt={item.name}
                            className="ft-4d-character"
                          />
                        </div>

                        <div className="ft-avatar-title" style={{ marginTop: '0.4rem' }}>
                          {item.name.split('').map((char, charIdx) => (
                            <span
                              key={charIdx}
                              className="ft-avatar-letter"
                              style={{ display: char === ' ' ? 'inline' : 'inline-block', width: char === ' ' ? '0.25em' : 'auto' }}
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Custom Photo Upload */}
            {modalTab === 'upload' && (
              <div style={{ padding: '1.75rem 1.25rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                  Upload Custom Profile Picture
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', fontWeight: 500 }}>
                  Select any photo from your device. It will be automatically resized & compressed.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    await handleAvatarChange(e);
                  }}
                  style={{ fontSize: '0.85rem', color: '#334155', margin: '0 auto', maxWidth: '300px' }}
                />

                {uploadingAvatar && (
                  <div style={{ fontSize: '0.82rem', color: '#be123c', marginTop: '1rem', fontWeight: 800 }}>
                    ⏳ Compressing & uploading picture...
                  </div>
                )}
              </div>
            )}

            {/* Done / Confirm Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="ft-btn"
                onClick={() => setShowAvatarModal(false)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#ffffff',
                  fontWeight: 800, fontSize: '0.9rem', padding: '0.65rem 1.6rem', borderRadius: '12px',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
                }}
              >
                Done / Select Picture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
