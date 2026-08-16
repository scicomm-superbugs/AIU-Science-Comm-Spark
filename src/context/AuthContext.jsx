import { createContext, useState, useEffect, useContext } from 'react';
import { db, firestore, getCollectionName, getFirebaseAuth, syncBroadcastMessagesForUser } from '../db';
import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { logActivity } from '../activityLogger';
import bcrypt from 'bcryptjs';

const AuthContext = createContext(null);

const isAdminEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean === 'abdullah.amr.makky@gamil.com' || clean === 'abdullah.amr.makky@gmail.com';
};

const purgeObsoleteUsers = async () => {
  try {
    const sciCol = getCollectionName('scientists');
    const q = query(collection(firestore, sciCol));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      const docId = d.id;
      const username = (data.username || '').toLowerCase();
      const name = (data.name || '').toLowerCase();
      const empId = (data.employeeId || '').toUpperCase();
      const compId = (data.competitorIdNumber || '').toUpperCase();

      const isObsolete =
        username === 'abdullah.amr871' ||
        docId === 'C-952' ||
        empId === 'C-952' ||
        compId.includes('C-952') ||
        (name.includes('system administrator') && !isAdminEmail(data.googleEmail) && !isAdminEmail(data.email));

      if (isObsolete) {
        await deleteDoc(doc(firestore, sciCol, docId));
        if (localStorage.getItem('ft_userId') === docId || sessionStorage.getItem('ft_userId') === docId) {
          localStorage.removeItem('ft_userId');
          sessionStorage.removeItem('ft_userId');
        }
      }
    }
  } catch (err) {
    console.warn('Purge obsolete users suppressed:', err);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAsMode, setViewAsModeState] = useState(() => {
    return sessionStorage.getItem('ft_viewAsMode') || null;
  });

  const setViewAsMode = (mode) => {
    setViewAsModeState(mode);
    if (mode) {
      sessionStorage.setItem('ft_viewAsMode', mode);
    } else {
      sessionStorage.removeItem('ft_viewAsMode');
    }
  };

  // Initialize auth
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Run background purge for obsolete/test users (C-952, abdullah.amr871)
        await purgeObsoleteUsers();

        const storedUserId = localStorage.getItem('ft_userId') || sessionStorage.getItem('ft_userId');
        if (storedUserId) {
          const scientist = await db.scientists.get(String(storedUserId));
          if (scientist) {
            setUser({
              id: scientist.id,
              username: scientist.username,
              name: scientist.name,
              role: scientist.role || 'competitor',
              realRole: scientist.role || 'competitor',
              registeredTrack: scientist.registeredTrack || 'pop_science',
              email: scientist.email,
              googleEmail: scientist.googleEmail,
              avatar: scientist.avatar
            });

            // Automatically sync historical track broadcasts for this user
            syncBroadcastMessagesForUser(scientist).catch(() => {});
            
            // Sync with Firebase auth session for firestore permissions
            try {
              const fbAuth = getFirebaseAuth();
              if (fbAuth && !fbAuth.currentUser) {
                await signInAnonymously(fbAuth);
              }
            } catch (authErr) {
              console.warn('Firebase anonymous auth suppressed:', authErr);
            }
          } else {
            // Clear invalid session
            localStorage.removeItem('ft_userId');
            sessionStorage.removeItem('ft_userId');
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    let scientist = await db.scientists.where('username').equals(username.trim()).first();
    if (!scientist) {
      scientist = await db.scientists.where('email').equals(username.trim()).first();
    }
    
    if (!scientist) {
      throw new Error('Invalid username or password');
    }
    
    const isMatch = await bcrypt.compare(password, scientist.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid username or password');
    }

    if (scientist.accountStatus === 'pending') {
      throw new Error('Your account is pending approval by an administrator.');
    }

    const userData = {
      id: scientist.id,
      username: scientist.username,
      name: scientist.name,
      role: scientist.role || 'competitor',
      realRole: scientist.role || 'competitor',
      avatar: scientist.avatar,
      registeredTrack: scientist.registeredTrack || 'pop_science',
      teamName: scientist.teamName || '',
      email: scientist.email,
      googleEmail: scientist.googleEmail
    };

    setUser(userData);
    localStorage.setItem('ft_userId', scientist.id);
    sessionStorage.setItem('ft_userId', scientist.id);

    // Automatically sync historical track broadcasts for this user
    syncBroadcastMessagesForUser(scientist).catch(() => {});

    try {
      const auth = getFirebaseAuth();
      if (auth && !auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (authErr) {
      console.warn('Firebase anonymous auth suppressed:', authErr);
    }

    return userData;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const gUser = result.user;

      if (!gUser) {
        throw new Error('No user returned from Google sign-in');
      }

      const userEmail = gUser.email;
      if (!userEmail) {
        throw new Error('No email address associated with this Google account.');
      }
      const photo = gUser.photoURL || gUser.photoUrl;
      const displayName = gUser.displayName || gUser.name || 'User';

      let scientist = await db.scientists.where('googleEmail').equals(userEmail).first();
      if (!scientist) {
        scientist = await db.scientists.where('email').equals(userEmail).first();
      }
      if (!scientist) {
        scientist = await db.scientists.where('username').equals(userEmail).first();
      }

      // Check if this is the Master Admin Email (abdullah.amr.makky@gamil.com / gmail.com)
      if (isAdminEmail(userEmail)) {
        if (scientist) {
          // Force update existing record to Master Admin status while preserving custom title/name
          await db.scientists.update(scientist.id, {
            role: 'master',
            title: scientist.title || 'Teaching Assistant at Alamein International University',
            accountStatus: 'active',
            completedProfile: true,
            googleEmail: userEmail,
            updatedAt: new Date().toISOString()
          });
          scientist = await db.scientists.get(scientist.id);
        } else {
          // Auto-create Master Admin account instantly
          const newId = await db.scientists.add({
            username: 'abdullah.amr',
            email: userEmail,
            googleEmail: userEmail,
            name: displayName || 'Abdullah Amr Maged',
            avatar: photo || null,
            avatarUrl: photo || null,
            department: 'Science Communication',
            universityId: '',
            title: 'Teaching Assistant at Alamein International University',
            role: 'master',
            registeredTrack: 'pop_science',
            accountStatus: 'active',
            employeeId: 'ADMIN-001',
            completedProfile: true,
            createdAt: new Date().toISOString()
          });
          scientist = await db.scientists.get(newId);
        }
      }

      if (!scientist || !scientist.completedProfile) {
        return {
          needsCompletion: true,
          googleData: {
            email: userEmail,
            name: displayName,
            avatar: photo || null
          }
        };
      }

      if (scientist.accountStatus === 'pending') {
        throw new Error('Your account is pending approval by an administrator.');
      }

      const userData = {
        id: scientist.id,
        username: scientist.username,
        name: scientist.name,
        title: scientist.title,
        role: scientist.role || 'competitor',
        realRole: scientist.role || 'competitor',
        registeredTrack: scientist.registeredTrack || 'pop_science',
        email: scientist.email,
        googleEmail: scientist.googleEmail,
        avatar: scientist.avatar
      };

      setUser(userData);
      localStorage.setItem('ft_userId', scientist.id);
      sessionStorage.setItem('ft_userId', scientist.id);

      // Automatically sync historical track broadcasts for this user
      syncBroadcastMessagesForUser(scientist).catch(() => {});

      logActivity({
        category: 'AUTH',
        action: 'Google Sign In',
        details: `User "${userData.name}" (@${userData.username}) signed in via Google Auth.`,
        user: userData
      });

      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (authErr) {
        console.warn('Anonymous login failed:', authErr.message);
      }

      return userData;
    } catch (err) {
      console.error('Google login failed:', err);
      logActivity({
        category: 'AUTH',
        action: 'Google Sign In Failed',
        details: err.message || 'Google authentication error',
        level: 'warning'
      });
      throw err;
    }
  };

  const completeGoogleRegistration = async (googleData, extraData) => {
    const isMasterAdminEmail = isAdminEmail(googleData.email);
    const universityEmail = extraData.email.trim() || googleData.email;

    const salt = await bcrypt.genSalt(4);
    const hash = await bcrypt.hash(extraData.password || 'GoogleAuthPass123!', salt);

    // Check if there is an account pre-created with their Google email
    const existingEmail = await db.scientists.where('email').equals(googleData.email).first();

    // Check if the chosen username is taken (allow linking if admin email)
    const existingUser = await db.scientists.where('username').equals(extraData.username.trim()).first();
    if (existingUser && !isMasterAdminEmail && (!existingEmail || existingUser.id !== existingEmail.id)) {
      throw new Error('Username is already taken');
    }

    // Check if this is the first user registering on the platform
    const sciCol = getCollectionName('scientists');
    const allSnap = await getDocs(collection(firestore, sciCol));
    const isFirstUser = allSnap.empty;

    let role = (isMasterAdminEmail || isFirstUser) ? 'master' : (extraData.role || 'competitor');
    let accountStatus = (isMasterAdminEmail || isFirstUser) ? 'active' : 'pending';
    if (existingEmail && existingEmail.role) {
      role = isMasterAdminEmail ? 'master' : existingEmail.role;
    }

    const isJudge = role === 'judge' || role === 'faculty';
    const generatedId = (isJudge ? 'SV-' : 'ST-') + Math.floor(1000 + Math.random() * 9000);

    const nationalId = extraData.nationalId ? extraData.nationalId.trim() : '';
    const isAlameinStudent = !!extraData.isAlameinStudent;
    const institutionName = isAlameinStudent ? 'Alamein International University' : (extraData.institutionName ? extraData.institutionName.trim() : '');
    const competitorIdNumber = role === 'competitor' ? 'SCS-2026-' + Math.floor(100000 + Math.random() * 900000) : '';

    const targetAccount = existingUser || existingEmail;

    const chosenAvatar = extraData.avatar || googleData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + extraData.username;

    let scientistId;
    if (targetAccount) {
      // Update/link to pre-existing or selected username account
      await db.scientists.update(targetAccount.id, {
        username: extraData.username.trim(),
        email: universityEmail,
        googleEmail: googleData.email,
        passwordHash: hash,
        name: extraData.name.trim() || googleData.name,
        avatar: chosenAvatar,
        avatarUrl: chosenAvatar,
        phone: extraData.phone ? extraData.phone.trim() : (targetAccount.phone || ''),
        department: extraData.department,
        universityId: isJudge ? '' : (isAlameinStudent && extraData.universityId ? extraData.universityId.trim() : ''),
        title: (extraData && extraData.title) ? extraData.title.trim() : (isMasterAdminEmail ? 'Master Admin' : (isJudge ? 'Judge' : 'Competitor')),
        role: role,
        registeredTrack: isJudge ? '' : extraData.registeredTrack || 'pop_science',
        participationMode: isJudge ? 'individual' : (extraData.participationMode || 'team'),
        accountStatus: accountStatus,
        completedProfile: true,
        nationalId: nationalId,
        institutionName: institutionName,
        isAlameinStudent: isAlameinStudent,
        competitorIdNumber: competitorIdNumber || targetAccount.competitorIdNumber || '',
        updatedAt: new Date().toISOString()
      });
      scientistId = targetAccount.id;
    } else {
      // Create new account
      scientistId = await db.scientists.add({
        username: extraData.username.trim(),
        email: universityEmail,
        googleEmail: googleData.email,
        passwordHash: hash,
        name: extraData.name.trim() || googleData.name,
        avatar: chosenAvatar,
        avatarUrl: chosenAvatar,
        phone: extraData.phone ? extraData.phone.trim() : '',
        department: extraData.department,
        universityId: isJudge ? '' : (isAlameinStudent && extraData.universityId ? extraData.universityId.trim() : ''),
        title: (extraData && extraData.title) ? extraData.title.trim() : (isMasterAdminEmail ? 'Master Admin' : (isJudge ? 'Judge' : 'Competitor')),
        role: role,
        registeredTrack: isJudge ? '' : extraData.registeredTrack || 'pop_science',
        participationMode: isJudge ? 'individual' : (extraData.participationMode || 'team'),
        accountStatus: accountStatus,
        employeeId: generatedId,
        nationalId: nationalId,
        institutionName: institutionName,
        isAlameinStudent: isAlameinStudent,
        competitorIdNumber: competitorIdNumber,
        profileViews: 0,
        completedProfile: true,
        createdAt: new Date().toISOString()
      });
    }

    const finalDoc = await db.scientists.get(scientistId);

    logActivity({
      category: 'AUTH',
      action: 'Account Registration Completed',
      details: `User "${finalDoc.name}" registered with role "${role}" on track "${finalDoc.registeredTrack}".`,
      user: finalDoc
    });

    if (accountStatus === 'pending') {
      return { needsApproval: true };
    }

    const userData = {
      id: finalDoc.id,
      username: finalDoc.username,
      name: finalDoc.name,
      role: finalDoc.role || 'competitor',
      avatar: finalDoc.avatar
    };

    setUser(userData);
    localStorage.setItem('ft_userId', finalDoc.id);
    sessionStorage.setItem('ft_userId', finalDoc.id);

    // Automatically sync historical track broadcasts for this user
    syncBroadcastMessagesForUser(finalDoc).catch(() => {});
    return userData;
  };

  const logout = async () => {
    if (user) {
      logActivity({
        category: 'AUTH',
        action: 'User Logged Out',
        details: `User "${user.name}" (@${user.username}) signed out.`,
        user
      });
    }
    setUser(null);
    setViewAsMode(null);
    localStorage.removeItem('ft_userId');
    sessionStorage.removeItem('ft_userId');
    localStorage.removeItem('ft_user');
    sessionStorage.removeItem('ft_user');
    sessionStorage.removeItem('ft_viewAsMode');
    if (typeof window !== 'undefined') {
      window.__CURRENT_FT_USER__ = null;
    }
  };

  const effectiveUser = (function() {
    if (!user) return null;
    const realRole = user.realRole || user.role || 'competitor';
    const isRealAdmin = realRole === 'master' || realRole === 'admin' || Boolean(user.isMasterAdmin) || isAdminEmail(user.email) || isAdminEmail(user.googleEmail);

    if (isRealAdmin && viewAsMode) {
      let modeRole = realRole;
      let modeTrack = user.registeredTrack || 'pop_science';
      let modePart = user.participationMode || 'team';
      let impId = user.id;
      let impName = user.name;
      let impUsername = user.username;
      let impEmail = user.email;
      let impCode = user.competitorCode;

      if (viewAsMode === 'student_pop_team' || viewAsMode === 'student_pop') {
        impId = 'test_comp_pop_team';
        impName = 'test-comp-pop-team';
        impUsername = 'test_comp_pop_team';
        impEmail = 'test-comp-pop-team@aiu.edu.eg';
        modeRole = 'competitor';
        modeTrack = 'pop_science';
        modePart = 'team';
        impCode = 'C-901';
      } else if (viewAsMode === 'student_pop_ind') {
        impId = 'test_comp_pop_solo';
        impName = 'test-comp-pop-solo';
        impUsername = 'test_comp_pop_solo';
        impEmail = 'test-comp-pop-solo@aiu.edu.eg';
        modeRole = 'competitor';
        modeTrack = 'pop_science';
        modePart = 'individual';
        impCode = 'C-902';
      } else if (viewAsMode === 'student_jour_team' || viewAsMode === 'student_jour') {
        impId = 'test_comp_jour_team';
        impName = 'test-comp-jour-team';
        impUsername = 'test_comp_jour_team';
        impEmail = 'test-comp-jour-team@aiu.edu.eg';
        modeRole = 'competitor';
        modeTrack = 'science_journalism';
        modePart = 'team';
        impCode = 'C-801';
      } else if (viewAsMode === 'student_jour_ind') {
        impId = 'test_comp_jour_solo';
        impName = 'test-comp-jour-solo';
        impUsername = 'test_comp_jour_solo';
        impEmail = 'test-comp-jour-solo@aiu.edu.eg';
        modeRole = 'competitor';
        modeTrack = 'science_journalism';
        modePart = 'individual';
        impCode = 'C-802';
      } else if (viewAsMode === 'judge_trainer' || viewAsMode === 'judge_scicomm') {
        impId = 'test_judge_scicomm';
        impName = 'test-trainer-judge';
        impUsername = 'test_judge_scicomm';
        impEmail = 'test-trainer-judge@aiu.edu.eg';
        modeRole = 'trainer_judge';
        modeTrack = '';
        impCode = 'J-301';
      } else if (viewAsMode === 'judge_academic') {
        impId = 'test_judge_1';
        impName = 'test-judge-1';
        impUsername = 'test_judge_1';
        impEmail = 'test-judge-1@aiu.edu.eg';
        modeRole = 'judge';
        modeTrack = '';
        impCode = 'J-201';
      }

      return {
        ...user,
        id: impId,
        name: impName,
        username: impUsername,
        email: impEmail,
        competitorCode: impCode,
        code: impCode,
        realRole,
        role: modeRole,
        registeredTrack: modeTrack,
        participationMode: modePart,
        isImpersonating: true,
        viewAsMode
      };
    }

    return {
      ...user,
      realRole,
      isImpersonating: false,
      viewAsMode: null
    };
  })();

  // Keep localStorage, sessionStorage, and window user identity in sync in real-time
  useEffect(() => {
    if (effectiveUser && (effectiveUser.name || effectiveUser.username)) {
      try {
        localStorage.setItem('ft_user', JSON.stringify(effectiveUser));
        sessionStorage.setItem('ft_user', JSON.stringify(effectiveUser));
        if (typeof window !== 'undefined') {
          window.__CURRENT_FT_USER__ = effectiveUser;
        }
      } catch {}
    } else if (!effectiveUser && !loading) {
      try {
        localStorage.removeItem('ft_user');
        sessionStorage.removeItem('ft_user');
        if (typeof window !== 'undefined') {
          window.__CURRENT_FT_USER__ = null;
        }
      } catch {}
    }
  }, [effectiveUser, loading]);

  const isRealAdmin = Boolean(effectiveUser && (effectiveUser.realRole === 'master' || effectiveUser.realRole === 'admin' || Boolean(effectiveUser.isMasterAdmin) || isAdminEmail(effectiveUser.email) || isAdminEmail(effectiveUser.googleEmail)));

  return (
    <AuthContext.Provider value={{ user: effectiveUser, setUser, login, loginWithGoogle, completeGoogleRegistration, logout, loading, viewAsMode, setViewAsMode, isRealAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
