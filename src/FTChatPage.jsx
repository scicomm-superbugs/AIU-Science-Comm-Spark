import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection, syncBroadcastMessagesForUser } from './db';
import { 
  Send, User, Users, MessageSquare, Smile, Paperclip, X, FileText, 
  ChevronLeft, MoreVertical, ExternalLink, Download, ZoomIn, ZoomOut, 
  RotateCw, Plus, Search, Check, Globe, Radio, Megaphone, CheckCircle2, 
  Video, BookOpen, AlertCircle, Sparkles, Trash2, Eye 
} from 'lucide-react';
import { FT_ROLE_COLORS, FT_ROLE_LABELS, getCleanAcademicTitle, normalizeTrackKey } from './ftConstants';

const getUserRoleLabel = (acc) => {
  if (!acc) return 'User';
  return FT_ROLE_LABELS[acc.role] || acc.role || 'Competitor';
};

/* ─── URL detection regex ─── */
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;

/* ─── LinkPreview sub-component ─── */
function LinkPreview({ url, isMine }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fallbackMeta = null;
    try {
      const u = new URL(url);
      const domain = u.hostname.replace('www.', '');
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      const pathTitle = u.pathname
        .split('/')
        .filter(Boolean)
        .map(s => decodeURIComponent(s).replace(/[-_]/g, ' '))
        .join(' › ');
      fallbackMeta = {
        domain,
        favicon,
        title: pathTitle || domain,
        displayUrl: url.length > 55 ? url.substring(0, 52) + '…' : url
      };
      setMeta(fallbackMeta);
    } catch {
      setError(true);
      return;
    }

    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(resData => {
        if (cancelled) return;
        if (resData.status === 'success' && resData.data) {
          const d = resData.data;
          setMeta({
            domain: fallbackMeta.domain,
            favicon: d.logo?.url || d.icon?.url || fallbackMeta.favicon,
            title: d.title || fallbackMeta.title,
            description: d.description || '',
            image: d.image?.url || null,
            displayUrl: fallbackMeta.displayUrl
          });
        }
      })
      .catch(() => {
        // silently fallback
      });

    return () => { cancelled = true; };
  }, [url]);

  if (error || !meta) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      dir="ltr"
      className={`link-preview-card ${isMine ? 'link-preview-mine' : 'link-preview-other'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {meta.image && (
        <div className="link-preview-image-wrapper">
          <img src={meta.image} alt="" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
        </div>
      )}
      <div className="link-preview-container">
        {meta.favicon && (
          <div className="link-preview-icon">
            <img src={meta.favicon} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}
        <div className="link-preview-body">
          <span className="link-preview-domain" style={{ color: isMine ? '#93c5fd' : '#2563eb' }}>{meta.domain}</span>
          <span className="link-preview-title">{meta.title}</span>
          {meta.description && (
            <span className="link-preview-description">{meta.description}</span>
          )}
          <span className="link-preview-url">{meta.displayUrl}</span>
        </div>
        <ExternalLink size={14} className="link-preview-arrow" />
      </div>
    </a>
  );
}

/* ─── Helper: render message text with clickable links & mentions ─── */
function renderMessageText(text, isMine, accounts) {
  if (!text) return null;

  const isArabic = /[\u0600-\u06FF]/.test(text);
  const parts = text.split(/(https?:\/\/[^\s<>"']+|@\w+)/gi);
  const urls = text.match(/(https?:\/\/[^\s<>"']+)/gi) || [];
  const uniqueUrls = [...new Set(urls)];

  return (
    <>
      <div 
        dir={isArabic ? 'rtl' : 'ltr'}
        className="ft-chat-bubble-text"
        style={{ 
          wordBreak: 'break-word', 
          whiteSpace: 'pre-wrap', 
          lineHeight: isArabic ? 1.8 : 1.6,
          textAlign: isArabic ? 'right' : 'left',
          fontFamily: isArabic ? "'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif" : "inherit",
          fontSize: isArabic ? '0.93rem' : '0.88rem'
        }}
      >
        {parts.map((part, i) => {
          if (!part) return null;
          if (/^https?:\/\//i.test(part)) {
            return (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                style={{ display: 'inline-block', direction: 'ltr', wordBreak: 'break-all' }}
                className={`chat-link ${isMine ? 'chat-link-mine' : 'chat-link-other'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          if (part.startsWith('@')) {
            const username = part.slice(1).toLowerCase();
            const userMatch = (accounts || []).find(s => (s.username || '').toLowerCase() === username || (s.name || '').replace(/\s+/g, '').toLowerCase() === username);
            if (userMatch) {
              return (
                <strong
                  key={i}
                  style={{
                    background: isMine ? 'rgba(255, 255, 255, 0.25)' : 'rgba(37, 99, 235, 0.12)',
                    color: isMine ? '#ffffff' : '#2563eb',
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontWeight: 800
                  }}
                >
                  {part}
                </strong>
              );
            }
            return <span key={i} style={{ fontWeight: 600 }}>{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
      {uniqueUrls.map((u, i) => (
        <LinkPreview key={i} url={u} isMine={isMine} />
      ))}
    </>
  );
}

export default function FTChatPage({ user: userProp }) {
  const { user: authUser } = useAuth() || {};
  const user = userProp || authUser;
  const [text, setText] = useState('');
  const [activeRecipient, setActiveRecipient] = useState(null); // recipient userId/username
  const [showEmojis, setShowEmojis] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [mobileShowInbox, setMobileShowInbox] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Lightbox State
  const [lightbox, setLightbox] = useState(null); // { src, name }
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Mentions State
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const myId = user?.id || user?.username || 'user';
  const myName = user?.name || user?.username || 'User';

  const rawMessages = useLiveCollection('ft_messages');
  const notifications = useLiveCollection('ft_notifications') || [];
  const rawAccounts = useLiveCollection('scientists') || [];

  // Default fallback system admin account if not present in collection
  const defaultAdmin = useMemo(() => ({
    id: 'admin_sys_1',
    username: 'admin_sys_1',
    name: 'Abdullah Amr Maged',
    role: 'master',
    title: 'System Administrator & Coordinator',
    department: 'SciComm Spark Steering Committee',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AbdullahAmrMaged'
  }), []);

  const allAccounts = useMemo(() => {
    const list = [...rawAccounts];
    const exists = list.some(a => String(a.id || a.username) === String(defaultAdmin.id) || a.username === defaultAdmin.username || a.name === defaultAdmin.name);
    if (!exists) {
      list.push(defaultAdmin);
    }
    return list;
  }, [rawAccounts, defaultAdmin]);

  const isAdmin = user?.role === 'master' || user?.role === 'admin' || user?.role === 'super_admin' || user?.isAdmin || user?.isMaster;

  // Broadcast Modal State for Admin
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTrack, setBroadcastTrack] = useState('pop_science'); // 'pop_science' | 'science_journalism' | 'all'
  const [broadcastRoleFilter, setBroadcastRoleFilter] = useState('competitors'); // 'competitors' | 'all_members'
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastFilePreview, setBroadcastFilePreview] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0 });
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState('');
  const [showRecipientListPreview, setShowRecipientListPreview] = useState(false);
  const broadcastFileInputRef = useRef(null);

  // Automatically sync any historical broadcast messages matching this user's track
  useEffect(() => {
    if (user && (user.id || user.username)) {
      syncBroadcastMessagesForUser(user);
    }
  }, [user]);

  const rawTeams = useLiveCollection('ft_teams') || [];

  // Helper to determine the accurate track for any account
  const getAccountTrack = useCallback((acc) => {
    if (!acc) return 'pop_science';
    if (acc.registeredTrack) return normalizeTrackKey(acc.registeredTrack);
    if (acc.track) return normalizeTrackKey(acc.track);
    if (acc.selectedTrack) return normalizeTrackKey(acc.selectedTrack);
    if (acc.competitionTrack) return normalizeTrackKey(acc.competitionTrack);
    
    // Check if member of a team
    const accId = String(acc.id || acc.username);
    const userTeam = rawTeams.find(t => (t.members || []).some(m => String(m.userId) === accId || String(m.username) === accId));
    if (userTeam && userTeam.track) {
      return normalizeTrackKey(userTeam.track);
    }
    return 'pop_science';
  }, [rawTeams]);

  // Compute list of eligible broadcast recipients
  const broadcastRecipients = useMemo(() => {
    if (!allAccounts || allAccounts.length === 0) return [];
    
    return allAccounts.filter(acc => {
      const accId = String(acc.id || acc.username);
      // Exclude self (the admin sending the broadcast)
      if (accId === String(myId)) return false;

      // Exclude system accounts/masters
      const isStaffOrAdmin = acc.role === 'admin' || acc.role === 'master' || acc.role === 'super_admin' || acc.isAdmin || acc.isMaster;
      if (isStaffOrAdmin) return false;

      // Role filter
      if (broadcastRoleFilter === 'competitors') {
        const isCompetitor = acc.role === 'competitor' || acc.role === 'user' || !acc.role;
        if (!isCompetitor) return false;
      }

      // Track filter
      if (broadcastTrack !== 'all') {
        const track = getAccountTrack(acc);
        if (track !== broadcastTrack) return false;
      }

      return true;
    });
  }, [allAccounts, myId, broadcastRoleFilter, broadcastTrack, getAccountTrack]);

  // Broadcast File Select Handler
  const handleBroadcastFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 500 * 1024) {
      alert('File must be less than 500KB for chat uploads.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBroadcastFilePreview({
        name: file.name,
        type: file.type,
        data: reader.result,
        isImage: file.type.startsWith('image/')
      });
    };
    reader.readAsDataURL(file);
  };

  // Broadcast Send Execution
  const handleExecuteBroadcast = async (e) => {
    if (e) e.preventDefault();
    if (!broadcastText.trim() && !broadcastFilePreview) {
      alert('Please enter a message or attach a file to broadcast.');
      return;
    }
    if (broadcastRecipients.length === 0) {
      alert('No recipients match the selected track and filter.');
      return;
    }

    const trackName = broadcastTrack === 'pop_science' 
      ? 'Pop Science Videos (Track 1)' 
      : broadcastTrack === 'science_journalism' 
        ? 'Science Journalism (Track 2)' 
        : 'All Competition Tracks';

    const confirmMsg = `Are you sure you want to send this private message to all ${broadcastRecipients.length} participants in ${trackName}? Each recipient will receive it as a personal 1-on-1 direct message.`;
    if (!window.confirm(confirmMsg)) return;

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: broadcastRecipients.length });

    try {
      // 1. Create Broadcast Campaign record so new/future accounts automatically receive it
      const campaignPayload = {
        senderId: String(myId),
        senderName: myName,
        senderAvatar: user?.avatarUrl || user?.avatar || null,
        senderRole: user?.role || 'admin',
        text: broadcastText.trim(),
        attachment: broadcastFilePreview ? {
          name: broadcastFilePreview.name,
          type: broadcastFilePreview.type,
          data: broadcastFilePreview.data,
          isImage: broadcastFilePreview.isImage
        } : null,
        targetTrack: broadcastTrack,
        roleFilter: broadcastRoleFilter,
        createdAt: new Date().toISOString(),
        active: true
      };

      const campaignId = await db.ft_broadcast_campaigns.add(campaignPayload);

      let sentCount = 0;

      for (let i = 0; i < broadcastRecipients.length; i++) {
        const recip = broadcastRecipients[i];
        const recipId = String(recip.id || recip.username);
        const recipName = recip.name || recip.username || 'Competitor';

        // Personalize text if placeholders like {name} are used
        const personalizedText = broadcastText
          .replace(/\{name\}/gi, recipName)
          .replace(/\{username\}/gi, recip.username || recipName);

        const msgPayload = {
          text: personalizedText,
          senderId: myId,
          senderName: myName,
          receiverId: recipId,
          createdAt: new Date().toISOString(),
          isBroadcast: true,
          broadcastTrack: broadcastTrack,
          broadcastCampaignId: campaignId,
          status: 'unread'
        };

        if (broadcastFilePreview) {
          msgPayload.attachment = {
            name: broadcastFilePreview.name,
            type: broadcastFilePreview.type,
            data: broadcastFilePreview.data,
            isImage: broadcastFilePreview.isImage
          };
        }

        // 1. Add direct message into ft_messages
        await db.ft_messages.add(msgPayload);

        // 2. Add unread notification for the user
        await db.ft_notifications.add({
          targetUserId: recipId,
          title: `💬 New Message from ${myName}`,
          message: personalizedText.length > 75 ? personalizedText.slice(0, 72) + '...' : personalizedText,
          type: 'chat',
          targetTab: 'chat',
          status: 'unread',
          createdAt: new Date().toISOString()
        }).catch(() => {});

        sentCount++;
        setBroadcastProgress({ current: sentCount, total: broadcastRecipients.length });
      }

      setBroadcastSuccessMsg(`🎉 Successfully delivered private message to ${sentCount} participants in ${trackName}!`);
      setBroadcastText('');
      setBroadcastFilePreview(null);
      setTimeout(() => {
        setIsBroadcasting(false);
        setShowBroadcastModal(false);
        setBroadcastSuccessMsg('');
      }, 2000);

    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Error delivering broadcast: ' + err.message);
      setIsBroadcasting(false);
    }
  };

  const emojis = ['😀','😂','😍','👍','👏','🔬','🧪','✅','❌','🔥','👀','🎉','💡','🚀','💪','❤️','🙏','🤔','😎','⚡'];

  // Handle Input Changes with Mentions
  const handleChatInputChange = (value) => {
    setText(value);
    const atIdx = value.lastIndexOf('@');
    if (atIdx >= 0) {
      const afterAt = value.slice(atIdx + 1);
      if (!afterAt.includes(' ')) {
        setMentionQuery(afterAt);
        setShowMentions(true);
        return;
      }
    }
    setMentionQuery('');
    setShowMentions(false);
  };

  const insertMention = (person) => {
    const atIdx = text.lastIndexOf('@');
    const before = text.slice(0, atIdx);
    const mention = `@${person.username || person.name.replace(/\s+/g, '')} `;
    setText(before + mention);
    setMentionQuery('');
    setShowMentions(false);
  };

  // Lightbox handlers
  const openLightbox = useCallback((src, name) => {
    setLightbox({ src, name });
    setLightboxZoom(1);
    setLightboxRotation(0);
    setPanX(0);
    setPanY(0);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
    setLightboxZoom(1);
    setLightboxRotation(0);
    setPanX(0);
    setPanY(0);
  }, []);

  const handleDragStart = (e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX - panX, y: clientY - panY };
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPanX(clientX - dragStartRef.current.x);
    setPanY(clientY - dragStartRef.current.y);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Filter messages for active recipient
  const currentMessages = rawMessages ? [...rawMessages]
    .filter(msg => {
      if (activeRecipient === 'global') {
        return !msg.receiverId || msg.receiverId === 'global';
      } else {
        return (String(msg.senderId) === String(myId) && String(msg.receiverId) === String(activeRecipient)) || 
               (String(msg.senderId) === String(activeRecipient) && String(msg.receiverId) === String(myId));
      }
    })
    .sort((a, b) => new Date(a.createdAt || a.timestamp || 0).getTime() - new Date(b.createdAt || b.timestamp || 0).getTime()) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages.length]);

  // File Select Handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 500 * 1024) {
      alert('File must be less than 500KB for chat uploads.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({
        name: file.name,
        type: file.type,
        data: reader.result,
        isImage: file.type.startsWith('image/')
      });
    };
    reader.readAsDataURL(file);
  };

  // Send Message Handler
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && !filePreview) return;
    try {
      const msgData = {
        text: text || '',
        senderId: myId,
        senderName: myName,
        receiverId: activeRecipient,
        createdAt: new Date().toISOString()
      };

      if (filePreview) {
        msgData.attachment = {
          name: filePreview.name,
          type: filePreview.type,
          data: filePreview.data,
          isImage: filePreview.isImage
        };
      }

      await db.ft_messages.add(msgData);

      // Trigger notification if private message
      if (activeRecipient !== 'global') {
        await db.ft_notifications.add({
          targetUserId: activeRecipient,
          title: `💬 New Message from ${myName}`,
          message: text.length > 60 ? text.slice(0, 57) + '...' : text,
          type: 'chat',
          targetTab: 'chat',
          status: 'unread',
          createdAt: new Date().toISOString()
        }).catch(() => {});
      }

      setText('');
      setFilePreview(null);
      setShowEmojis(false);
      setMentionQuery('');
      setShowMentions(false);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (msg) => {
    if (!msg?.id) return;
    
    if (msg.isBroadcast && isAdmin) {
      const confirmAll = window.confirm('This message was sent via Broadcast. Do you want to delete this message for ALL recipients? (Click Cancel to delete only from this chat)');
      if (confirmAll) {
        try {
          const allMatching = (rawMessages || []).filter(m => 
            m.isBroadcast && (m.broadcastCampaignId === msg.broadcastCampaignId || m.text === msg.text || m.createdAt === msg.createdAt)
          );
          for (const m of allMatching) {
            await db.ft_messages.delete(m.id);
          }
          if (msg.broadcastCampaignId) {
            await db.ft_broadcast_campaigns.delete(msg.broadcastCampaignId).catch(() => {});
          }
          alert(`Successfully deleted broadcast message for all ${allMatching.length} recipients.`);
          return;
        } catch (err) {
          alert('Failed to delete broadcast: ' + err.message);
          return;
        }
      }
    }

    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await db.ft_messages.delete(msg.id);
      } catch (err) {
        alert('Failed to delete message: ' + err.message);
      }
    }
  };

  // Helper to fetch the last message info
  const getLastMessageInfo = (recipId) => {
    if (!rawMessages) return null;
    const msgs = rawMessages.filter(msg => {
      if (recipId === 'global') {
        return !msg.receiverId || msg.receiverId === 'global';
      } else {
        return (String(msg.senderId) === String(myId) && String(msg.receiverId) === String(recipId)) || 
               (String(msg.senderId) === String(recipId) && String(msg.receiverId) === String(myId));
      }
    });
    if (msgs.length === 0) return null;
    const sorted = [...msgs].sort((a,b) => new Date(a.createdAt || a.timestamp || 0).getTime() - new Date(b.createdAt || b.timestamp || 0).getTime());
    return sorted[sorted.length - 1];
  };

  // Robust Unread Count helper per contact
  const getUnreadCount = (recipId) => {
    if (!rawMessages || !user) return 0;
    const myIdStr = String(user.id || user.username || '');
    const myUserStr = String(user.username || '');
    const unread = rawMessages.filter(m => {
      if (m.status !== 'unread') return false;
      const isForMe = (myIdStr && String(m.receiverId) === myIdStr) || (myUserStr && String(m.receiverId) === myUserStr);
      const isFromMe = (myIdStr && String(m.senderId) === myIdStr) || (myUserStr && String(m.senderId) === myUserStr);
      if (isFromMe || !isForMe) return false;
      if (recipId === 'global') {
        return !m.receiverId || m.receiverId === 'global';
      }
      return String(m.senderId) === String(recipId);
    });
    return unread.length;
  };

  // Total unread messages across all 1-on-1 conversations
  const totalUnreadMessages = useMemo(() => {
    if (!rawMessages || !user) return 0;
    const myIdStr = String(user.id || user.username || '');
    const myUserStr = String(user.username || '');
    return rawMessages.filter(m => {
      if (m.status !== 'unread') return false;
      const isForMe = (myIdStr && String(m.receiverId) === myIdStr) || (myUserStr && String(m.receiverId) === myUserStr);
      const isFromMe = (myIdStr && String(m.senderId) === myIdStr) || (myUserStr && String(m.senderId) === myUserStr);
      return isForMe && !isFromMe;
    }).length;
  }, [rawMessages, user]);

  // Mark all unread incoming messages & chat notifications as read
  const handleMarkAllMessagesRead = async () => {
    if (!rawMessages || !user) return;
    const myIdStr = String(user.id || user.username || '');
    const myUserStr = String(user.username || '');
    const unreadForMe = rawMessages.filter(m => {
      if (m.status !== 'unread') return false;
      const isForMe = (myIdStr && String(m.receiverId) === myIdStr) || (myUserStr && String(m.receiverId) === myUserStr);
      const isFromMe = (myIdStr && String(m.senderId) === myIdStr) || (myUserStr && String(m.senderId) === myUserStr);
      return isForMe && !isFromMe;
    });
    for (const m of unreadForMe) {
      try {
        await db.ft_messages.update(m.id, { status: 'read' });
      } catch (e) {}
    }
    const chatNotifs = (notifications || []).filter(n =>
      n.status === 'unread' &&
      (n.type === 'chat' || n.targetTab === 'chat') &&
      ((myIdStr && n.targetUserId === myIdStr) || (myUserStr && n.targetUserId === myUserStr))
    );
    for (const n of chatNotifs) {
      try {
        await db.ft_notifications.update(n.id, { status: 'read' });
      } catch (e) {}
    }
  };

  // Automatically mark incoming messages from active conversation as read
  useEffect(() => {
    if (!rawMessages || !user || !activeRecipient) return;
    const myIdStr = String(user.id || user.username || '');
    const myUserStr = String(user.username || '');

    const unreadInActiveThread = rawMessages.filter(m => {
      if (m.status !== 'unread') return false;
      const isForMe = (myIdStr && String(m.receiverId) === myIdStr) || (myUserStr && String(m.receiverId) === myUserStr);
      const isFromMe = (myIdStr && String(m.senderId) === myIdStr) || (myUserStr && String(m.senderId) === myUserStr);
      if (isFromMe || !isForMe) return false;
      if (activeRecipient === 'global') {
        return !m.receiverId || m.receiverId === 'global';
      }
      return String(m.senderId) === String(activeRecipient);
    });

    if (unreadInActiveThread.length > 0) {
      unreadInActiveThread.forEach(async (msg) => {
        try {
          await db.ft_messages.update(msg.id, { status: 'read' });
        } catch (err) {
          console.warn('Failed to mark message as read:', err);
        }
      });
    }

    // Clear matching chat notifications
    const chatNotifs = (notifications || []).filter(n =>
      n.status === 'unread' &&
      (n.type === 'chat' || n.targetTab === 'chat') &&
      ((myIdStr && n.targetUserId === myIdStr) || (myUserStr && n.targetUserId === myUserStr))
    );
    if (chatNotifs.length > 0) {
      chatNotifs.forEach(async (n) => {
        try {
          await db.ft_notifications.update(n.id, { status: 'read' });
        } catch (e) {}
      });
    }
  }, [activeRecipient, rawMessages, user, notifications]);

  // Active recipient account details
  const activeRecipientAcc = activeRecipient === 'global'
    ? null
    : (allAccounts || []).find(s => String(s.id) === String(activeRecipient) || s.username === activeRecipient);

  // Filter sidebar contacts to ONLY show accounts with recent chat history, active selection, or matching search query
  const filteredContacts = (allAccounts || [])
    .filter(acc => {
      const accId = String(acc.id || acc.username);
      if (accId === String(myId)) return false;

      const hasHistory = getLastMessageInfo(accId) !== null;
      const isCurrentlySelected = activeRecipient === accId;

      // If user types in search box, allow searching all contacts
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (acc.name || '').toLowerCase().includes(q) || (acc.username || '').toLowerCase().includes(q) || (acc.department || '').toLowerCase().includes(q);
      }

      // Default sidebar view: Only show accounts with existing chat history or currently opened chat
      return hasHistory || isCurrentlySelected;
    })
    .sort((a, b) => {
      const accIdA = String(a.id || a.username);
      const accIdB = String(b.id || b.username);
      const msgA = getLastMessageInfo(accIdA);
      const msgB = getLastMessageInfo(accIdB);
      const timeA = msgA ? new Date(msgA.createdAt || msgA.timestamp || 0).getTime() : 0;
      const timeB = msgB ? new Date(msgB.createdAt || msgB.timestamp || 0).getTime() : 0;
      return timeB - timeA;
    });

  // Modal full personnel list for starting new chats
  const eligibleModalRecipients = (allAccounts || [])
    .filter(acc => {
      // Don't hide account if user is testing admin filter
      const isMe = String(acc.id || acc.username) === String(myId);
      if (isMe && selectedRoleFilter !== 'admin') return false;

      if (selectedRoleFilter === 'judges_trainers') {
        const isJudgeOrTrainer = acc.role === 'judge' || acc.role === 'trainer' || acc.role === 'judge_trainer' || acc.role?.includes('judge') || acc.role?.includes('trainer');
        if (!isJudgeOrTrainer) return false;
      } else if (selectedRoleFilter === 'admin') {
        const isAdmin = acc.role === 'admin' || acc.role === 'master' || acc.role === 'super_admin' || acc.isAdmin || acc.isMaster || acc.role?.includes('admin') || acc.role?.includes('master') || acc.title?.toLowerCase().includes('admin') || acc.title?.toLowerCase().includes('system');
        if (!isAdmin) return false;
      } else if (selectedRoleFilter !== 'all' && acc.role !== selectedRoleFilter) {
        return false;
      }

      if (!newChatSearch.trim()) return true;
      const q = newChatSearch.toLowerCase();
      return (acc.name || '').toLowerCase().includes(q) || (acc.username || '').toLowerCase().includes(q) || (acc.department || '').toLowerCase().includes(q);
    });

  return (
    <div className="ft-chat-container-main" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: '620px', gap: '0' }}>

      {/* ── Main Chat Card (Sidebar + Chat Area) ──────────────────── */}
      <div className="ft-chat-main-card" style={{
        flex: 1, height: '100%', minHeight: '620px', background: '#ffffff', borderRadius: '24px',
        border: '1.5px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
        display: 'flex', overflow: 'hidden', position: 'relative'
      }}>

        {/* ── LEFT SIDEBAR: CONTACTS & CHATS LIST ──────────────── */}
        <div className={`ft-chat-sidebar ${!mobileShowInbox ? 'ft-mobile-hide-sidebar' : ''}`} style={{
          width: '320px', borderRight: '1px solid #e2e8f0', background: '#f8fafc',
          display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0
        }}>
          
          {/* Search Contacts Bar & New Chat Button */}
          <div style={{ padding: '0.85rem 1rem 0.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem', borderRadius: '12px',
                  border: '1.5px solid #cbd5e1', fontSize: '0.84rem', background: '#ffffff',
                  outline: 'none', color: '#0f172a', fontWeight: 600, boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowNewChatModal(true)}
              style={{
                background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                color: '#ffffff', border: 'none', width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(190, 18, 60, 0.25)', flexShrink: 0
              }}
              title="Start New Chat"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Mark All As Read Bar when unread messages exist */}
          {totalUnreadMessages > 0 && (
            <div style={{ padding: '0.35rem 1rem', background: '#fff1f2', borderBottom: '1px solid #fecdd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#be123c' }}>
                {totalUnreadMessages} unread message{totalUnreadMessages > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleMarkAllMessagesRead}
                style={{
                  background: 'none', border: 'none', color: '#be123c', fontSize: '0.74rem',
                  fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0
                }}
              >
                Mark all as read
              </button>
            </div>
          )}

          {/* Admin Broadcast Button Bar */}
          {isAdmin && (
            <div style={{ padding: '0.45rem 0.85rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
              <button
                type="button"
                onClick={() => {
                  setShowBroadcastModal(true);
                  setBroadcastSuccessMsg('');
                }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#ffffff', border: '1px solid #334155',
                  padding: '0.55rem 0.85rem', borderRadius: '12px',
                  fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Megaphone size={14} style={{ color: '#f43f5e' }} /> Broadcast to Track (DM)
              </button>
            </div>
          )}

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>

            {/* Direct Messages List */}
            {filteredContacts.length === 0 ? (
              <div style={{ padding: '1.5rem 0.85rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
                <p style={{ fontSize: '0.8rem', margin: '0 0 0.25rem 0', fontWeight: 600, color: '#64748b' }}>
                  {searchQuery ? 'No contacts match your search query.' : 'No active private chats yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                    color: '#ffffff', border: 'none', padding: '0.5rem 0.9rem',
                    borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(190,18,60,0.25)', width: 'fit-content'
                  }}
                >
                  + Start New Chat
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBroadcastModal(true);
                      setBroadcastSuccessMsg('');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      color: '#ffffff', border: 'none', padding: '0.5rem 0.9rem',
                      borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      width: 'fit-content'
                    }}
                  >
                    <Megaphone size={13} style={{ color: '#f43f5e' }} /> Broadcast to Track
                  </button>
                )}
              </div>
            ) : (
              filteredContacts.map(acc => {
              const accId = String(acc.id || acc.username);
              const isSelected = activeRecipient === accId;
              const lastMsg = getLastMessageInfo(accId);
              const unread = getUnreadCount(accId);
              const roleColor = FT_ROLE_COLORS[acc.role] || '#2563eb';

              return (
                <div
                  key={accId}
                  onClick={() => {
                    setActiveRecipient(accId);
                    setMobileShowInbox(false);
                  }}
                  style={{
                    padding: '0.75rem 0.85rem', borderRadius: '14px', marginBottom: '0.4rem',
                    background: isSelected ? '#ffffff' : 'transparent',
                    border: isSelected ? '1.5px solid #cbd5e1' : '1.5px solid transparent',
                    boxShadow: isSelected ? '0 4px 14px rgba(0,0,0,0.04)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.75rem'
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={acc.avatarUrl || acc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.username || acc.name}`}
                      alt={acc.name}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${roleColor}` }}
                    />
                    <span style={{
                      position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px',
                      borderRadius: '50%', background: '#22c55e', border: '2px solid #ffffff'
                    }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {acc.name || acc.username}
                      </div>
                      {lastMsg && (
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0, marginLeft: '0.3rem' }}>
                          {new Date(lastMsg.createdAt || lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{
                        fontSize: '0.76rem', color: unread > 0 ? '#0f172a' : '#64748b',
                        fontWeight: unread > 0 ? 800 : 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1
                      }}>
                        {lastMsg ? (lastMsg.text || (lastMsg.attachment ? '📁 Attachment' : 'Message...')) : 'Tap to start inquiry...'}
                      </div>

                      {unread > 0 && (
                        <span style={{
                          background: '#2563eb', color: '#ffffff', fontSize: '0.68rem',
                          fontWeight: 900, borderRadius: '9999px', padding: '0.1rem 0.45rem', minWidth: '18px', height: '18px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* ── RIGHT CHAT CANVAS AREA ──────────────────────────── */}
        <div className={`ft-chat-area ${mobileShowInbox ? 'ft-mobile-hide-chat' : ''}`} style={{
          flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: '#ffffff'
        }}>
      
      {/* Header Bar */}
      <div style={{
        padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
          {/* Mobile Back Button */}
          <button
            type="button"
            className="ft-mobile-chat-back-btn"
            onClick={() => setMobileShowInbox(true)}
            style={{
              background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: '10px',
              padding: '0.35rem 0.6rem', fontSize: '0.8rem', fontWeight: 800, color: '#334155',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0
            }}
          >
            <ChevronLeft size={16} /> Contacts
          </button>

          {activeRecipientAcc ? (
            <img
              src={activeRecipientAcc?.avatarUrl || activeRecipientAcc?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRecipientAcc?.username || activeRecipientAcc?.name}`}
              alt={activeRecipientAcc?.name}
              style={{
                width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                border: `2px solid ${FT_ROLE_COLORS[activeRecipientAcc?.role] || '#2563eb'}`
              }}
            />
          ) : (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', background: '#eff6ff',
              color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              💬
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span>{activeRecipient === 'global' ? 'Global Team Discussion' : (activeRecipientAcc?.name || 'Private Chat')}</span>
              {activeRecipient !== 'global' && activeRecipientAcc && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 800, padding: '0.12rem 0.5rem',
                  borderRadius: '9999px', background: `${FT_ROLE_COLORS[activeRecipientAcc?.role] || '#2563eb'}18`,
                  color: FT_ROLE_COLORS[activeRecipientAcc?.role] || '#2563eb',
                  border: `1px solid ${FT_ROLE_COLORS[activeRecipientAcc?.role] || '#2563eb'}40`
                }}>
                  {getUserRoleLabel(activeRecipientAcc)}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeRecipient === 'global'
                ? 'All judges, mentors, administrators, and competitors'
                : (getCleanAcademicTitle(activeRecipientAcc) || activeRecipientAcc?.university || 'Direct 1-on-1 Consultation')}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <span style={{
            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
            padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            Active Thread
          </span>
        </div>
      </div>

      {/* Messages Scroll Viewport */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1rem',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        display: 'flex', flexDirection: 'column', gap: '0.85rem'
      }}>
        {currentMessages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '420px', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.3rem 0' }}>
              {activeRecipient === 'global' ? 'Welcome to Global Team Chat' : `Start your inquiry with ${activeRecipientAcc?.name || 'User'}`}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Ask questions regarding stage deliverables, evaluation criteria, or guidance. Share links, images, or documents.
            </p>
          </div>
        ) : (
          currentMessages.map(msg => {
            const isMe = String(msg.senderId) === String(myId);
            const isArabic = /[\u0600-\u06FF]/.test(msg.text || '');

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', alignSelf: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  fontSize: '0.7rem', color: '#64748b', fontWeight: 700,
                  marginBottom: '0.15rem', padding: '0 0.3rem'
                }}>
                  {isMe ? 'You' : (msg.senderName || 'Staff')}
                </div>

                <div
                  dir={isArabic ? 'rtl' : 'ltr'}
                  style={{
                    padding: '0.9rem 1.2rem',
                    borderRadius: '16px',
                    borderBottomRightRadius: isMe ? '3px' : '16px',
                    borderBottomLeftRadius: isMe ? '16px' : '3px',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                    fontSize: isArabic ? '0.93rem' : '0.88rem',
                    lineHeight: isArabic ? 1.8 : 1.6,
                    fontWeight: 500,
                    fontFamily: isArabic ? "'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif" : "inherit",
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    textAlign: isArabic ? 'right' : 'left'
                  }}
                >
                  {/* Message Attachment */}
                  {msg.attachment && (
                    <div style={{ marginBottom: msg.text ? '0.6rem' : 0 }}>
                      {msg.attachment.isImage ? (
                        <img
                          src={msg.attachment.data}
                          alt={msg.attachment.name}
                          onClick={() => openLightbox(msg.attachment.data, msg.attachment.name)}
                          style={{
                            maxWidth: '100%', maxHeight: '220px', borderRadius: '12px',
                            cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        />
                      ) : (
                        <a
                          href={msg.attachment.data}
                          download={msg.attachment.name}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: '#f1f5f9',
                            color: '#0f172a', padding: '0.5rem 0.75rem',
                            borderRadius: '10px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700,
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <FileText size={18} style={{ color: '#2563eb' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.attachment.name}
                          </span>
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Render text with clickable links & mentions */}
                  {renderMessageText(msg.text, isMe, allAccounts)}
                </div>

                <div style={{
                  fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600,
                  marginTop: '0.2rem', padding: '0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.35rem'
                }}>
                  <span>{new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && <Check size={12} style={{ color: '#2563eb' }} />}
                  {(isMe || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(msg)}
                      title={msg.isBroadcast ? "Delete broadcast message" : "Delete message"}
                      style={{
                        background: 'none', border: 'none', padding: '0 2px',
                        color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                        transition: 'color 0.15s ease', marginLeft: '0.2rem'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

          {/* Attachment Preview Box before sending */}
          {filePreview && (
            <div style={{
              padding: '0.5rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {filePreview.isImage ? (
                  <img src={filePreview.data} alt="Preview" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <FileText size={22} style={{ color: '#be123c' }} />
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  {filePreview.name}
                </span>
              </div>
              <button
                onClick={() => setFilePreview(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Emoji Drawer Picker */}
          {showEmojis && (
            <div style={{
              padding: '0.6rem 1rem', background: '#ffffff', borderTop: '1px solid #e2e8f0',
              display: 'flex', gap: '0.5rem', flexWrap: 'wrap'
            }}>
              {emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => { setText(prev => prev + emoji); setShowEmojis(false); }}
                  style={{
                    background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer',
                    padding: '0.2rem', borderRadius: '6px'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Bottom Message Input Bar */}
          <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #e2e8f0', background: '#ffffff', position: 'relative' }}>
            
            {/* Mention Auto-Complete Popup */}
            {showMentions && (
              <div style={{
                position: 'absolute', bottom: '100%', left: '1rem', right: '1rem',
                background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '14px',
                boxShadow: '0 -6px 20px rgba(0,0,0,0.1)', maxHeight: '160px', overflowY: 'auto',
                zIndex: 100, padding: '0.35rem'
              }}>
                {(allAccounts || []).filter(s => (s.name || '').toLowerCase().includes(mentionQuery.toLowerCase()) || (s.username || '').toLowerCase().includes(mentionQuery.toLowerCase())).map(person => (
                  <div
                    key={person.id}
                    onClick={() => insertMention(person)}
                    style={{
                      padding: '0.45rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <span>👤 {person.name || person.username}</span>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSend}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              {/* Attachment Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.4rem' }}
                title="Attach file or photo"
              >
                <Paperclip size={19} />
              </button>

              {/* Emoji Drawer Button */}
              <button
                type="button"
                onClick={() => setShowEmojis(prev => !prev)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.4rem' }}
                title="Emojis"
              >
                <Smile size={19} />
              </button>

              {/* Text Input */}
              <textarea
                rows={1}
                dir="auto"
                placeholder={activeRecipient === 'global' ? 'Type @ to mention or message global team...' : `Message ${activeRecipientAcc?.name || 'User'}...`}
                value={text}
                onChange={(e) => handleChatInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                style={{
                  flex: 1, padding: '0.65rem 0.85rem', borderRadius: '14px',
                  border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none',
                  resize: 'none', fontFamily: 'inherit', color: '#0f172a', fontWeight: 500,
                  boxSizing: 'border-box'
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!text.trim() && !filePreview}
                style={{
                  background: (text.trim() || filePreview)
                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                    : '#cbd5e1',
                  color: '#ffffff', border: 'none', width: '42px', height: '42px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (text.trim() || filePreview) ? 'pointer' : 'not-allowed',
                  boxShadow: (text.trim() || filePreview) ? '0 4px 14px rgba(37, 99, 235, 0.3)' : 'none',
                  transition: 'all 0.2s ease', flexShrink: 0
                }}
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── MODAL: START NEW CHAT WITH JUDGE / TRAINER / ADMIN ──── */}
      {showNewChatModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '580px',
            border: '2px solid #e2e8f0', boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Start a New Chat
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Select any competitor, evaluator, trainer, or admin to start direct messaging
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div style={{ padding: '1rem 1.5rem 0.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Personnel' },
                  { id: 'judges_trainers', label: '⚖️🎓 Judges & Trainers' },
                  { id: 'admin', label: '👑 Admins' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedRoleFilter(f.id)}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                      border: `1.5px solid ${selectedRoleFilter === f.id ? '#be123c' : '#cbd5e1'}`,
                      background: selectedRoleFilter === f.id ? '#be123c' : '#ffffff',
                      color: selectedRoleFilter === f.id ? '#ffffff' : '#475569',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by name or department..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem', borderRadius: '12px',
                    border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', color: '#0f172a', fontWeight: 600, boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Recipients list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem 1.5rem' }}>
              {eligibleModalRecipients.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No personnel found matching the selected filter.
                </div>
              ) : (
                eligibleModalRecipients.map(acc => {
                  const roleColor = FT_ROLE_COLORS[acc.role] || '#2563eb';
                  const title = getCleanAcademicTitle(acc) || acc.department || 'Competition Evaluator';

                  return (
                    <div
                      key={acc.id || acc.username}
                      onClick={() => {
                        setActiveRecipient(String(acc.id || acc.username));
                        setShowNewChatModal(false);
                        setMobileShowInbox(false);
                      }}
                      style={{
                        padding: '0.85rem 1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0',
                        marginBottom: '0.55rem', cursor: 'pointer', transition: 'all 0.2s ease',
                        background: '#ffffff', display: 'flex', alignItems: 'flex-start', gap: '0.85rem'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#be123c'; e.currentTarget.style.background = '#fff1f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <img
                        src={acc.avatarUrl || acc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.username || acc.name}`}
                        alt={acc.name}
                        style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${roleColor}`, flexShrink: 0, marginTop: '2px' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.25rem' }}>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a' }}>
                            {acc.name || acc.username}
                          </div>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 800, padding: '0.18rem 0.55rem', borderRadius: '8px',
                            background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30`,
                            whiteSpace: 'nowrap'
                          }}>
                            {getUserRoleLabel(acc)}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {title}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BROADCAST DIRECT MESSAGE MODAL FOR ADMINS ────────── */}
      {showBroadcastModal && (
        <div
          onClick={() => { if (!isBroadcasting) setShowBroadcastModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.65)',
            backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '640px',
              maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden', border: '1px solid #e2e8f0'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(244,63,94,0.15)',
                  border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                    Broadcast Direct Message to Track
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                    Delivers a personal 1-on-1 direct message into each participant's private chat
                  </div>
                </div>
              </div>

              {!isBroadcasting && (
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none', width: '32px', height: '32px',
                    borderRadius: '50%', color: '#ffffff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Success Message Banner */}
              {broadcastSuccessMsg && (
                <div style={{
                  padding: '1rem', borderRadius: '14px', background: '#f0fdf4',
                  border: '1.5px solid #86efac', color: '#166534', fontWeight: 800,
                  fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.65rem'
                }}>
                  <CheckCircle2 size={22} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div>{broadcastSuccessMsg}</div>
                </div>
              )}

              {/* Step 1: Target Track Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
                  1. Select Target Track:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
                  {[
                    { id: 'pop_science', label: 'Pop Science Videos', icon: <Video size={16} />, badge: 'Track 1', color: '#2563eb', bg: '#eff6ff' },
                    { id: 'science_journalism', label: 'Science Journalism', icon: <BookOpen size={16} />, badge: 'Track 2', color: '#059669', bg: '#ecfdf5' },
                    { id: 'all', label: 'All Competition Tracks', icon: <Globe size={16} />, badge: 'Both Tracks', color: '#be123c', bg: '#fff1f2' }
                  ].map(t => {
                    const isSelected = broadcastTrack === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBroadcastTrack(t.id)}
                        disabled={isBroadcasting}
                        style={{
                          padding: '0.85rem 0.95rem', borderRadius: '14px', textAlign: 'left',
                          border: `2px solid ${isSelected ? t.color : '#e2e8f0'}`,
                          background: isSelected ? t.bg : '#ffffff',
                          cursor: isBroadcasting ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', gap: '0.35rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: t.color, display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 900, fontSize: '0.82rem' }}>
                            {t.icon} {t.badge}
                          </span>
                          {isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                          {t.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Role Audience Filter & Live Count */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
                    2. Target Audience:
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setBroadcastRoleFilter('competitors')}
                      disabled={isBroadcasting}
                      style={{
                        padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800,
                        border: `1.5px solid ${broadcastRoleFilter === 'competitors' ? '#0f172a' : '#cbd5e1'}`,
                        background: broadcastRoleFilter === 'competitors' ? '#0f172a' : '#ffffff',
                        color: broadcastRoleFilter === 'competitors' ? '#ffffff' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Competitors Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastRoleFilter('all_members')}
                      disabled={isBroadcasting}
                      style={{
                        padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800,
                        border: `1.5px solid ${broadcastRoleFilter === 'all_members' ? '#0f172a' : '#cbd5e1'}`,
                        background: broadcastRoleFilter === 'all_members' ? '#0f172a' : '#ffffff',
                        color: broadcastRoleFilter === 'all_members' ? '#ffffff' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      All Roles (Inc. Judges/Trainers)
                    </button>
                  </div>
                </div>

                {/* Recipient Count Pill */}
                <div style={{
                  padding: '0.65rem 0.95rem', borderRadius: '12px', background: '#f8fafc',
                  border: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={16} style={{ color: '#2563eb' }} />
                    Target Recipients: <strong style={{ color: '#2563eb' }}>{broadcastRecipients.length} participants</strong>
                  </span>
                  {broadcastRecipients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowRecipientListPreview(!showRecipientListPreview)}
                      style={{
                        background: 'none', border: 'none', color: '#be123c',
                        fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline'
                      }}
                    >
                      {showRecipientListPreview ? 'Hide List' : 'Preview Recipients'}
                    </button>
                  )}
                </div>

                {/* Optional Expandable Recipient Preview Cloud */}
                {showRecipientListPreview && broadcastRecipients.length > 0 && (
                  <div style={{
                    marginTop: '0.5rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem',
                    borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1',
                    display: 'flex', flexWrap: 'wrap', gap: '0.35rem'
                  }}>
                    {broadcastRecipients.map(r => (
                      <span
                        key={r.id || r.username}
                        style={{
                          fontSize: '0.72rem', background: '#f1f5f9', color: '#334155',
                          padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700,
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {r.name || r.username}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Message Textarea with Personalization Shortcuts */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
                    3. Message Content:
                  </label>
                  <button
                    type="button"
                    onClick={() => setBroadcastText(prev => prev + ' {name} ')}
                    disabled={isBroadcasting}
                    style={{
                      background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                      padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                    }}
                    title="Insert participant's name dynamically in their personal message"
                  >
                    <Sparkles size={12} /> Insert {'{name}'} Tag
                  </button>
                </div>

                <textarea
                  rows={5}
                  placeholder={`Write your direct message here...\n\nExample: Hello {name}, please note that the Stage 1 deadline is approaching next Sunday. Check your Course Modules tab for full instructions!`}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  disabled={isBroadcasting}
                  style={{
                    width: '100%', padding: '0.85rem 1rem', borderRadius: '14px',
                    border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none',
                    color: '#0f172a', fontWeight: 600, boxSizing: 'border-box',
                    resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Step 4: Optional Attachment Upload */}
              <div>
                <input
                  type="file"
                  ref={broadcastFileInputRef}
                  onChange={handleBroadcastFileSelect}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx"
                />

                {broadcastFilePreview ? (
                  <div style={{
                    padding: '0.65rem 0.95rem', borderRadius: '12px', background: '#f8fafc',
                    border: '1.5px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileText size={16} /> {broadcastFilePreview.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBroadcastFilePreview(null)}
                      disabled={isBroadcasting}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => broadcastFileInputRef.current?.click()}
                    disabled={isBroadcasting}
                    style={{
                      background: '#f8fafc', border: '1.5px dashed #cbd5e1', color: '#475569',
                      padding: '0.55rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                    }}
                  >
                    <Paperclip size={15} /> Attach Image or PDF Document (Optional)
                  </button>
                )}
              </div>

              {/* Step 5: Live Recipient Message Preview */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1.5px solid #cbd5e1',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Eye size={16} style={{ color: '#be123c' }} />
                    <span>Live Message Preview (How recipients see it in private chat):</span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem', color: '#1e293b', background: '#e2e8f0',
                    padding: '0.2rem 0.55rem', borderRadius: '9999px', fontWeight: 700
                  }}>
                    Sample Recipient: <strong>{broadcastRecipients[0]?.name || 'Participant Name'}</strong>
                  </span>
                </div>

                {/* Simulated Chat View */}
                <div style={{
                  background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)',
                  borderRadius: '14px',
                  padding: '1rem',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                    <img
                      src={user?.avatarUrl || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || myName}`}
                      alt={myName}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                        {myName} <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>({FT_ROLE_LABELS[user?.role] || 'Staff'})</span>
                      </div>

                      <div
                        dir={/[\u0600-\u06FF]/.test(broadcastText || '') ? 'rtl' : 'ltr'}
                        className="ft-chat-bubble-text"
                        style={{
                          background: '#ffffff',
                          color: '#0f172a',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '16px',
                          borderBottomLeftRadius: '3px',
                          padding: '0.85rem 1.1rem',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                          fontSize: /[\u0600-\u06FF]/.test(broadcastText || '') ? '0.93rem' : '0.88rem',
                          lineHeight: /[\u0600-\u06FF]/.test(broadcastText || '') ? 1.8 : 1.6,
                          fontFamily: /[\u0600-\u06FF]/.test(broadcastText || '') ? "'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif" : "inherit",
                          textAlign: /[\u0600-\u06FF]/.test(broadcastText || '') ? 'right' : 'left',
                          maxWidth: '100%',
                          width: '100%',
                          boxSizing: 'border-box',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {/* Attachment Preview */}
                        {broadcastFilePreview && (
                          <div style={{ marginBottom: broadcastText ? '0.6rem' : 0 }}>
                            {broadcastFilePreview.isImage ? (
                              <img
                                src={broadcastFilePreview.data}
                                alt={broadcastFilePreview.name}
                                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                              />
                            ) : (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: '#f1f5f9', color: '#0f172a', padding: '0.5rem 0.75rem',
                                borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700
                              }}>
                                <FileText size={16} style={{ color: '#be123c' }} />
                                <span>{broadcastFilePreview.name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Text preview with tag interpolation */}
                        {broadcastText.trim() ? (
                          renderMessageText(
                            broadcastText
                              .replace(/\{name\}/gi, broadcastRecipients[0]?.name || 'Ahmed Ashraf')
                              .replace(/\{username\}/gi, broadcastRecipients[0]?.username || 'Ahmed'),
                            false,
                            allAccounts
                          )
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.82rem' }}>
                            (Type your message above to see the live formatted preview...)
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.3rem', paddingLeft: '0.2rem' }}>
                        Just now • Direct Private Message
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcasting Live Progress */}
              {isBroadcasting && (
                <div style={{
                  padding: '1rem', borderRadius: '14px', background: '#f8fafc',
                  border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    <span>Sending direct messages...</span>
                    <span>{broadcastProgress.current} / {broadcastProgress.total} Delivered</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${broadcastProgress.total > 0 ? (broadcastProgress.current / broadcastProgress.total) * 100 : 0}%`,
                      height: '100%', background: 'linear-gradient(90deg, #be123c, #f43f5e)', transition: 'width 0.15s ease'
                    }} />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div style={{
              padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '0.65rem'
            }}>
              {!isBroadcasting && (
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#ffffff',
                    border: '1.5px solid #cbd5e1', color: '#475569', fontSize: '0.85rem',
                    fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleExecuteBroadcast}
                disabled={isBroadcasting || (!broadcastText.trim() && !broadcastFilePreview) || broadcastRecipients.length === 0}
                style={{
                  padding: '0.65rem 1.4rem', borderRadius: '12px',
                  background: isBroadcasting || (!broadcastText.trim() && !broadcastFilePreview) || broadcastRecipients.length === 0
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                  color: '#ffffff', border: 'none', fontSize: '0.85rem', fontWeight: 900,
                  cursor: isBroadcasting || (!broadcastText.trim() && !broadcastFilePreview) || broadcastRecipients.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(190,18,60,0.25)'
                }}
              >
                <Send size={15} /> {isBroadcasting ? 'Broadcasting...' : `Send Direct Messages (${broadcastRecipients.length}) 🚀`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── LIGHTBOX MODAL FOR IMAGE ATTACHMENTS ────────────────── */}
      {lightbox && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(15,23,42,0.92)',
            backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
          }}
        >
          {/* Controls Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: '#0f172a', padding: '0.4rem 0.8rem', borderRadius: '20px', zIndex: 2
            }}
          >
            <button onClick={() => setLightboxZoom(z => Math.min(z + 0.25, 3))} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}><ZoomIn size={18} /></button>
            <button onClick={() => setLightboxZoom(z => Math.max(z - 0.25, 0.5))} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}><ZoomOut size={18} /></button>
            <button onClick={() => setLightboxRotation(r => (r + 90) % 360)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}><RotateCw size={18} /></button>
            <button onClick={closeLightbox} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', marginLeft: '0.4rem' }}><X size={20} /></button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            style={{ cursor: isDragging ? 'grabbing' : 'grab', maxRect: '90vw 85vh', overflow: 'hidden' }}
          >
            <img
              src={lightbox.src}
              alt={lightbox.name}
              style={{
                maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain',
                transform: `translate(${panX}px, ${panY}px) scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease', borderRadius: '12px'
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
