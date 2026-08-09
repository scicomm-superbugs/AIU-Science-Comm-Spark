import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { Send, User, Users, MessageSquare, Smile, Paperclip, X, FileText, ChevronLeft, MoreVertical, ExternalLink, Download, ZoomIn, ZoomOut, RotateCw, Plus, Search, Check, Globe } from 'lucide-react';
import { FT_ROLE_COLORS, FT_ROLE_LABELS, getCleanAcademicTitle } from './ftConstants';

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
      className={`link-preview-card ${isMine ? 'link-preview-mine' : 'link-preview-other'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {meta.image && (
        <div className="link-preview-image-wrapper">
          <img src={meta.image} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <div className="link-preview-container">
        <div className="link-preview-icon">
          <img src={meta.favicon} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="link-preview-body">
          <span className="link-preview-domain">{meta.domain}</span>
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

  const parts = text.split(/(https?:\/\/[^\s<>"']+|@\w+)/gi);
  const urls = text.match(/(https?:\/\/[^\s<>"']+)/gi) || [];
  const uniqueUrls = [...new Set(urls)];

  return (
    <>
      <div style={{ wordBreak: 'break-word' }}>
        {parts.map((part, i) => {
          if (!part) return null;
          if (/^https?:\/\//i.test(part)) {
            return (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
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
                    background: isMine ? 'rgba(255, 255, 255, 0.25)' : 'rgba(190, 18, 60, 0.1)',
                    color: isMine ? '#ffffff' : '#be123c',
                    padding: '2px 5px',
                    borderRadius: '4px',
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
  const rawAccounts = useLiveCollection('scientists') || [];

  // Default fallback system admin accounts if not present in collection
  const defaultAdmins = useMemo(() => [
    {
      id: 'admin_sys_1',
      username: 'admin_sys_1',
      name: 'Abdullah Amr Maged',
      role: 'master',
      title: 'System Administrator & Coordinator',
      department: 'SciComm Spark Steering Committee',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AbdullahAmrMaged'
    },
    {
      id: 'admin_sys_2',
      username: 'admin_sys_2',
      name: 'SciComm Spark Helpdesk',
      role: 'admin',
      title: 'Official Support & Technical Inquiries',
      department: 'Competition Support Team',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SciCommHelpdesk'
    },
    {
      id: 'admin_sys_3',
      username: 'admin_sys_3',
      name: 'Organizing Committee Admin',
      role: 'admin',
      title: 'Competition Executive Admin',
      department: 'Alamein International University',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=OrganizingCommittee'
    }
  ], []);

  const allAccounts = useMemo(() => {
    const list = [...rawAccounts];
    // Ensure all default system admins exist in list if missing
    defaultAdmins.forEach(defAdmin => {
      const exists = list.some(a => String(a.id || a.username) === String(defAdmin.id) || a.username === defAdmin.username || a.name === defAdmin.name);
      if (!exists) {
        list.push(defAdmin);
      }
    });
    return list;
  }, [rawAccounts, defaultAdmins]);

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

  // Unread Count helper per contact
  const getUnreadCount = (recipId) => {
    if (!rawMessages || !user) return 0;
    const unread = rawMessages.filter(m => {
      const isIncoming = recipId === 'global' 
        ? (!m.receiverId || m.receiverId === 'global') && String(m.senderId) !== String(myId)
        : String(m.senderId) === String(recipId) && String(m.receiverId) === String(myId);
      return isIncoming && m.status === 'unread';
    });
    return unread.length;
  };

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
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>

            {/* Direct Messages List */}
            {filteredContacts.length === 0 ? (
              <div style={{ padding: '1.5rem 0.85rem', textAlign: 'center', color: '#64748b' }}>
                <p style={{ fontSize: '0.8rem', margin: '0 0 0.75rem 0', fontWeight: 600, color: '#64748b' }}>
                  {searchQuery ? 'No contacts match your search query.' : 'No active private chats yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                    color: '#ffffff', border: 'none', padding: '0.5rem 0.9rem',
                    borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(190,18,60,0.25)'
                  }}
                >
                  + Start New Chat
                </button>
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
                          background: '#be123c', color: '#ffffff', fontSize: '0.68rem',
                          fontWeight: 900, borderRadius: '9999px', padding: '0.1rem 0.4rem', minWidth: '18px', height: '18px',
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
                  width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9',
                  color: '#be123c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  💬
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeRecipientAcc ? (activeRecipientAcc.name || activeRecipientAcc.username) : 'Select a Conversation'}
                  </h3>
                  {activeRecipientAcc && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '6px', flexShrink: 0,
                      background: `${FT_ROLE_COLORS[activeRecipientAcc.role] || '#2563eb'}15`,
                      color: FT_ROLE_COLORS[activeRecipientAcc.role] || '#2563eb',
                      border: `1px solid ${FT_ROLE_COLORS[activeRecipientAcc.role] || '#2563eb'}40`
                    }}>
                      {getUserRoleLabel(activeRecipientAcc)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeRecipientAcc ? (getCleanAcademicTitle(activeRecipientAcc) || activeRecipientAcc?.department || 'Competition Staff') : 'Select a contact from your recent chats or start a new chat'}
                </div>
              </div>
            </div>

            <span
              className="ft-desktop-only-badge"
              style={{
                fontSize: '0.72rem', color: '#059669', background: '#ecfdf5',
                padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1.5px solid #a7f3d0',
                fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} /> Active Thread
            </span>
          </div>

          {/* Messages Scroll Feed */}
          <div style={{
            flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.15rem 1.25rem',
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
                      dir="auto"
                      style={{
                        padding: '0.75rem 1rem', borderRadius: '16px',
                        borderBottomRightRadius: isMe ? '3px' : '16px',
                        borderBottomLeftRadius: isMe ? '16px' : '3px',
                        background: isMe
                          ? 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)'
                          : '#ffffff',
                        color: isMe ? '#ffffff' : '#0f172a',
                        border: isMe ? 'none' : '1.5px solid #e2e8f0',
                        boxShadow: isMe
                          ? '0 4px 14px rgba(190, 18, 60, 0.22)'
                          : '0 2px 8px rgba(0,0,0,0.03)',
                        fontSize: '0.88rem', lineHeight: 1.5, fontWeight: 500
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
                                background: isMe ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                color: isMe ? '#ffffff' : '#0f172a', padding: '0.5rem 0.75rem',
                                borderRadius: '10px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700
                              }}
                            >
                              <FileText size={18} />
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
                      marginTop: '0.2rem', padding: '0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.2rem'
                    }}>
                      {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && <Check size={12} style={{ color: '#be123c' }} />}
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
                    ? 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)'
                    : '#cbd5e1',
                  color: '#ffffff', border: 'none', width: '42px', height: '42px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (text.trim() || filePreview) ? 'pointer' : 'not-allowed',
                  boxShadow: (text.trim() || filePreview) ? '0 4px 14px rgba(190, 18, 60, 0.3)' : 'none',
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
