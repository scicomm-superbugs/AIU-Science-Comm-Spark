import { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { db, firestore, getCollectionName, useLiveCollection, getFirebaseAuth, uploadFile } from './db';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { MapPin, BookOpen, Users, Settings, ClipboardCheck, LayoutDashboard, LogOut, Moon, Sun, Menu, X, ChevronDown, GraduationCap, Bell, AlertTriangle, Calendar, FileText, Globe, Camera, TestTube, RotateCcw } from 'lucide-react';
import { FT_FACULTY, FT_ROLE_LABELS, FT_ROLE_COLORS, isFacultyRole, isJudgeRole, isCompetitorRole, FT_DEFAULT_REQUIRED_HOURS } from './ftConstants';
import { getUserConflicts } from './ftConflictUtils';
import bcrypt from 'bcryptjs';
import './scicommspark.css';

export default function FTLayout() {
  const { user, setUser, logout, viewAsMode, setViewAsMode, isRealAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [meDoc, setMeDoc] = useState(null);
  const userRole = user?.role || 'competitor';

  const [resettingTestData, setResettingTestData] = useState(false);

  const handleResetTestData = async () => {
    if (!window.confirm('⚠️ Are you sure you want to RESET TEST & ADMIN SUBMISSIONS?\n\nThis will delete test submissions, test evaluation scores, and test notifications for test users and Admin test runs.\n\nReal competitors, real judges, and admin evaluation management configurations will remain untouched.')) {
      return;
    }

    setResettingTestData(true);
    try {
      const TEST_KEYS = [
        'test_comp_pop_team', 'test_comp_pop_solo', 'test_comp_jour_team', 'test_comp_jour_solo',
        'student_pop_team', 'student_pop_ind', 'student_jour_team', 'student_jour_ind',
        'test-comp-pop-team', 'test-comp-pop-solo', 'test-comp-jour-team', 'test-comp-jour-solo',
        'test_judge_1', 'test_judge_trainer', 'test-judge-1', 'test-judge-trainer',
        'test_judge_academic', 'test_judge_scicomm', 'judge_academic', 'judge_scicomm',
        'J-201', 'J-301', 'J-401', 'C-901', 'C-902', 'C-801', 'C-802'
      ];

      const currentAdminIds = [
        user?.id,
        user?.username,
        user?.email,
        meDoc?.id,
        meDoc?.username,
        meDoc?.email
      ].filter(Boolean);

      const isTestUserOrAdmin = (val) => {
        if (!val) return false;
        const s = String(val).toLowerCase().trim();
        const isKeyMatch = TEST_KEYS.some(k => s.includes(k.toLowerCase())) ||
          s.includes('test-comp') || s.includes('test-judge') || s.includes('test_comp') || s.includes('test_judge');
        const isAdminMatch = currentAdminIds.some(aid => String(aid).toLowerCase().trim() === s);
        return isKeyMatch || isAdminMatch;
      };

      // 1. Delete Submissions created by test accounts or logged-in admin testing
      const subSnap = await getDocs(collection(firestore, getCollectionName('submissions')));
      for (const dSnap of subSnap.docs) {
        const sub = dSnap.data();
        if (
          isTestUserOrAdmin(sub.competitorId) ||
          isTestUserOrAdmin(sub.competitorUsername) ||
          isTestUserOrAdmin(sub.competitorName) ||
          isTestUserOrAdmin(sub.teamId) ||
          isTestUserOrAdmin(sub.teamCode) ||
          isTestUserOrAdmin(sub.competitorCode) ||
          isTestUserOrAdmin(sub.submittedBy) ||
          isTestUserOrAdmin(sub.userId)
        ) {
          try {
            await deleteDoc(doc(firestore, getCollectionName('submissions'), dSnap.id));
          } catch (e) {
            console.warn('Failed to delete test/admin submission doc:', dSnap.id, e);
          }
        }
      }

      // 2. Delete Evaluations for/by test users/judges or admin testing ONLY
      const evalSnap = await getDocs(collection(firestore, getCollectionName('ft_evaluations')));
      for (const dSnap of evalSnap.docs) {
        const ev = dSnap.data();
        if (
          isTestUserOrAdmin(ev.competitorId) ||
          isTestUserOrAdmin(ev.competitorName) ||
          isTestUserOrAdmin(ev.competitorCode) ||
          isTestUserOrAdmin(ev.teamId) ||
          isTestUserOrAdmin(ev.judgeId) ||
          isTestUserOrAdmin(ev.judgeName)
        ) {
          try {
            await deleteDoc(doc(firestore, getCollectionName('ft_evaluations'), dSnap.id));
          } catch (e) {
            console.warn('Failed to delete test/admin evaluation doc:', dSnap.id, e);
          }
        }
      }

      // 3. Delete Published Results ONLY for test submissions (Preserve real admin evaluation management config)
      const pubSnap = await getDocs(collection(firestore, getCollectionName('published_results')));
      for (const dSnap of pubSnap.docs) {
        const pub = dSnap.data();
        if (isTestUserOrAdmin(pub.subId)) {
          try {
            await deleteDoc(doc(firestore, getCollectionName('published_results'), dSnap.id));
          } catch (e) {
            console.warn('Failed to delete test published_results doc:', dSnap.id, e);
          }
        }
      }

      // 4. Delete Notifications for test accounts or admin testing ONLY
      const notifSnap = await getDocs(collection(firestore, getCollectionName('ft_notifications')));
      for (const dSnap of notifSnap.docs) {
        const notif = dSnap.data();
        if (isTestUserOrAdmin(notif.targetUserId) || (notif.title && isTestUserOrAdmin(notif.title))) {
          try {
            await deleteDoc(doc(firestore, getCollectionName('ft_notifications'), dSnap.id));
          } catch (e) {
            console.warn('Failed to delete test notification doc:', dSnap.id, e);
          }
        }
      }

      setViewAsMode(null);
      alert('✅ Reset complete! Test user and Admin test submissions have been cleared. Real competitors, judges, and evaluation management settings were preserved.');
    } catch (err) {
      console.error('Failed to reset test data:', err);
      alert('Failed to reset test data: ' + err.message);
    } finally {
      setResettingTestData(false);
    }
  };

  const avatarFileRef = useRef(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    email: '',
    universityId: '',
    title: '',
    role: '',
    avatar: '',
    password: '',
    confirmPassword: ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Live collections
  const registrations = useLiveCollection('ft_registrations');
  const settings = useLiveCollection('ft_settings');
  const places = useLiveCollection('ft_places');
  const resetRequests = useLiveCollection('ft_reset_requests');
  const notifications = useLiveCollection('ft_notifications');
  const teams = useLiveCollection('ft_teams') || [];

  // Determine if competitor is in a team & calculate effective code
  const myTeam = useMemo(() => {
    if (!user || !teams) return null;
    return teams.find(t => t.members?.some(m => m.userId === user.id || m.username === user.username));
  }, [teams, user]);

  const effectiveCode = useMemo(() => {
    if (myTeam?.code) return myTeam.code; // Shared Team Code if in team!
    if (meDoc?.competitorCode) return meDoc.competitorCode;
    if (meDoc?.competitorIdNumber) return meDoc.competitorIdNumber;
    if (meDoc?.employeeId) return meDoc.employeeId;
    if (meDoc?.universityId) return meDoc.universityId;
    if (user?.id) return `C-${user.id.substring(0, 4).toUpperCase()}`;
    return 'C-101';
  }, [myTeam, meDoc, user]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  const [releaseNotesTab, setReleaseNotesTab] = useState('competitor');
  const [dateConflicts, setDateConflicts] = useState([]);
  const [conflictBannerDismissed, setConflictBannerDismissed] = useState(false);

  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const needsPhone = meDoc && (meDoc.role === 'competitor' || meDoc.role === 'user' || !meDoc.role) && !meDoc.phone;

  // Load full user doc
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const s = await db.scientists.get(user.id);
      if (s) setMeDoc(s);
    })();
  }, [user?.id]);

  // Auto-link pending CSV registrations on load
  useEffect(() => {
    if (!user?.id || !meDoc) return;

    (async () => {
      try {
        const isCompetitor = meDoc.role === 'competitor' || meDoc.role === 'user' || !meDoc.role;
        if (!isCompetitor) return;

        const regCol = getCollectionName('ft_registrations');
        let linkedCount = 0;

        if (meDoc.universityId) {
          const q1 = query(
            collection(firestore, regCol),
            where('competitorUniversityId', '==', meDoc.universityId)
          );
          const snap1 = await getDocs(q1);

          for (const docSnap of snap1.docs) {
            const reg = docSnap.data();
            if (!reg.competitorId) {
              await db.ft_registrations.update(docSnap.id, {
                competitorId: user.id,
                competitorName: meDoc.name || reg.competitorName || '',
                competitorEmail: meDoc.email || reg.competitorEmail || '',
                competitorDepartment: meDoc.department || reg.competitorDepartment || ''
              });
              linkedCount++;
            }
          }
        }

        if (meDoc.email) {
          const q2 = query(
            collection(firestore, regCol),
            where('competitorEmail', '==', meDoc.email)
          );
          const snap2 = await getDocs(q2);
          for (const docSnap of snap2.docs) {
            const reg = docSnap.data();
            if (!reg.competitorId) {
              await db.ft_registrations.update(docSnap.id, {
                competitorId: user.id,
                competitorName: meDoc.name || reg.competitorName || '',
                competitorEmail: meDoc.email || reg.competitorEmail || '',
                competitorDepartment: meDoc.department || reg.competitorDepartment || ''
              });
              linkedCount++;
            }
          }
        }

        if (linkedCount > 0) {
          console.log(`Auto-linked ${linkedCount} pre-assigned registrations for competitor ${meDoc.name}`);
        }
      } catch (err) {
        console.error("Failed to auto-link registrations:", err);
      }
    })();
  }, [user?.id, meDoc]);

  // Seed system release notes notifications once on load
  useEffect(() => {
    (async () => {
      try {
        const notifCol = getCollectionName('ft_notifications');
        const q = query(
          collection(firestore, notifCol),
          where('type', '==', 'system_release_notes')
        );
        const snap = await getDocs(q);
        snap.forEach(async (dSnap) => {
          try {
            await deleteDoc(doc(firestore, notifCol, dSnap.id));
          } catch (err) {
            console.warn('Failed to delete old release note notification:', err);
          }
        });
      } catch (err) {
        console.error("Failed to seed system release notes notifications:", err);
      }
    })();
  }, []);

  // Auto-switch release notes tab based on role when modal opens
  useEffect(() => {
    if (showReleaseNotesModal) {
      if (userRole === 'admin' || userRole === 'master' || userRole === 'faculty') {
        setReleaseNotesTab('admin');
      } else if (userRole === 'judge') {
        setReleaseNotesTab('judge');
      } else {
        setReleaseNotesTab('competitor');
      }
    }
  }, [showReleaseNotesModal, userRole]);

  // Auto-approve pending registrations past their deadline
  useEffect(() => {
    if (places && registrations) {
      const now = new Date();
      places.forEach(async (place) => {
        // Find pending registrations for this place
        const pendingRegsForPlace = registrations.filter(r => r.placeId === place.id && r.status === 'pending');
        for (const reg of pendingRegsForPlace) {
          let isPassed = false;
          if (place.registrationDeadline) {
            const deadline = new Date(place.registrationDeadline);
            if (deadline < now) isPassed = true;
          }
          if (!isPassed && reg.waveId) {
            const matchedWave = place.hasPrograms
              ? place.programs?.find(p => p.id === reg.programId)?.waves?.find(w => w.id === reg.waveId)
              : place.waves?.find(w => w.id === reg.waveId);
            if (matchedWave?.deadline) {
              const waveDeadline = new Date(matchedWave.deadline);
              if (waveDeadline < now) isPassed = true;
            }
          }

          if (isPassed) {
            try {
              await db.ft_registrations.update(reg.id, {
                status: 'active',
                approvedAt: now.toISOString(),
                autoApproved: true
              });
              await db.ft_notifications.add({
                title: 'Registration Auto-Approved ⏱️',
                message: `Your registration for ${reg.placeName} was auto-approved as the deadline has passed.`,
                type: 'registration_approved',
                status: 'unread',
                targetRoles: ['competitor', 'user'],
                targetUserId: reg.competitorId,
                createdAt: new Date().toISOString(),
                link: '/my-competition'
              });
              console.log(`Auto-approved registration ${reg.id} for competitor ${reg.competitorName} (deadline passed)`);
            } catch (e) {
              console.error("Failed to auto-approve registration on deadline:", e);
            }
          }
        }
      });
    }
  }, [places, registrations]);

  // Scan for date conflicts and seed warning notifications for competitors
  useEffect(() => {
    if (!user?.id || !registrations || !places || !meDoc) return;
    const isCompetitor = isCompetitorRole(meDoc.role) || meDoc.role === 'user' || !meDoc.role;
    if (!isCompetitor) { setDateConflicts([]); return; }

    const conflicts = getUserConflicts(user.id, registrations, places);
    setDateConflicts(conflicts);

    if (conflicts.length > 0) {
      (async () => {
        try {
          const notifCol = getCollectionName('ft_notifications');
          const q = query(
            collection(firestore, notifCol),
            where('type', '==', 'date_conflict'),
            where('targetUserId', '==', user.id)
          );
          const snap = await getDocs(q);
          if (snap.empty) {
            await db.ft_notifications.add({
              title: '⚠️ Schedule Conflict Detected',
              message: `You have ${conflicts.length} overlapping wave registration(s). Please review your competition schedule to avoid time conflicts.`,
              type: 'date_conflict',
              status: 'unread',
              targetRoles: ['competitor', 'user'],
              targetUserId: user.id,
              createdAt: new Date().toISOString(),
              link: '/my-competition'
            });
          }
        } catch (err) {
          console.error('Failed to seed date conflict notification:', err);
        }
      })();
    }
  }, [user?.id, registrations, places, meDoc]);

  // Auto-sync registration records when user profile changes
  useEffect(() => {
    if (!user?.id || !meDoc || !registrations) return;
    const isCompetitor = isCompetitorRole(meDoc.role) || meDoc.role === 'user' || !meDoc.role;
    if (!isCompetitor) return;

    (async () => {
      try {
        const myRegs = registrations.filter(r => r.competitorId === user.id);
        for (const reg of myRegs) {
          const needsUpdate =
            (meDoc.name && reg.competitorName !== meDoc.name) ||
            (meDoc.universityId && reg.competitorUniversityId !== meDoc.universityId) ||
            (meDoc.email && reg.competitorEmail !== meDoc.email) ||
            (meDoc.department && reg.competitorDepartment !== meDoc.department);
          if (needsUpdate) {
            await db.ft_registrations.update(reg.id, {
              competitorName: meDoc.name || reg.competitorName || '',
              competitorUniversityId: meDoc.universityId || reg.competitorUniversityId || '',
              competitorEmail: meDoc.email || reg.competitorEmail || '',
              competitorDepartment: meDoc.department || reg.competitorDepartment || ''
            });
          }
        }
      } catch (err) {
        console.error('Failed to sync registration records with profile:', err);
      }
    })();
  }, [user?.id, meDoc?.name, meDoc?.universityId, meDoc?.email, meDoc?.department, registrations]);

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await uploadFile(file, 'avatars');
      setProfileForm(prev => ({ ...prev, avatar: base64 }));
    } catch (err) {
      setProfileError('Failed to process image: ' + err.message);
    }
  };

  useEffect(() => {
    if (meDoc) {
      setProfileForm({
        name: meDoc.name || '',
        username: meDoc.username || '',
        email: meDoc.email || '',
        universityId: meDoc.universityId || '',
        title: meDoc.title || '',
        role: meDoc.role || '',
        avatar: meDoc.avatar || meDoc.avatarUrl || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [meDoc, showProfileModal]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.email || !profileForm.email.includes('@')) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    if (!profileForm.username || !profileForm.username.trim()) {
      setProfileError('Please enter a valid username.');
      return;
    }

    if (profileForm.password.trim()) {
      if (profileForm.password !== profileForm.confirmPassword) {
        setProfileError('Passwords do not match');
        return;
      }
      if (profileForm.password.length < 6) {
        setProfileError('Password must be at least 6 characters');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const updates = {
        name: profileForm.name.trim(),
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        universityId: profileForm.universityId ? profileForm.universityId.trim() : '',
        title: (profileForm.title || '').trim(),
        role: profileForm.role,
        avatar: profileForm.avatar || null,
        avatarUrl: profileForm.avatar || null,
        updatedAt: new Date().toISOString()
      };

      if (profileForm.password.trim()) {
        const salt = await bcrypt.genSalt(4);
        updates.passwordHash = await bcrypt.hash(profileForm.password, salt);
      }

      await db.scientists.update(user.id, updates);
      
      // Update local state meDoc & auth user details
      setMeDoc(prev => ({ ...prev, ...updates }));
      setUser(prev => ({
        ...prev,
        username: updates.username,
        name: updates.name,
        role: updates.role,
        avatar: updates.avatar
      }));

      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccess('');
      }, 1500);
    } catch (err) {
      setProfileError('Failed to update profile: ' + err.message);
    }
    setSavingProfile(false);
  };

  const handleLinkGoogle = async () => {
    setProfileError('');
    setProfileSuccess('');
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      if (!googleUser || !googleUser.email) {
        throw new Error('Could not retrieve Google account details.');
      }

      const googleEmail = googleUser.email;

      const existingLink = await db.scientists.where('googleEmail').equals(googleEmail).first();
      if (existingLink && existingLink.id !== user.id) {
        setProfileError(`This Google account (${googleEmail}) is already linked to another user.`);
        return;
      }

      const existingEmail = await db.scientists.where('email').equals(googleEmail).first();
      if (existingEmail && existingEmail.id !== user.id) {
        setProfileError(`This Google account email (${googleEmail}) is already registered as another user's primary email.`);
        return;
      }

      await db.scientists.update(user.id, { googleEmail });
      setMeDoc(prev => ({ ...prev, googleEmail }));
      setProfileSuccess(`Successfully linked Google account: ${googleEmail}`);
      setTimeout(() => {
        setProfileSuccess('');
      }, 3000);
    } catch (err) {
      setProfileError('Failed to link Google account: ' + err.message);
    }
  };

  // Enforce Light mode only
  useEffect(() => {
    document.documentElement.classList.remove('ft-dark');
    localStorage.setItem('ft-theme', 'light');
  }, []);

  // Compute credit hours for current competitor
  const creditData = useMemo(() => {
    if (!registrations || !user) return { registered: 0, completed: 0, required: FT_DEFAULT_REQUIRED_HOURS };
    
    const settingsDoc = settings?.find(s => s.id === 'global');
    const requiredHours = settingsDoc?.requiredCreditHours || FT_DEFAULT_REQUIRED_HOURS;

    const myRegs = registrations.filter(r => r.competitorId === user.id);
    let registered = 0;
    let completed = 0;

    myRegs.forEach(reg => {
      const place = places?.find(p => p.id === reg.placeId);
      const hours = place?.creditHours || reg.creditHours || 0;
      registered += hours;
      if (reg.status === 'completed') {
        completed += hours;
      }
    });

    return { registered, completed, required: requiredHours };
  }, [registrations, settings, places, user]);

  const progressPct = creditData.required > 0 ? Math.min(100, Math.round((creditData.completed / creditData.required) * 100)) : 0;

  const myNotifications = useMemo(() => {
    if (!notifications || !user) return [];
    const effectiveRole = user.role || userRole || 'competitor';
    return notifications
      .filter(n => {
        // Exclude old release notes notifications
        if (n.type === 'system_release_notes' || n.title?.includes('Version 2.0 is Live!')) return false;

        // Direct target user match
        if (n.targetUserId && (n.targetUserId === user.id || n.targetUserId === user.username)) return true;
        
        // Role target match
        if (n.targetRoles && Array.isArray(n.targetRoles)) {
          if (n.targetRoles.includes(effectiveRole)) return true;
          if ((effectiveRole === 'master' || effectiveRole === 'admin') && (n.targetRoles.includes('admin') || n.targetRoles.includes('master'))) return true;
          if ((effectiveRole === 'academic_judge' || effectiveRole === 'scicomm_judge' || effectiveRole === 'judge') && n.targetRoles.includes('judge')) return true;
          if (effectiveRole === 'competitor' && n.targetRoles.includes('competitor')) return true;
        }

        return false;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, user, userRole]);

  const unreadCount = useMemo(() => {
    return myNotifications.filter(n => n.status === 'unread').length;
  }, [myNotifications]);

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleMarkAllRead = async () => {
    const unreads = myNotifications.filter(n => n.status === 'unread');
    for (const notif of unreads) {
      try {
        await db.ft_notifications.update(notif.id, { status: 'read' });
      } catch (e) {
        console.error('Failed to mark read:', e);
      }
    }
  };

  const handleNotificationClick = async (notif) => {
    setShowNotifications(false);
    try {
      await db.ft_notifications.update(notif.id, { status: 'read' });
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
    if (notif.link === '#open-release-notes') {
      setShowReleaseNotesModal(true);
    } else if (notif.link) {
      navigate(notif.link);
    }
  };

  const isActive = (path) => {
    if (path === '/dashboard' || path === '/') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.includes(path.replace('/dashboard/', ''));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = useMemo(() => {
    const isCompetitor = isCompetitorRole(userRole) || userRole === 'user';
    const partMode = user?.isImpersonating
      ? user?.participationMode
      : (meDoc?.participationMode === 'team' || Boolean(myTeam) ? 'team' : 'individual');
    const isTeamCompetitor = isCompetitor && partMode === 'team';
    const leaderboardLabel = isTeamCompetitor ? 'Our Team & Leaderboard' : 'Leaderboard & Progress';

    const items = [
      { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Timeline & Tracks', roles: 'all' },
      { path: '/dashboard/my-competition', icon: <BookOpen size={20} />, label: 'My Submissions', roles: ['competitor', 'user'] },
      { path: '/dashboard/our-team', icon: <Users size={20} />, label: leaderboardLabel, roles: 'all' },
      { path: '/dashboard/judge', icon: <ClipboardCheck size={20} />, label: 'Judge & Trainer Portal', roles: ['judge', 'trainer_judge', 'academic_judge', 'scicomm_judge'] },
      { section: 'Management', roles: ['master', 'admin'] },
      { path: '/dashboard/competitors', icon: <Users size={20} />, label: 'Users & Roles', roles: ['master', 'admin'] },
      { path: '/dashboard/timeline-manage', icon: <Calendar size={20} />, label: 'Timeline Management', roles: ['master', 'admin'] },
      { path: '/dashboard/evaluation-management', icon: <ClipboardCheck size={20} />, label: 'Evaluation Management', roles: ['master', 'admin'] },
      { path: '/dashboard/settings', icon: <Settings size={20} />, label: 'Settings', roles: ['master', 'admin'] },
      { path: '/landing', icon: <Globe size={20} />, label: 'Public Landing Page', roles: ['master', 'admin'] },
    ];
    return items.filter(item => {
      if (item.roles === 'all') return true;
      if (!user?.isImpersonating && (userRole === 'master' || userRole === 'admin')) return true;
      return item.roles?.includes(userRole);
    });
  }, [userRole, meDoc, myTeam, user?.isImpersonating, user?.participationMode, user?.viewAsMode]);

  const isAdmin = userRole === 'master' || userRole === 'admin';
  const isStaff = userRole === 'master' || userRole === 'admin' || userRole === 'judge' || userRole === 'faculty';
  const competitorOverviewItems = useMemo(() => navItems.filter(item => item.path === '/dashboard' || item.path === '/dashboard/my-competition' || item.path === '/dashboard/our-team' || item.path === '/' || item.path === '/my-competition' || item.path === '/our-team'), [navItems]);
  const judgeOverviewItems = useMemo(() => navItems.filter(item => item.path === '/dashboard/judge' || item.path === '/judge'), [navItems]);
  const otherItems = useMemo(() => navItems.filter(item => !['/dashboard', '/dashboard/my-competition', '/dashboard/our-team', '/dashboard/judge', '/', '/my-competition', '/our-team', '/judge'].includes(item.path)), [navItems]);

  // Get unread notification / action count for a specific sidebar section
  const getSectionUnreadCount = (itemPath) => {
    if (!itemPath) return 0;
    const cleanPath = String(itemPath).replace(/\/$/, '');

    // 1. Filter unread notifications for this section
    const unreadNotifs = (myNotifications || []).filter(n => {
      if (n.status !== 'unread') return false;
      const cleanLink = n.link ? String(n.link).split('?')[0].split('#')[0].replace(/\/$/, '') : '';

      // Direct link match
      if (cleanLink && (cleanLink === cleanPath || (cleanPath !== '/dashboard' && cleanLink.startsWith(cleanPath)))) {
        return true;
      }

      // Type-based section mapping
      if (cleanPath === '/dashboard/my-competition') {
        return ['evaluation', 'grade', 'submission_feedback', 'registration_approved'].includes(n.type);
      }
      if (cleanPath === '/dashboard/judge') {
        return ['assignment', 'judge', 'judge_eval'].includes(n.type);
      }
      if (cleanPath === '/dashboard/competitors') {
        return ['registration', 'user', 'role'].includes(n.type);
      }
      if (cleanPath === '/dashboard/evaluation-management') {
        return ['submission'].includes(n.type);
      }
      if (cleanPath === '/dashboard/our-team') {
        return ['team', 'leaderboard'].includes(n.type);
      }
      if (cleanPath === '/dashboard') {
        return ['workshop', 'announcement', 'general', 'date_conflict'].includes(n.type);
      }
      return false;
    });

    let extraCount = 0;

    // 2. Extra section-specific pending action counters (for admins/judges)
    if (cleanPath === '/dashboard/competitors' && (userRole === 'admin' || userRole === 'master')) {
      const pendingResets = (resetRequests || []).filter(r => r.status === 'pending').length;
      extraCount += pendingResets;
    }

    return unreadNotifs.length + extraCount;
  };

  const handleSectionClick = async (itemPath) => {
    setSidebarOpen(false);
    if (!itemPath) return;
    const cleanPath = String(itemPath).replace(/\/$/, '');
    const unreadSectionNotifs = (myNotifications || []).filter(n => {
      if (n.status !== 'unread') return false;
      const cleanLink = n.link ? String(n.link).split('?')[0].split('#')[0].replace(/\/$/, '') : '';
      return cleanLink === cleanPath || (cleanPath !== '/dashboard' && cleanLink.startsWith(cleanPath));
    });
    for (const notif of unreadSectionNotifs) {
      try {
        await db.ft_notifications.update(notif.id, { status: 'read' });
      } catch (e) {
        console.error('Failed to mark section notification read:', e);
      }
    }
  };

  const renderNavLink = (item) => {
    if (item.section) {
      return <div key={item.section} className="ft-sidebar-section-label">{item.section}</div>;
    }
    const count = getSectionUnreadCount(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`ft-sidebar-link ${isActive(item.path) ? 'active' : ''}`}
        onClick={() => handleSectionClick(item.path)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {item.icon}
          <span>{item.label}</span>
        </div>
        {count > 0 && (
          <span style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #be123c 100%)',
            color: '#ffffff',
            fontSize: '0.72rem',
            fontWeight: 900,
            borderRadius: '9999px',
            padding: '0.12rem 0.45rem',
            minWidth: '20px',
            height: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(225, 29, 72, 0.45)',
            lineHeight: 1,
            marginLeft: '0.5rem',
            flexShrink: 0
          }}>
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="ft-app">
      {/* ── Top Navbar ─────────────────────────────────────── */}
      <nav className="ft-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="ft-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link to="/dashboard" className="ft-navbar-brand" style={{ textDecoration: 'none' }}>
            <img src="./spark_logo.png" alt="SciComm Spark Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <div className="ft-navbar-brand-text">SciComm Spark Competition</div>
              <div className="ft-navbar-brand-sub">{FT_FACULTY}</div>
            </div>
          </Link>
        </div>


        {/* Center Admin View As Role Impersonation Selector & Reset Test Button */}
        {isRealAdmin && (
          <div className="ft-admin-top-bar" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.65rem', margin: '0 1rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: user?.isImpersonating ? '#eef2ff' : '#f8fafc',
              padding: '0.35rem 0.85rem',
              borderRadius: '12px',
              border: user?.isImpersonating ? '1.5px solid #6366f1' : '1px solid #cbd5e1',
              boxShadow: user?.isImpersonating ? '0 2px 10px rgba(99, 102, 241, 0.18)' : '0 2px 6px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: user?.isImpersonating ? '#4338ca' : '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                👁️ View As:
              </span>
              <select
                value={user?.viewAsMode || 'normal'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'normal') {
                    setViewAsMode(null);
                  } else {
                    setViewAsMode(val);
                    if (val.startsWith('student')) {
                      navigate('/dashboard/my-competition');
                    } else if (val.startsWith('judge')) {
                      navigate('/dashboard/judge');
                    }
                  }
                }}
                title="Admin View As Role Impersonation"
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: user?.isImpersonating ? '#3730a3' : '#0f172a',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="normal">👑 Back to Admin (Full Access)</option>
                <optgroup label="👤 Test Competitor Accounts">
                  <option value="student_pop_team">👤 test-comp-pop-team (ID: C-901) — Pop Science (Team Lead)</option>
                  <option value="student_pop_ind">👤 test-comp-pop-solo (ID: C-902) — Pop Science (Solo)</option>
                  <option value="student_jour_team">📰 test-comp-jour-team (ID: C-801) — Journalism (Team Lead)</option>
                  <option value="student_jour_ind">📰 test-comp-jour-solo (ID: C-802) — Journalism (Solo)</option>
                </optgroup>
                <optgroup label="⚖️ Test Judge Accounts">
                  <option value="judge_academic">⚖️ test-judge-1 (ID: J-201) — Judge</option>
                  <option value="judge_scicomm">🎓 test-judge-trainer (ID: J-301) — Trainer & Judge (Dual)</option>
                </optgroup>
              </select>
            </div>

            <button
              onClick={handleResetTestData}
              disabled={resettingTestData}
              title="Reset all test user submissions, scores, comments, and notifications"
              style={{
                background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                color: '#be123c',
                border: '1.5px solid #fecdd3',
                padding: '0.35rem 0.85rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: resettingTestData ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(190, 18, 60, 0.08)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={14} style={{ animation: resettingTestData ? 'spin 1s linear infinite' : 'none' }} />
              {resettingTestData ? 'Resetting Test Data...' : '🔄 Reset Test Users & Submissions'}
            </button>
          </div>
        )}

        <div className="ft-navbar-actions">
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              className="ft-theme-toggle" 
              onClick={() => setShowNotifications(!showNotifications)} 
              title="Notifications"
              style={{ position: 'relative' }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="ft-bell-badge">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setShowNotifications(false)} />
                <div className="ft-notifications-dropdown">
                  <div className="ft-notifications-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        style={{ background: 'none', border: 'none', color: 'var(--ft-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="ft-notifications-list">
                    {myNotifications.length === 0 ? (
                      <div className="ft-notifications-empty">No notifications yet.</div>
                    ) : (
                      myNotifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`ft-notifications-item ${notif.status}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="ft-notifications-item-icon">
                            {notif.type === 'evaluation' ? '🏅' :
                             notif.type === 'assignment' ? '⚖️' :
                             notif.type === 'registration' ? '👤' :
                             notif.type === 'submission' ? '📤' :
                             notif.type === 'workshop' ? '🎓' :
                             notif.type === 'stage_deadline_reminder' ? '⏳' :
                             notif.type?.includes('approved') ? '🎉' :
                             notif.type?.includes('rejected') ? '❌' : '🔔'}
                          </div>
                          <div className="ft-notifications-item-content">
                            <div className="ft-notifications-item-title">{notif.title}</div>
                            <div className="ft-notifications-item-message">{notif.message}</div>
                            <div className="ft-notifications-item-time">{formatTimeAgo(notif.createdAt)}</div>
                          </div>
                          {notif.status === 'unread' && <div className="ft-notifications-unread-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>



          <div className="ft-user-menu">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              {meDoc?.avatar ? (
                <img src={meDoc.avatar} alt="" className="ft-navbar-avatar" />
              ) : (
                <div className="ft-navbar-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ft-primary-bg)', color: 'var(--ft-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                  {(meDoc?.name || user?.name || '?')[0]?.toUpperCase()}
                </div>
              )}
              <ChevronDown size={14} style={{ color: 'var(--ft-text-muted)', transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : '' }} />
            </button>

            {userMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setUserMenuOpen(false)} />
                <div className="ft-user-dropdown">
                  <div style={{ padding: '0.75rem 0.85rem', borderBottom: '1px solid var(--ft-border-light)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{meDoc?.name || user?.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ft-text-muted)' }}>{meDoc?.email || ''}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="ft-badge ft-badge-role" style={{ background: `${FT_ROLE_COLORS[userRole]}15`, color: FT_ROLE_COLORS[userRole] }}>
                        {FT_ROLE_LABELS[userRole] || userRole}
                      </span>
                      
                      {/* Code Badge: Render ONLY for competitors */}
                      {(isCompetitorRole(userRole) || userRole === 'user') && (
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px',
                          background: myTeam ? '#fff1f2' : '#eff6ff',
                          color: myTeam ? '#be123c' : '#2563eb',
                          border: `1px solid ${myTeam ? '#fecdd3' : '#bfdbfe'}`,
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                        }}>
                          🏷️ Competitor Code: {effectiveCode}
                        </span>
                      )}
                    </div>
                  </div>
                  {meDoc?.department && (
                    <div style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', color: 'var(--ft-text-muted)' }}>
                      <GraduationCap size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                      {meDoc.department}
                    </div>
                  )}
                  <div className="ft-user-dropdown-divider" />
                  <button className="ft-user-dropdown-item" onClick={() => { navigate('/'); setUserMenuOpen(false); }}>
                    🌐 Public Landing Page
                  </button>
                  <button className="ft-user-dropdown-item" onClick={() => { setShowProfileModal(true); setUserMenuOpen(false); }}>
                    ⚙️ Edit Profile
                  </button>

                  {/* Admin "View As" Impersonation Options in User Menu */}
                  {isRealAdmin && (
                    <>
                      <div className="ft-user-dropdown-divider" />
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', padding: '0.3rem 0.85rem 0.1rem 0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        👁️ Admin View As Mode
                      </div>
                      <button
                        className="ft-user-dropdown-item"
                        style={{ background: (user?.viewAsMode === 'student_pop_team' || user?.viewAsMode === 'student_pop') ? '#f0fdf4' : 'transparent', fontWeight: 700 }}
                        onClick={() => { setViewAsMode('student_pop_team'); setUserMenuOpen(false); navigate('/dashboard/my-competition'); }}
                      >
                        👤 test-comp-pop-team (C-901) — Pop Science (Team Lead)
                      </button>
                      <button
                        className="ft-user-dropdown-item"
                        style={{ background: user?.viewAsMode === 'student_pop_ind' ? '#f0fdf4' : 'transparent', fontWeight: 700 }}
                        onClick={() => { setViewAsMode('student_pop_ind'); setUserMenuOpen(false); navigate('/dashboard/my-competition'); }}
                      >
                        👤 test-comp-pop-solo (C-902) — Pop Science (Solo)
                      </button>
                      <button
                        className="ft-user-dropdown-item"
                        style={{ background: (user?.viewAsMode === 'student_jour_team' || user?.viewAsMode === 'student_jour') ? '#eff6ff' : 'transparent', fontWeight: 700 }}
                        onClick={() => { setViewAsMode('student_jour_team'); setUserMenuOpen(false); navigate('/dashboard/my-competition'); }}
                      >
                        📰 test-comp-jour-team (C-801) — Journalism (Team Lead)
                      </button>
                      <button
                        className="ft-user-dropdown-item"
                        style={{ background: user?.viewAsMode === 'student_jour_ind' ? '#eff6ff' : 'transparent', fontWeight: 700 }}
                        onClick={() => { setViewAsMode('student_jour_ind'); setUserMenuOpen(false); navigate('/dashboard/my-competition'); }}
                      >
                        📰 test-comp-jour-solo (C-802) — Journalism (Solo)
                      </button>
                      <button
                        className="ft-user-dropdown-item"
                        style={{ background: user?.viewAsMode === 'judge_academic' ? '#f0f9ff' : 'transparent', fontWeight: 700 }}
                        onClick={() => { setViewAsMode('judge_academic'); setUserMenuOpen(false); navigate('/dashboard/judge'); }}
                      >
                        ⚖️ test-judge-1 (J-201) — Judge
                      </button>
                      <button
                        className="ft-user-dropdown-item"
                        style={{ background: user?.viewAsMode === 'judge_scicomm' ? '#fff1f2' : 'transparent', fontWeight: 700 }}
                        onClick={() => { setViewAsMode('judge_scicomm'); setUserMenuOpen(false); navigate('/dashboard/judge'); }}
                      >
                        🎓 test-judge-trainer (J-301) — Trainer & Judge (Dual)
                      </button>
                      {user?.isImpersonating && (
                        <button
                          className="ft-user-dropdown-item"
                          style={{ color: '#047857', fontWeight: 800, background: '#ecfdf5', marginTop: '0.2rem' }}
                          onClick={() => { setViewAsMode(null); setUserMenuOpen(false); }}
                        >
                          👑 Back to Admin
                        </button>
                      )}
                    </>
                  )}
                  <div className="ft-user-dropdown-divider" />
                  <button className="ft-user-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Sidebar ────────────────────────────────────────── */}
      {sidebarOpen && <div className="ft-sidebar-overlay active" onClick={() => setSidebarOpen(false)} />}
      <aside className={`ft-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <nav className="ft-sidebar-nav">
          {isAdmin ? (
            <>
              {/* Competitor Overview Box Wrapper */}
              <div style={{
                background: 'var(--ft-bg-input)',
                border: '1.5px solid var(--ft-border)',
                borderRadius: 'var(--ft-radius)',
                padding: '0.4rem',
                marginBottom: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--ft-primary)',
                  padding: '0.4rem 0.5rem 0.5rem',
                  borderBottom: '1px solid var(--ft-border-light)',
                  marginBottom: '0.25rem',
                  fontFamily: "'Outfit', sans-serif"
                }}>
                  Competitor Overview
                </div>
                {competitorOverviewItems.map(renderNavLink)}
              </div>

              {/* Judge Overview Box Wrapper */}
              {judgeOverviewItems.length > 0 && (
                <div style={{
                  background: 'var(--ft-bg-input)',
                  border: '1.5px solid var(--ft-border)',
                  borderRadius: 'var(--ft-radius)',
                  padding: '0.4rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--ft-primary)',
                    padding: '0.4rem 0.5rem 0.5rem',
                    borderBottom: '1px solid var(--ft-border-light)',
                    marginBottom: '0.25rem',
                    fontFamily: "'Outfit', sans-serif"
                  }}>
                    Judge Overview
                  </div>
                  {judgeOverviewItems.map(renderNavLink)}
                </div>
              )}

              {/* Other Items */}
              {otherItems.map(renderNavLink)}
            </>
          ) : (
            // Competitor: render normally
            navItems.map(renderNavLink)
          )}
        </nav>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="ft-main">
        <div style={{ flex: 1 }}>
           {/* Date Conflict Warning Banner */}
           {dateConflicts.length > 0 && !conflictBannerDismissed && (isCompetitorRole(userRole) || userRole === 'user') && (
             <div style={{
               background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(251,146,60,0.06))',
               border: '1.5px solid rgba(239,68,68,0.2)',
               borderRadius: 'var(--ft-radius)',
               padding: '1rem 1.25rem',
               margin: '0 0 1.25rem',
               display: 'flex',
               alignItems: 'flex-start',
               gap: '0.75rem'
             }}>
               <AlertTriangle size={20} style={{ color: 'var(--ft-danger)', flexShrink: 0, marginTop: '0.1rem' }} />
               <div style={{ flex: 1 }}>
                 <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ft-danger)', marginBottom: '0.35rem', fontFamily: "'Outfit', sans-serif" }}>
                   ⚠️ Schedule Conflict Detected
                 </div>
                 <div style={{ fontSize: '0.82rem', color: 'var(--ft-text-secondary)', lineHeight: 1.6 }}>
                   You have <strong>{dateConflicts.length}</strong> overlapping wave registration(s):
                   {dateConflicts.map((c, i) => (
                     <div key={i} style={{ marginTop: '0.35rem', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', fontSize: '0.78rem' }}>
                       <strong>{c.place1?.name}</strong> ({c.wave1?.name})
                       <span style={{ margin: '0 0.35rem', color: 'var(--ft-danger)' }}>⟷</span>
                       <strong>{c.place2?.name}</strong> ({c.wave2?.name})
                     </div>
                   ))}
                 </div>
                 <div style={{ fontSize: '0.78rem', color: 'var(--ft-text-muted)', marginTop: '0.5rem' }}>
                   Please visit your registrations and consider changing to a non-conflicting wave.
                 </div>
               </div>
               <button
                 onClick={() => setConflictBannerDismissed(true)}
                 style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ft-text-muted)', padding: '0.25rem', flexShrink: 0 }}
                 title="Dismiss"
               >
                 <X size={16} />
               </button>
             </div>
           )}
           <Outlet context={{ meDoc, creditData, userRole, places, registrations, settings, resetRequests }} />
        </div>

        {/* Footer / Downbar */}
        <footer className="ft-footer">
          <div className="ft-footer-content">
            <div className="ft-footer-left" style={{ color: 'var(--ft-text-muted)', fontSize: '0.78rem' }}>
              <span>Designed & Programmed by <strong style={{ color: 'var(--ft-text)', fontWeight: 600 }}>Abdullah Amr Maged</strong></span>
              <span style={{ margin: '0 0.5rem', opacity: 0.4 }}>|</span>
              <span>Teaching Assistant, , AIU</span>
            </div>
            <div className="ft-footer-right" style={{ color: 'var(--ft-text-muted)', fontSize: '0.78rem', fontWeight: 500 }}>
              AIU SciComm Spark Competition System
            </div>
          </div>
        </footer>
      </main>

      {/* ── Mobile Bottom Nav ──────────────────────────────── */}
      <nav className="ft-mobile-nav">
        {navItems
          .filter(item => item.path)
          .map((item) => {
            const active = isActive(item.path);
            const shortLabel = item.label === 'Timeline & Tracks' ? 'Timeline'
              : item.label.includes('Leaderboard') ? 'Team'
              : item.label === 'Judge & Trainer Portal' ? 'Judge Portal'
              : item.label === 'Users & Roles' ? 'Users'
              : item.label === 'Submission Assignments' ? 'Assignments'
              : item.label === 'Timeline Management' ? 'Schedule'
              : item.label;

            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`ft-mobile-nav-item ${active ? 'active' : ''}`}
              >
                {item.icon}
                <span style={{ fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {shortLabel}
                </span>
              </Link>
            );
          })}
      </nav>

      {/* Profile Edit Modal */}
    {showProfileModal && (
      <div className="ft-modal-overlay">
        <div className="ft-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
          <div className="ft-modal-header">
            <h3 className="ft-modal-title">⚙️ Edit Account Profile</h3>
            <button className="ft-btn ft-btn-ghost ft-btn-icon" onClick={() => { setShowProfileModal(false); setProfileError(''); }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleProfileSubmit}>
            <div className="ft-modal-body">
              {profileError && (
                <div style={{ backgroundColor: 'var(--ft-danger-bg)', color: 'var(--ft-danger)', padding: '0.75rem 1rem', borderRadius: 'var(--ft-radius)', marginBottom: '1.25rem', fontSize: '0.82rem', fontWeight: 500, border: '1.5px solid rgba(239, 68, 68, 0.15)' }}>
                  ❌ {profileError}
                </div>
              )}

              {profileSuccess && (
                <div style={{ backgroundColor: 'var(--ft-success-bg)', color: 'var(--ft-success)', padding: '0.75rem 1rem', borderRadius: 'var(--ft-radius)', marginBottom: '1.25rem', fontSize: '0.82rem', fontWeight: 600, border: '1.5px solid rgba(34, 197, 94, 0.15)' }}>
                  ✅ {profileSuccess}
                </div>
              )}

              {/* Profile Avatar Upload & Preview Section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', marginTop: '0.25rem' }}>
                <div style={{ position: 'relative', width: '92px', height: '92px', marginBottom: '0.75rem' }}>
                  {profileForm.avatar ? (
                    <img 
                      src={profileForm.avatar} 
                      alt="Profile Avatar" 
                      style={{ width: '92px', height: '92px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--ft-primary)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }} 
                    />
                  ) : (
                    <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 800, border: '3px solid #ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                      {(profileForm.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    style={{ position: 'absolute', bottom: '0', right: '0', background: '#be123c', color: '#fff', border: '2px solid #fff', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                    title="Upload New Profile Picture"
                  >
                    <Camera size={15} />
                  </button>
                </div>
                <input 
                  ref={avatarFileRef} 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleAvatarFileChange} 
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    style={{ background: 'var(--ft-bg-card-hover, #f1f5f9)', color: 'var(--ft-text-primary, #1e293b)', border: '1px solid var(--ft-border, #cbd5e1)', padding: '0.35rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Camera size={13} /> Change Picture
                  </button>
                  {profileForm.avatar && (
                    <button
                      type="button"
                      onClick={() => setProfileForm(prev => ({ ...prev, avatar: '' }))}
                      style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.35rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Full Name *</label>
                <input 
                  type="text" 
                  className="ft-input" 
                  required 
                  value={profileForm.name} 
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} 
                />
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Username *</label>
                <input 
                  type="text" 
                  className="ft-input" 
                  required 
                  value={profileForm.username} 
                  onChange={e => setProfileForm({ ...profileForm, username: e.target.value })} 
                />
              </div>

              <div className="ft-input-group">
                <label className="ft-label">University Email *</label>
                <input 
                  type="email" 
                  className="ft-input" 
                  required 
                  value={profileForm.email} 
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} 
                />
              </div>

              <div className="ft-input-group">
                <label className="ft-label">Title / Role Title *</label>
                <input 
                  type="text" 
                  className="ft-input" 
                  value={profileForm.title} 
                  onChange={e => setProfileForm({ ...profileForm, title: e.target.value })} 
                  placeholder="e.g. System Administrator (Master) 👑, Researcher, Student"
                />
              </div>

              {isCompetitorRole(profileForm.role) && (
                <div className="ft-input-group">
                  <label className="ft-label">University ID Number</label>
                  <input 
                    type="text" 
                    className="ft-input" 
                    value={profileForm.universityId} 
                    onChange={e => setProfileForm({ ...profileForm, universityId: e.target.value })} 
                  />
                </div>
              )}

              <div className="ft-input-group">
                <label className="ft-label">New Password (Leave blank to keep current)</label>
                <input 
                  type="password" 
                  className="ft-input" 
                  placeholder="Enter new password"
                  value={profileForm.password} 
                  onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} 
                />
              </div>

              {profileForm.password.trim() && (
                <div className="ft-input-group" style={{ marginBottom: 0 }}>
                  <label className="ft-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className="ft-input" 
                    placeholder="Confirm new password"
                    value={profileForm.confirmPassword} 
                    onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} 
                  />
                </div>
              )}

              {/* Google Account Connection */}
              <div className="ft-input-group" style={{ borderTop: '1px solid var(--ft-border-light)', paddingTop: '1rem', marginTop: '1rem', marginBottom: 0 }}>
                <label className="ft-label">Google Account Connection</label>
                {meDoc?.googleEmail ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--ft-success)', fontWeight: 600 }}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 16, height: 16 }} />
                    Linked: {meDoc.googleEmail}
                    <span className="ft-badge ft-badge-success" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Active</span>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={handleLinkGoogle}
                      className="ft-btn ft-btn-secondary ft-btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', padding: '0.5rem 0.85rem' }}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 16, height: 16 }} />
                      Link Google Account
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="ft-modal-footer">
              <button type="button" className="ft-btn ft-btn-secondary" style={{ flex: 1 }} onClick={() => { setShowProfileModal(false); setProfileError(''); }}>
                Cancel
              </button>
              <button type="submit" className="ft-btn ft-btn-primary" style={{ flex: 1 }} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Release Notes Modal */}
    {showReleaseNotesModal && (
      <div className="ft-modal-overlay" onClick={() => setShowReleaseNotesModal(false)}>
        <div className="ft-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <div className="ft-modal-header">
            <h3 className="ft-modal-title">✨ What's New in Version 2.0</h3>
            <button className="ft-modal-close" onClick={() => setShowReleaseNotesModal(false)}><X size={18} /></button>
          </div>
          <div className="ft-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1.25rem' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--ft-text-secondary)', marginBottom: '1.25rem' }}>
              Welcome to Alamein SciComm Spark Competition Version 2.0! We have rolled out exciting updates tailored to your role. Explore the tabs below to see what features are now available.
            </p>
            
            {/* Tabs Inside Modal */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--ft-border-light)', paddingBottom: '0.75rem' }}>
              {['competitor', 'judge', 'admin'].map(tabRole => (
                <button
                  key={tabRole}
                  type="button"
                  onClick={() => setReleaseNotesTab(tabRole)}
                  style={{
                    background: releaseNotesTab === tabRole ? 'var(--ft-primary-bg)' : 'transparent',
                    color: releaseNotesTab === tabRole ? 'var(--ft-primary)' : 'var(--ft-text-muted)',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--ft-radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {tabRole === 'competitor' ? '👨‍🎓 For Competitors' : tabRole === 'judge' ? '👨‍🏫 For Judges' : '🔑 For Admins'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {releaseNotesTab === 'competitor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="ft-update-section">
                  <h4>📱 Mandatory WhatsApp Contact</h4>
                  <p>To ensure smooth communication, a one-time WhatsApp phone number entry is now required upon login.</p>
                </div>
                <div className="ft-update-section">
                  <h4>💳 Visual Payment Guidance</h4>
                  <p>When payment is required, the register button intelligently dims and guides you to the upload section with a shake animation if a receipt is missing.</p>
                </div>
                <div className="ft-update-section">
                  <h4>📝 Apply to Multiple Programs</h4>
                  <p>Competitors can now register for more than one competition program at the same place! However, to ensure fairness, you can only select exactly 1 wave per program (or 1 wave total if the place has no programs).</p>
                </div>
                <div className="ft-update-section">
                  <h4>🔔 Real-Time Approval Notifications</h4>
                  <p>A new notification bell in the top navbar alerts you immediately if your registration is approved, rejected, or auto-approved on wave deadlines.</p>
                </div>
              </div>
            )}

            {releaseNotesTab === 'judge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="ft-update-section">
                  <h4>📱 Stretched Trainee Cards on Mobile</h4>
                  <p>Trainee lists now adapt to narrow viewports. Quick evaluation and removal buttons stack in a finger-friendly bottom row.</p>
                </div>
                <div className="ft-update-section">
                  <h4>📋 Responsive Name Wrapping</h4>
                  <p>Long competitor names and biotechnology titles wrap perfectly on mobile screens, avoiding squeeze overlap bugs.</p>
                </div>
                <div className="ft-update-section">
                  <h4>🔔 Live Evaluation Alert Feed</h4>
                  <p>Stay up to date with real-time notification alerts sent straight to your top-bar bell dropdown when grades are synchronized.</p>
                </div>
              </div>
            )}

            {releaseNotesTab === 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="ft-update-section">
                  <h4>📊 Live Seat Capacity Breakdown</h4>
                  <p>Insights now intelligently format expired waves (e.g., 'Passed +2 overloaded') and display wave dates directly underneath each wave name.</p>
                </div>
                <div className="ft-update-section">
                  <h4>📥 Dynamic Profile CSV Exporter</h4>
                  <p>CSV export sheets now fetch the absolute latest competitor profile information live, ignoring old data saved at the time of registration.</p>
                </div>
                <div className="ft-update-section">
                  <h4>⏳ Customizable Wave Durations & Deadlines</h4>
                  <p>Admins can set precise registration deadlines and durations for individual programs and waves.</p>
                </div>
                <div className="ft-update-section">
                  <h4>🔔 Request Notifications Feed</h4>
                  <p>A notifications panel alerts you instantly when competitors submit new registrations, cancellations, or password reset requests.</p>
                </div>
              </div>
            )}
          </div>
          <div className="ft-modal-footer" style={{ borderTop: '1px solid var(--ft-border-light)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ft-btn ft-btn-primary" onClick={() => setShowReleaseNotesModal(false)}>Got it, thanks!</button>
          </div>
        </div>
      </div>
    )}

    {/* Mandatory Phone Modal */}
    {needsPhone && (
      <div className="ft-modal-overlay">
        <div className="ft-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
          <div className="ft-modal-header">
            <h3 className="ft-modal-title">📱 Add Your Phone Number</h3>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!phoneInput.trim()) {
              setPhoneError('Please enter a valid phone number.');
              return;
            }
            setSavingPhone(true);
            setPhoneError('');
            try {
              await db.scientists.update(user.id, { phone: phoneInput.trim() });
              const updated = await db.scientists.get(user.id);
              setMeDoc(updated);
            } catch (err) {
              setPhoneError('Failed to save phone number: ' + err.message);
            }
            setSavingPhone(false);
          }}>
            <div className="ft-modal-body" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--ft-text-secondary)', marginBottom: '1rem' }}>
                For a successful login, please enter your WhatsApp phone number. This is required for communication regarding your SciComm Spark Competition.
              </p>
              {phoneError && <div className="ft-alert ft-alert-error" style={{ marginBottom: '1rem' }}>{phoneError}</div>}
              <div className="ft-input-group" style={{ marginBottom: 0 }}>
                <label className="ft-label">WhatsApp Phone Number *</label>
                <input 
                  type="tel" 
                  className="ft-input" 
                  value={phoneInput} 
                  onChange={e => setPhoneInput(e.target.value)} 
                  placeholder="e.g. 01012345678" 
                  required 
                />
              </div>
            </div>
            <div className="ft-modal-footer">
              <button type="submit" className="ft-btn ft-btn-primary ft-w-full" disabled={savingPhone}>
                {savingPhone ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  );
}
