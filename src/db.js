import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, onSnapshot, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { useState, useEffect } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyAPrfR-hG-5CeZiD0EIz_P1r93ywZbxcjc",
  authDomain: "chompchem.firebaseapp.com",
  projectId: "chompchem",
  storageBucket: "chompchem.firebasestorage.app",
  messagingSenderId: "379599502348",
  appId: "1:379599502348:web:d1be32d868ac2a813f0229",
  measurementId: "G-NWEXYL1PQ0"
};

import { getAuth } from "firebase/auth";
import { normalizeTrackKey } from "./ftConstants";

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

// Enable Firestore Offline Persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(firestore).catch((err) => {
    console.warn("Firestore offline persistence failed to enable:", err.code, err.message);
  });
}

export const storage = getStorage(app);

let authInstance = null;
export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
};

export const uploadBase64ToStorage = async (base64Str, folder = 'landing') => {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
    return base64Str;
  }
  try {
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadString(storageRef, base64Str, 'data_url');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (err) {
    console.warn('Firebase storage upload fallback to compressed base64:', err);
    return base64Str;
  }
};

const compressImageToBase64 = (file, maxWidth = 900, quality = 0.70) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

export const uploadFile = async (file, path, onProgress) => {
  if (!file) throw new Error('No file provided');
  
  if (file.type.startsWith('image/')) {
    if (onProgress) onProgress(50);
    try {
      const base64Url = await compressImageToBase64(file);
      if (onProgress) onProgress(100);
      return base64Url;
    } catch (e) {
      console.error('Base64 compression failed', e);
    }
  }
  throw new Error('Only image files are supported in this setup');
};

export function getCollectionName(baseName) {
  // Always hardcoded for SciComm Spark Competition workspace
  return `scicommspark_${baseName}`;
}

// React Hook for Real-time listeners
export function useLiveCollection(collectionName) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const actualCollection = getCollectionName(collectionName);
    const q = query(collection(firestore, actualCollection));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [collectionName]);
  
  return data;
}

