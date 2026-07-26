import { createContext, useState, useEffect, useContext } from 'react';
import { db, getFirebaseAuth } from '../db';
import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import bcrypt from 'bcryptjs';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUserId = localStorage.getItem('ft_userId') || sessionStorage.getItem('ft_userId');
        if (storedUserId) {
          const scientist = await db.scientists.get(String(storedUserId));
          if (scientist) {
            setUser({
              id: scientist.id,
              username: scientist.username,
              name: scientist.name,
              role: scientist.role || 'competitor',
              avatar: scientist.avatar
            });
            
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
      avatar: scientist.avatar,
      registeredTrack: scientist.registeredTrack || 'pop_science',
      teamName: scientist.teamName || ''
    };

    setUser(userData);
    localStorage.setItem('ft_userId', scientist.id);
    sessionStorage.setItem('ft_userId', scientist.id);

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
        role: scientist.role || 'competitor',
        avatar: scientist.avatar
      };

      setUser(userData);
      localStorage.setItem('ft_userId', scientist.id);
      sessionStorage.setItem('ft_userId', scientist.id);

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
      throw err;
    }
  };

  const completeGoogleRegistration = async (googleData, extraData) => {
    // googleData: { email, name, avatar }
    // extraData: { username, email (university), name, department, universityId, title, role, password }
    const universityEmail = extraData.email.trim();
    if (universityEmail.toLowerCase() === googleData.email.toLowerCase()) {
      throw new Error('University email must be different from your Google account email');
    }

    const salt = await bcrypt.genSalt(4);
    const hash = await bcrypt.hash(extraData.password, salt);

    // Check if there is an account pre-created with their Google email
    const existingEmail = await db.scientists.where('email').equals(googleData.email).first();

    // Check if the chosen username is taken
    const existingUser = await db.scientists.where('username').equals(extraData.username.trim()).first();
    if (existingUser && (!existingEmail || existingUser.id !== existingEmail.id)) {
      throw new Error('Username is already taken');
    }

    // Check if the university email they entered is taken by someone else
    if (universityEmail) {
      const existingUnivEmail = await db.scientists.where('email').equals(universityEmail).first();
      if (existingUnivEmail && (!existingEmail || existingUnivEmail.id !== existingEmail.id)) {
        throw new Error('University email is already registered');
      }
    }

    // Check if this is the first user registering on the platform
    const sciCol = getCollectionName('scientists');
    const allSnap = await getDocs(collection(firestore, sciCol));
    const isFirstUser = allSnap.empty;

    let role = isFirstUser ? 'master' : (extraData.role || 'competitor');
    let accountStatus = isFirstUser ? 'active' : 'pending';
    if (existingEmail && existingEmail.role) {
      role = existingEmail.role;
    }

    const isJudge = role === 'judge' || role === 'faculty';
    const generatedId = (isJudge ? 'SV-' : 'ST-') + Math.floor(1000 + Math.random() * 9000);

    const nationalId = extraData.nationalId ? extraData.nationalId.trim() : '';
    const isAlameinStudent = !!extraData.isAlameinStudent;
    const institutionName = isAlameinStudent ? 'Alamein International University' : (extraData.institutionName ? extraData.institutionName.trim() : '');
    const competitorIdNumber = role === 'competitor' ? 'SCS-2026-' + Math.floor(100000 + Math.random() * 900000) : '';

    let scientistId;
    if (existingEmail) {
      // Update pre-created account
      await db.scientists.update(existingEmail.id, {
        username: extraData.username.trim(),
        email: universityEmail,
        googleEmail: googleData.email,
        passwordHash: hash,
        name: extraData.name.trim() || googleData.name,
        avatar: googleData.avatar || existingEmail.avatar || null,
        avatarUrl: googleData.avatar || existingEmail.avatar || null,
        department: extraData.department,
        universityId: isJudge ? '' : (isAlameinStudent && extraData.universityId ? extraData.universityId.trim() : ''),
        title: isFirstUser ? 'Master Admin' : (isJudge ? (extraData.title ? extraData.title.trim() : 'Judge') : ''),
        role: role,
        registeredTrack: isJudge ? '' : extraData.registeredTrack || 'pop_science',
        accountStatus: accountStatus,
        completedProfile: true,
        nationalId: nationalId,
        institutionName: institutionName,
        isAlameinStudent: isAlameinStudent,
        competitorIdNumber: competitorIdNumber || existingEmail.competitorIdNumber || '',
        updatedAt: new Date().toISOString()
      });
      scientistId = existingEmail.id;
    } else {
      // Create new account
      scientistId = await db.scientists.add({
        username: extraData.username.trim(),
        email: universityEmail,
        googleEmail: googleData.email,
        passwordHash: hash,
        name: extraData.name.trim() || googleData.name,
        avatar: googleData.avatar || null,
        avatarUrl: googleData.avatar || null,
        department: extraData.department,
        universityId: isJudge ? '' : (isAlameinStudent && extraData.universityId ? extraData.universityId.trim() : ''),
        title: isFirstUser ? 'Master Admin' : (isJudge ? (extraData.title ? extraData.title.trim() : 'Judge') : ''),
        role: role,
        registeredTrack: isJudge ? '' : extraData.registeredTrack || 'pop_science',
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

    const scientist = await db.scientists.get(scientistId);
    if (scientist.accountStatus === 'pending') {
      throw new Error('Google Registration successful! Your account is pending review and approval by an administrator.');
    }

    const userData = {
      id: scientist.id,
      username: scientist.username,
      name: scientist.name,
      role: scientist.role || 'competitor',
      avatar: scientist.avatar
    };

    setUser(userData);
    localStorage.setItem('ft_userId', scientist.id);
    sessionStorage.setItem('ft_userId', scientist.id);
    return userData;
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('ft_userId');
    sessionStorage.removeItem('ft_userId');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, loginWithGoogle, completeGoogleRegistration, logout, loading }}>
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
