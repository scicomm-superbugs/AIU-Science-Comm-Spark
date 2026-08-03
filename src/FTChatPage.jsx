import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { db, useLiveCollection } from './db';
import { 
  MessageSquare, Send, User, Search, Plus, X, Clock, Check, CheckCheck, 
  Sparkles, ChevronLeft, Shield, Award, GraduationCap, HelpCircle, FileText, 
  MessageCircle, ArrowRight, UserCheck
} from 'lucide-react';
import { getCleanAcademicTitle, FT_ROLE_LABELS, FT_ROLE_COLORS, renderFormattedDescription } from './ftConstants';
import './scicommspark.css';

export default function FTChatPage() {
  const { user } = useAuth();
  const allAccounts = useLiveCollection('scientists') || [];
  const allConversations = useLiveCollection('ft_conversations') || [];
  const allMessages = useLiveCollection('ft_messages') || [];

  const meDoc = useMemo(() => {
    return allAccounts.find(s => s.id === user?.id || s.username === user?.username) || user;
  }, [allAccounts, user]);

  const myId = meDoc?.id || user?.id || user?.username || 'me';
  const myName = meDoc?.name || user?.name || user?.username || 'User';
  const myRole = meDoc?.role || user?.role || 'competitor';

  const [activeConvId, setActiveConvId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('staff'); // 'staff', 'judge', 'trainer', 'admin', 'all'

  const messagesEndRef = useRef(null);

  // Filter conversations for the logged-in user
  const myConversations = useMemo(() => {
    if (!allConversations) return [];
    return allConversations
      .filter(c => Array.isArray(c.participantIds) && c.participantIds.includes(myId))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [allConversations, myId]);

  // Auto-select first conversation on load if available
  useEffect(() => {
    if (!activeConvId && myConversations.length > 0) {
      setActiveConvId(myConversations[0].id);
    }
  }, [myConversations, activeConvId]);

  // Get active conversation object
  const activeConv = useMemo(() => {
    return myConversations.find(c => c.id === activeConvId);
  }, [myConversations, activeConvId]);

  // Identify recipient in active conversation
  const activeRecipientId = useMemo(() => {
    if (!activeConv || !Array.isArray(activeConv.participantIds)) return null;
    return activeConv.participantIds.find(id => id !== myId);
  }, [activeConv, myId]);

  const activeRecipient = useMemo(() => {
    if (!activeRecipientId) return null;
    return allAccounts.find(s => s.id === activeRecipientId || s.username === activeRecipientId) || {
      id: activeRecipientId,
      name: activeConv?.participantDetails?.[activeRecipientId]?.name || 'User',
      role: activeConv?.participantDetails?.[activeRecipientId]?.role || 'judge'
    };
  }, [allAccounts, activeRecipientId, activeConv]);

  // Messages for active conversation
  const currentMessages = useMemo(() => {
    if (!activeConvId || !allMessages) return [];
    return allMessages
      .filter(m => m.conversationId === activeConvId)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [allMessages, activeConvId]);

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // Clear unread count when opening conversation
  useEffect(() => {
    if (activeConvId && activeConv && activeConv.unreadCounts?.[myId] > 0) {
      const updatedCounts = { ...(activeConv.unreadCounts || {}), [myId]: 0 };
      db.ft_conversations.update(activeConvId, { unreadCounts: updatedCounts }).catch(console.error);
    }
  }, [activeConvId, activeConv, myId]);

  // Send a new message
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || messageText).trim();
    if (!text || !activeConvId || !activeRecipientId) return;

    setMessageText('');

    const now = new Date().toISOString();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Add message
    await db.ft_messages.add({
      id: msgId,
      conversationId: activeConvId,
      senderId: myId,
      senderName: myName,
      senderRole: myRole,
      recipientId: activeRecipientId,
      text: text,
      createdAt: now,
      status: 'sent'
    });

    // Update conversation summary
    const recipientUnread = (activeConv?.unreadCounts?.[activeRecipientId] || 0) + 1;
    const updatedUnread = {
      ...(activeConv?.unreadCounts || {}),
      [myId]: 0,
      [activeRecipientId]: recipientUnread
    };

    await db.ft_conversations.update(activeConvId, {
      lastMessage: text,
      lastSenderId: myId,
      updatedAt: now,
      unreadCounts: updatedUnread
    });

    // Trigger in-app notification bell for recipient
    try {
      await db.ft_notifications.add({
        userId: activeRecipientId,
        title: `💬 New Message from ${myName}`,
        message: text.length > 80 ? text.substring(0, 80) + '...' : text,
        type: 'chat',
        status: 'unread',
        createdAt: now,
        link: `/dashboard/chat`
      });
    } catch (nErr) {
      console.warn('Chat notification error:', nErr);
    }
  };

  // Start or open conversation with a target user
  const handleStartChatWithUser = async (targetUser) => {
    if (!targetUser) return;
    const targetId = targetUser.id || targetUser.username;
    
    // Check if conversation already exists
    let existing = myConversations.find(c => Array.isArray(c.participantIds) && c.participantIds.includes(targetId));
    
    if (existing) {
      setActiveConvId(existing.id);
    } else {
      // Create new conversation
      const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newConv = {
        id: convId,
        participantIds: [myId, targetId],
        participantDetails: {
          [myId]: { name: myName, role: myRole },
          [targetId]: { name: targetUser.name || targetUser.username, role: targetUser.role }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: 'Conversation started',
        lastSenderId: myId,
        unreadCounts: { [myId]: 0, [targetId]: 0 }
      };

      await db.ft_conversations.add(newConv);
      setActiveConvId(convId);
    }

    setShowNewChatModal(false);
  };

  // Contacts list for starting new chat
  const eligibleRecipients = useMemo(() => {
    return allAccounts.filter(acc => {
      const accId = acc.id || acc.username;
      if (accId === myId) return false;

      const r = acc.role;
      const isStaffRole = ['master', 'admin', 'judge', 'trainer', 'academic_judge', 'scicomm_judge', 'trainer_judge'].includes(r);

      if (selectedRoleFilter === 'staff') return isStaffRole;
      if (selectedRoleFilter === 'judge') return ['judge', 'academic_judge', 'scicomm_judge', 'trainer_judge'].includes(r);
      if (selectedRoleFilter === 'trainer') return ['trainer', 'trainer_judge'].includes(r);
      if (selectedRoleFilter === 'admin') return ['master', 'admin'].includes(r);
      if (selectedRoleFilter === 'competitors') return ['competitor', 'user'].includes(r);

      return true;
    }).filter(acc => {
      if (!newChatSearch.trim()) return true;
      const q = newChatSearch.toLowerCase();
      return (
        (acc.name || '').toLowerCase().includes(q) ||
        (acc.username || '').toLowerCase().includes(q) ||
        (acc.department || '').toLowerCase().includes(q) ||
        (acc.institutionName || '').toLowerCase().includes(q)
      );
    });
  }, [allAccounts, myId, selectedRoleFilter, newChatSearch]);

  // Filtered sidebar conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return myConversations;
    const q = searchQuery.toLowerCase();
    return myConversations.filter(c => {
      const otherId = c.participantIds?.find(id => id !== myId);
      const otherAcc = allAccounts.find(s => s.id === otherId || s.username === otherId);
      const name = otherAcc?.name || otherAcc?.username || '';
      return name.toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q);
    });
  }, [myConversations, searchQuery, myId, allAccounts]);

  const presetQuestions = [
    "📋 Question about Stage 1 requirements & deliverable guidelines",
    "⚖️ Clarification needed on Evaluation criteria breakdown",
    "🎓 Requesting mentorship & feedback on my submission",
    "🛠️ Technical question regarding upload formats & deadlines"
  ];

  return (
    <div className="ft-chat-wrapper" style={{ padding: '0.5rem', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header Banner Card */}
      <div style={{
        background: '#ffffff', borderRadius: '20px', padding: '1.2rem 1.6rem', marginBottom: '1rem',
        border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(190, 18, 60, 0.25)'
          }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Ask & Chat Hub
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0.15rem 0 0 0', fontWeight: 600 }}>
              Direct inquiry & real-time messaging with Competition Judges, Trainers & Administrators
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewChatModal(true)}
          style={{
            background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
            color: '#ffffff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '12px',
            fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.45rem',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(190, 18, 60, 0.3)', transition: 'all 0.2s ease'
          }}
        >
          <Plus size={18} /> Ask a Judge / Trainer
        </button>
      </div>

      {/* Main Chat Layout (Sidebar Contacts + Chat Canvas) */}
      <div style={{
        flex: 1, height: '620px', minHeight: '520px', background: '#ffffff', borderRadius: '24px',
        border: '1.5px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
        display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden', position: 'relative'
      }}>

        {/* ── LEFT SIDEBAR: CONVERSATIONS LIST ────────────────── */}
        <div style={{
          borderRight: '1px solid #e2e8f0', background: '#f8fafc',
          display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0
        }}>
          {/* Search Bar */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem', borderRadius: '12px',
                  border: '1.5px solid #cbd5e1', fontSize: '0.84rem', background: '#ffffff',
                  outline: 'none', color: '#0f172a', fontWeight: 600
                }}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <MessageCircle size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>No Conversations Yet</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.25rem', color: '#64748b' }}>
                  Click "Ask a Judge / Trainer" to start your inquiry.
                </div>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const otherId = conv.participantIds?.find(id => id !== myId);
                const otherAcc = allAccounts.find(s => s.id === otherId || s.username === otherId) || {
                  name: conv.participantDetails?.[otherId]?.name || 'User',
                  role: conv.participantDetails?.[otherId]?.role || 'judge'
                };

                const isSelected = conv.id === activeConvId;
                const unreadCount = conv.unreadCounts?.[myId] || 0;
                const roleColor = FT_ROLE_COLORS[otherAcc.role] || '#2563eb';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    style={{
                      padding: '0.85rem 0.95rem', borderRadius: '16px', marginBottom: '0.4rem',
                      background: isSelected ? '#ffffff' : 'transparent',
                      border: isSelected ? '1.5px solid #cbd5e1' : '1.5px solid transparent',
                      boxShadow: isSelected ? '0 4px 14px rgba(0,0,0,0.04)' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.75rem'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={otherAcc.avatarUrl || otherAcc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherAcc.username || otherAcc.name}`}
                        alt={otherAcc.name}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${roleColor}` }}
                      />
                      <span style={{
                        position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px',
                        borderRadius: '50%', background: '#22c55e', border: '2px solid #ffffff'
                      }} />
                    </div>

                    {/* Meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {otherAcc.name || otherAcc.username}
                        </div>
                        {conv.updatedAt && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                            {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{
                          fontSize: '0.78rem', color: unreadCount > 0 ? '#0f172a' : '#64748b',
                          fontWeight: unreadCount > 0 ? 800 : 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px'
                        }}>
                          {conv.lastMessage || 'Start conversation...'}
                        </div>

                        {unreadCount > 0 && (
                          <span style={{
                            background: '#be123c', color: '#ffffff', fontSize: '0.7rem',
                            fontWeight: 900, borderRadius: '9999px', padding: '0.1rem 0.45rem', minWidth: '18px', height: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {unreadCount}
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


        {/* ── RIGHT CHAT CANVAS ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#ffffff' }}>
          
          {activeConv && activeRecipient ? (
            <>
              {/* Recipient Header */}
              <div style={{
                padding: '1rem 1.4rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <img
                    src={activeRecipient.avatarUrl || activeRecipient.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRecipient.username || activeRecipient.name}`}
                    alt={activeRecipient.name}
                    style={{
                      width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover',
                      border: `2.5px solid ${FT_ROLE_COLORS[activeRecipient.role] || '#2563eb'}`
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                        {activeRecipient.name || activeRecipient.username}
                      </h3>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                        background: `${FT_ROLE_COLORS[activeRecipient.role] || '#2563eb'}15`,
                        color: FT_ROLE_COLORS[activeRecipient.role] || '#2563eb',
                        border: `1px solid ${FT_ROLE_COLORS[activeRecipient.role] || '#2563eb'}40`
                      }}>
                        {FT_ROLE_LABELS[activeRecipient.role] || activeRecipient.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {getCleanAcademicTitle(activeRecipient) || activeRecipient.department || 'SciComm Competition Staff'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem', color: '#059669', background: '#ecfdf5',
                    padding: '0.25rem 0.65rem', borderRadius: '10px', border: '1px solid #a7f3d0',
                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem'
                  }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} /> Active Inquiry Thread
                  </span>
                </div>
              </div>

              {/* Messages Body Scroll Box */}
              <div style={{
                flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.4rem 1.6rem',
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                display: 'flex', flexDirection: 'column', gap: '1rem'
              }}>
                {currentMessages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '420px', padding: '2rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                      Start your inquiry with {activeRecipient.name}
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                      Ask questions regarding stage deliverables, evaluation criteria, or guidance. Choose a quick template below or type your custom message.
                    </p>

                    {/* Quick Presets */}
                    <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {presetQuestions.map((pq, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(pq)}
                          style={{
                            background: '#ffffff', border: '1.5px solid #cbd5e1', padding: '0.55rem 0.85rem',
                            borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, color: '#334155',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#be123c'; e.currentTarget.style.color = '#be123c'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                        >
                          {pq}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  currentMessages.map(msg => {
                    const isMe = msg.senderId === myId;

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '82%', alignSelf: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          fontSize: '0.72rem', color: '#64748b', fontWeight: 700,
                          marginBottom: '0.2rem', padding: '0 0.3rem'
                        }}>
                          {isMe ? 'You' : msg.senderName}
                        </div>

                        <div
                          dir="auto"
                          style={{
                            padding: '0.85rem 1.1rem', borderRadius: '18px',
                            borderBottomRightRadius: isMe ? '4px' : '18px',
                            borderBottomLeftRadius: isMe ? '18px' : '4px',
                            background: isMe
                              ? 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)'
                              : '#ffffff',
                            color: isMe ? '#ffffff' : '#0f172a',
                            border: isMe ? 'none' : '1.5px solid #e2e8f0',
                            boxShadow: isMe
                              ? '0 4px 14px rgba(190, 18, 60, 0.25)'
                              : '0 2px 8px rgba(0,0,0,0.03)',
                            fontSize: '0.92rem', lineHeight: 1.55, fontWeight: 500,
                            wordBreak: 'break-word'
                          }}
                        >
                          {renderFormattedDescription(msg.text)}
                        </div>

                        <div style={{
                          fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600,
                          marginTop: '0.25rem', padding: '0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && <Check size={12} style={{ color: '#be123c' }} />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <div style={{ padding: '1rem 1.4rem', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
                >
                  <textarea
                    rows={1}
                    dir="auto"
                    placeholder={`Message ${activeRecipient.name}... (Press Enter to send)`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    style={{
                      flex: 1, padding: '0.75rem 1rem', borderRadius: '14px',
                      border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none',
                      resize: 'none', fontFamily: 'inherit', color: '#0f172a', fontWeight: 500
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    style={{
                      background: messageText.trim()
                        ? 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)'
                        : '#cbd5e1',
                      color: '#ffffff', border: 'none', width: '46px', height: '46px', borderRadius: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                      boxShadow: messageText.trim() ? '0 4px 14px rgba(190, 18, 60, 0.3)' : 'none',
                      transition: 'all 0.2s ease', flexShrink: 0
                    }}
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px', background: '#fff1f2',
                color: '#be123c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem', border: '1.5px solid #fecdd3'
              }}>
                <MessageSquare size={32} />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                Select an Inquiry Thread
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                Choose a conversation from the left sidebar or click the button below to start a new chat with a Judge, Trainer, or Administrator.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                style={{
                  background: '#be123c', color: '#ffffff', border: 'none', padding: '0.7rem 1.4rem',
                  borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(190,18,60,0.25)'
                }}
              >
                <Plus size={18} /> Ask a Judge / Trainer
              </button>
            </div>
          )}
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
                  Ask a Judge, Trainer, or Admin
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Select an evaluator or mentor to start a direct inquiry thread
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
                  { id: 'staff', label: 'All Personnel' },
                  { id: 'judge', label: '⚖️ Judges' },
                  { id: 'trainer', label: '🎓 Trainers' },
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
                  placeholder="Search by name, department, or specialty..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem', borderRadius: '12px',
                    border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', color: '#0f172a', fontWeight: 600
                  }}
                />
              </div>
            </div>

            {/* Recipients list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem 1.5rem' }}>
              {eligibleRecipients.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No personnel found matching the selected filter.
                </div>
              ) : (
                eligibleRecipients.map(acc => {
                  const roleColor = FT_ROLE_COLORS[acc.role] || '#2563eb';
                  const title = getCleanAcademicTitle(acc) || acc.department || 'Competition Evaluator';

                  return (
                    <div
                      key={acc.id || acc.username}
                      onClick={() => handleStartChatWithUser(acc)}
                      style={{
                        padding: '0.85rem 1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0',
                        marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'all 0.2s ease', background: '#ffffff'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#be123c'; e.currentTarget.style.background = '#fff1f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <img
                          src={acc.avatarUrl || acc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.username || acc.name}`}
                          alt={acc.name}
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${roleColor}` }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                            {acc.name || acc.username}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>
                            {title}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '8px',
                        background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30`
                      }}>
                        {FT_ROLE_LABELS[acc.role] || acc.role}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