// Collection Helpers (DAO pattern)
// Collection Helpers (DAO pattern)
const rawDb = {
  scientists: {
    add: async (scientist) => {
      if (scientist && scientist.id) {
        await setDoc(doc(firestore, getCollectionName('scientists'), String(scientist.id)), scientist, { merge: true });
        return scientist.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('scientists')), scientist);
      return ref.id;
    },
    update: async (id, data) => {
      if (!id) return;
      const targetId = String(id);
      const docRef = doc(firestore, getCollectionName('scientists'), targetId);
      await setDoc(docRef, data, { merge: true });

      // Also ensure if id is username, any matching document is updated
      try {
        const q = query(collection(firestore, getCollectionName('scientists')), where('username', '==', targetId));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          if (d.id !== targetId) {
            await setDoc(doc(firestore, getCollectionName('scientists'), d.id), data, { merge: true });
          }
        }
      } catch (err) {
        // Silently continue
      }
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('scientists'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('scientists'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('scientists'), String(id)));
      if (d.exists()) return { id: d.id, ...d.data() };
      const q = query(collection(firestore, getCollectionName('scientists')), where('username', '==', String(id)));
      const snap = await getDocs(q);
      return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
    },
    where: (field) => {
      return {
        equals: (value) => {
          return {
            first: async () => {
              const q = query(collection(firestore, getCollectionName('scientists')), where(field, '==', value));
              const snap = await getDocs(q);
              return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
            }
          };
        }
      };
    }
  },

  ft_places: {
    add: async (place) => {
      if (place && place.id) {
        await setDoc(doc(firestore, getCollectionName('ft_places'), String(place.id)), place, { merge: true });
        return place.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('ft_places')), place);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_places'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_places'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('ft_places'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_places'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  ft_registrations: {
    add: async (reg) => {
      if (reg && reg.id) {
        await setDoc(doc(firestore, getCollectionName('ft_registrations'), String(reg.id)), reg, { merge: true });
        return reg.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('ft_registrations')), reg);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_registrations'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_registrations'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('ft_registrations'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_registrations'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  ft_settings: {
    get: async () => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_settings'), 'global'));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    },
    set: async (data) => {
      await setDoc(doc(firestore, getCollectionName('ft_settings'), 'global'), data, { merge: true });
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_settings'), 'global'), data, { merge: true });
    }
  },

  ft_evaluations: {
    add: async (evalData) => {
      if (evalData && evalData.id) {
        await setDoc(doc(firestore, getCollectionName('ft_evaluations'), String(evalData.id)), evalData, { merge: true });
        return evalData.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('ft_evaluations')), evalData);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_evaluations'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_evaluations'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('ft_evaluations'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_evaluations'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  ft_reset_requests: {
    add: async (req) => {
      if (req && req.id) {
        await setDoc(doc(firestore, getCollectionName('ft_reset_requests'), String(req.id)), req, { merge: true });
        return req.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('ft_reset_requests')), req);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_reset_requests'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_reset_requests'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('ft_reset_requests'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_reset_requests'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  ft_notifications: {
    add: async (notif) => {
      if (notif && notif.id) {
        await setDoc(doc(firestore, getCollectionName('ft_notifications'), String(notif.id)), notif, { merge: true });
        return notif.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('ft_notifications')), notif);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_notifications'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_notifications'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('ft_notifications'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_notifications'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  workshops: {
    add: async (data) => {
      if (data && data.id) {
        await setDoc(doc(firestore, getCollectionName('workshops'), String(data.id)), data, { merge: true });
        return data.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('workshops')), data);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('workshops'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('workshops'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('workshops'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('workshops'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  ft_teams: {
    add: async (teamData) => {
      if (teamData && teamData.id) {
        await setDoc(doc(firestore, getCollectionName('ft_teams'), String(teamData.id)), teamData, { merge: true });
        return teamData.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('ft_teams')), teamData);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_teams'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_teams'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('ft_teams'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_teams'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  ft_tracks: {
    add: async (trackData) => {
      if (trackData && trackData.id) {
        await setDoc(doc(firestore, getCollectionName('ft_tracks'), String(trackData.id)), trackData, { merge: true });
        return trackData.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('ft_tracks')), trackData);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_tracks'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('ft_tracks'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('ft_tracks'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('ft_tracks'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  submissions: {
    add: async (data) => {
      if (data && data.id) {
        await setDoc(doc(firestore, getCollectionName('submissions'), String(data.id)), data, { merge: true });
        return data.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('submissions')), data);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('submissions'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('submissions'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('submissions'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('submissions'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  teams: {
    add: async (data) => {
      if (data && data.id) {
        await setDoc(doc(firestore, getCollectionName('teams'), String(data.id)), data, { merge: true });
        return data.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('teams')), data);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('teams'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('teams'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('teams'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('teams'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  timeline_config: {
    add: async (data) => {
      if (data && data.id) {
        await setDoc(doc(firestore, getCollectionName('timeline_config'), String(data.id)), data, { merge: true });
        return data.id;
      }
      const ref = await addDoc(collection(firestore, getCollectionName('timeline_config')), data);
      return ref.id;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('timeline_config'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('timeline_config'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('timeline_config'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('timeline_config'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  submission_assignments: {
    add: async (data) => {
      const docId = data.id || `${data.stageId}_${data.track}_${data.targetId}`;
      await setDoc(doc(firestore, getCollectionName('submission_assignments'), String(docId)), data, { merge: true });
      return docId;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('submission_assignments'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('submission_assignments'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('submission_assignments'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('submission_assignments'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  },

  published_results: {
    add: async (data) => {
      const docId = data.id || `pub_stage_${data.stageId}_${data.track}`;
      await setDoc(doc(firestore, getCollectionName('published_results'), String(docId)), data, { merge: true });
      return docId;
    },
    update: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('published_results'), String(id)), data, { merge: true });
    },
    set: async (id, data) => {
      await setDoc(doc(firestore, getCollectionName('published_results'), String(id)), data, { merge: true });
    },
    delete: async (id) => {
      await deleteDoc(doc(firestore, getCollectionName('published_results'), String(id)));
    },
    get: async (id) => {
      const d = await getDoc(doc(firestore, getCollectionName('published_results'), String(id)));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    }
  }
};

export const db = new Proxy(rawDb, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    return {
      add: async (data) => {
        if (data && data.id) {
          await setDoc(doc(firestore, getCollectionName(String(prop)), String(data.id)), data, { merge: true });
          return data.id;
        }
        const ref = await addDoc(collection(firestore, getCollectionName(String(prop))), data);
        return ref.id;
      },
      update: async (id, data) => {
        await setDoc(doc(firestore, getCollectionName(String(prop)), String(id)), data, { merge: true });
      },
      set: async (id, data) => {
        await setDoc(doc(firestore, getCollectionName(String(prop)), String(id)), data, { merge: true });
      },
      delete: async (id) => {
        await deleteDoc(doc(firestore, getCollectionName(String(prop)), String(id)));
      },
      get: async (id) => {
        const d = await getDoc(doc(firestore, getCollectionName(String(prop)), String(id)));
        return d.exists() ? { id: d.id, ...d.data() } : null;
      }
    };
  }
});

export async function syncBroadcastMessagesForUser(targetUser) {
  if (!targetUser || (!targetUser.id && !targetUser.username)) return;
  const userId = String(targetUser.id || targetUser.username);
  const username = targetUser.username ? String(targetUser.username) : null;
  let rawTrack = targetUser.registeredTrack || targetUser.track || targetUser.selectedTrack || targetUser.competitionTrack;

  try {
    // If track is not directly on user doc, check if user belongs to a team
    if (!rawTrack) {
      try {
        const teamsSnap = await getDocs(query(collection(firestore, getCollectionName('ft_teams'))));
        for (const tDoc of teamsSnap.docs) {
          const tData = tDoc.data();
          const isMember = (tData.members || []).some(m => 
            String(m.userId) === userId || (username && String(m.username) === username)
          );
          if (isMember && tData.track) {
            rawTrack = tData.track;
            break;
          }
        }
      } catch (teamErr) {
        console.warn('Team track lookup suppressed:', teamErr);
      }
    }

    const userTrack = normalizeTrackKey(rawTrack || 'pop_science');
    const userRole = (targetUser.role || 'competitor').toLowerCase();
    const isCompetitor = userRole === 'competitor' || userRole === 'student' || userRole === 'user' || !userRole;

    // 1. Fetch all active broadcast campaigns
    const allCampaigns = [];
    const campaignsSnap = await getDocs(query(collection(firestore, getCollectionName('ft_broadcast_campaigns'))));
    campaignsSnap.forEach(cDoc => {
      const data = cDoc.data();
      if (data.active !== false) {
        allCampaigns.push({ id: cDoc.id, ...data });
      }
    });

    // Also scan ft_messages for legacy/standalone broadcast messages that may not have a campaign doc
    try {
      const broadcastMsgsSnap = await getDocs(query(
        collection(firestore, getCollectionName('ft_messages')),
        where('isBroadcast', '==', true)
      ));
      const seenTexts = new Set(allCampaigns.map(c => c.text));
      broadcastMsgsSnap.forEach(bDoc => {
        const bData = bDoc.data();
        if (bData && bData.text && !seenTexts.has(bData.text)) {
          seenTexts.add(bData.text);
          allCampaigns.push({
            id: bData.broadcastCampaignId || `legacy_campaign_${bDoc.id}`,
            senderId: bData.senderId || 'admin',
            senderName: bData.senderName || 'Staff',
            text: bData.text,
            attachment: bData.attachment || null,
            targetTrack: bData.broadcastTrack || 'all',
            roleFilter: 'all_members',
            createdAt: bData.createdAt || new Date().toISOString(),
            active: true
          });
        }
      });
    } catch (legacyErr) {
      console.warn('Legacy broadcast scan suppressed:', legacyErr);
    }

    if (allCampaigns.length === 0) return;

    // 2. Fetch existing messages received by this user
    const receivedCampaignIds = new Set();
    const receivedTexts = new Set();

    const userMsgsSnap = await getDocs(query(
      collection(firestore, getCollectionName('ft_messages')),
      where('receiverId', '==', userId)
    ));
    userMsgsSnap.forEach(d => {
      const data = d.data();
      if (data.broadcastCampaignId) receivedCampaignIds.add(data.broadcastCampaignId);
      if (data.text) receivedTexts.add(data.text);
    });

    if (username && username !== userId) {
      const userMsgsSnap2 = await getDocs(query(
        collection(firestore, getCollectionName('ft_messages')),
        where('receiverId', '==', username)
      ));
      userMsgsSnap2.forEach(d => {
        const data = d.data();
        if (data.broadcastCampaignId) receivedCampaignIds.add(data.broadcastCampaignId);
        if (data.text) receivedTexts.add(data.text);
      });
    }

    for (const campaign of allCampaigns) {
      // Check track matching: 'all' or 'both' matches everyone; otherwise must match user's track
      const cTrack = campaign.targetTrack || campaign.broadcastTrack || 'all';
      const normCTrack = normalizeTrackKey(cTrack);
      const isAllTrack = cTrack === 'all' || cTrack === 'both' || normCTrack === 'both' || !cTrack;
      const trackMatch = isAllTrack || userTrack === 'both' || normCTrack === userTrack;
      if (!trackMatch) continue;

      // Check role matching: 'all_members' matches all; 'competitors' matches competitors/students
      const roleFilter = campaign.roleFilter || 'competitors';
      const roleMatch = roleFilter === 'all_members' || roleFilter === 'all' || isCompetitor;
      if (!roleMatch) continue;

      // Skip if already received
      if (receivedCampaignIds.has(campaign.id)) continue;

      // Personalize name placeholder
      const recipientName = targetUser.name || targetUser.username || 'Competitor';
      const recipientUsername = targetUser.username || targetUser.name || 'User';
      const personalizedText = (campaign.text || '')
        .replace(/\{name\}/gi, recipientName)
        .replace(/\{username\}/gi, recipientUsername);

      if (receivedTexts.has(personalizedText)) continue;

      // Mark as received in local set to avoid duplicate within loop
      receivedCampaignIds.add(campaign.id);
      receivedTexts.add(personalizedText);

      // Send the private message
      await db.ft_messages.add({
        text: personalizedText,
        senderId: String(campaign.senderId || 'admin'),
        senderName: campaign.senderName || 'Staff',
        receiverId: userId,
        createdAt: campaign.createdAt || new Date().toISOString(),
        status: 'unread',
        attachment: campaign.attachment || null,
        isBroadcast: true,
        broadcastTrack: campaign.targetTrack || 'all',
        broadcastCampaignId: campaign.id
      });

      // Send the notification
      try {
        await db.ft_notifications.add({
          targetUserId: userId,
          title: `💬 New Message from ${campaign.senderName || 'Staff'}`,
          message: personalizedText.length > 65 ? personalizedText.slice(0, 62) + '...' : personalizedText,
          type: 'chat',
          targetTab: 'chat',
          status: 'unread',
          createdAt: campaign.createdAt || new Date().toISOString()
        });
      } catch (notifErr) {
        console.warn('Notification sync suppressed:', notifErr);
      }
    }
  } catch (err) {
    console.warn('syncBroadcastMessagesForUser error:', err);
  }
}



