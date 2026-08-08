import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { realtimeGateway } from '../../realtime/realtime.gateway';
import { enqueueNotificationEvent } from '../notifications/notification-events.service';
import { ApiError } from '../../utils/api-error';
import type {
  CreateAnnouncementInput,
  CreateThreadInput,
  ListAnnouncementsQuery,
  ListNotificationsQuery,
  ListThreadsQuery,
  PostMessageInput,
  UpdateNotificationPreferencesInput
} from './communications.validation';

const COMM_AUDIENCE = {
  ALL_STAFF: 'ALL_STAFF',
  SELECTED_STAFF: 'SELECTED_STAFF',
  BY_ZONE: 'BY_ZONE',
  CAR_OWNER: 'CAR_OWNER'
} as const;

const COMM_NOTIFICATION_TYPE = {
  MESSAGE: 'MESSAGE',
  ANNOUNCEMENT: 'ANNOUNCEMENT'
} as const;

const db = prisma as any;

function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

function staffName(staff: any): string {
  const profile = staff?.staffProfile;
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || staff?.email || staff?.id || '';
}

function announcementIcon(sender: string): 'megaphone' | 'bell' | 'headset' {
  if (sender === 'System') return 'bell';
  if (sender === 'Daily Assist Uk Office') return 'headset';
  return 'megaphone';
}

function visitsCard(announcement: any, staffFacing = false) {
  if (!announcement.visitSummary) return null;
  return {
    ...(staffFacing ? { title: 'Today’s Visit Summary' } : {}),
    count: announcement.visitCount ?? 0,
    firstVisit: announcement.firstVisitTime ?? '',
    lastVisit: announcement.lastVisitTime ?? ''
  };
}

function adminAnnouncementResponse(announcement: any) {
  const acknowledgements = announcement.acknowledgeRequired
    ? (announcement.recipients ?? []).map((recipient: any) => ({
      staffId: recipient.staffId,
      name: staffName(recipient.staff),
      status: recipient.acknowledgedAt ? 'Acknowledged' : 'Pending',
      acknowledgedAt: recipient.acknowledgedAt ? recipient.acknowledgedAt.toISOString() : null
    }))
    : [];
  return {
    id: announcement.id,
    icon: announcementIcon(announcement.sender),
    title: announcement.title,
    sender: announcement.sender,
    sentAt: announcement.createdAt.toISOString(),
    sendTo: announcement.sendTo,
    recipients: announcement.sendTo === 'All Staff' ? 'All Staff' : `${announcement.recipients?.length ?? 0} staff`,
    message: announcement.body,
    acknowledgeRequired: announcement.acknowledgeRequired,
    visitsCard: visitsCard(announcement),
    acknowledgements,
    acknowledgedCount: acknowledgements.filter((item: any) => item.status === 'Acknowledged').length,
    totalRecipients: announcement.recipients?.length ?? 0
  };
}

function staffAnnouncementResponse(recipient: any) {
  const announcement = recipient.announcement;
  return {
    id: announcement.id,
    icon: announcementIcon(announcement.sender),
    subject: announcement.title,
    from: announcement.sender,
    sent: announcement.createdAt.toISOString(),
    greeting: null,
    body: announcement.body,
    instructions: [],
    closing: null,
    visitsCard: visitsCard(announcement, true),
    acknowledgeRequired: announcement.acknowledgeRequired,
    acknowledgedByMe: Boolean(recipient.acknowledgedAt),
    isNew: !recipient.readAt
  };
}

async function createThread(input: CreateThreadInput, currentUserRole: Role, currentUserId: string) {
  let staffId = input.staffId;

  if (currentUserRole === Role.STAFF) {
    if (staffId && staffId !== currentUserId) {
      throw new ApiError(403, 'Staff can only create their own thread');
    }
    staffId = currentUserId;
  }

  if (!staffId) {
    throw new ApiError(400, 'staffId is required to create a thread');
  }

  const staff = await db.user.findFirst({
    where: { id: staffId, role: Role.STAFF, status: 'ACTIVE' },
    select: { id: true }
  });
  if (!staff) throw new ApiError(404, 'Staff user not found or inactive');

  const thread = await db.conversation.upsert({
    where: {
      type_staffId: {
        type: 'ADMIN_STAFF',
        staffId
      }
    },
    update: { updatedAt: new Date() },
    create: {
      type: 'ADMIN_STAFF',
      staffId
    },
    include: {
      staff: {
        select: {
          id: true,
          email: true,
          staffProfile: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });

  return thread;
}

async function listThreads(query: ListThreadsQuery, currentUserRole: Role, currentUserId: string) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: any = {
    type: 'ADMIN_STAFF'
  };

  if (currentUserRole === Role.STAFF) {
    where.staffId = currentUserId;
  } else if (query.staffId) {
    where.staffId = query.staffId;
  }

  const [total, items] = await Promise.all([
    db.conversation.count({ where }),
    db.conversation.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            email: true,
            staffProfile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            body: true,
            senderUserId: true,
            createdAt: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  return paginated(items, total, page, limit);
}

async function getThreadMessages(conversationId: string, currentUserRole: Role, currentUserId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, staffId: true }
  });

  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (currentUserRole === Role.STAFF && conversation.staffId !== currentUserId) {
    throw new ApiError(403, 'Forbidden for this conversation');
  }

  return db.message.findMany({
    where: {
      conversationId,
      deletedAt: null
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      body: true,
      attachmentUrl: true,
      senderUserId: true,
      createdAt: true
    }
  });
}

async function postMessage(
  conversationId: string,
  input: PostMessageInput,
  currentUserRole: Role,
  currentUserId: string
) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, staffId: true }
  });

  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (currentUserRole === Role.STAFF && conversation.staffId !== currentUserId) {
    throw new ApiError(403, 'Forbidden for this conversation');
  }

  const message = await db.$transaction(async (tx: any) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderUserId: currentUserId,
        body: input.body?.trim() || (input.attachmentUrl ? '[Attachment]' : ''),
        attachmentUrl: input.attachmentUrl ?? null
      },
      select: {
        id: true,
        body: true,
        attachmentUrl: true,
        senderUserId: true,
        createdAt: true
      }
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return created;
  });

  realtimeGateway.emitToConversation(conversationId, 'message:created', { ...message, conversationId });
  if (conversation.staffId && conversation.staffId !== currentUserId) {
    await enqueueNotificationEvent('message.created', {
      actorUserId: currentUserId,
      recipientIds: [conversation.staffId],
      type: COMM_NOTIFICATION_TYPE.MESSAGE,
      title: 'New message',
      body: (input.body?.trim() || 'New attachment').slice(0, 150),
      metadataJson: { conversationId, messageId: message.id }
    });
  }

  return message;
}

async function deleteMessage(messageId: string, currentUserRole: Role, currentUserId: string) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        select: { id: true, staffId: true }
      }
    }
  });

  if (!message) throw new ApiError(404, 'Message not found');
  if (message.deletedAt) return { id: message.id, deleted: true };

  const isOwner = message.senderUserId === currentUserId;
  const isAdmin = currentUserRole === Role.ADMIN || currentUserRole === Role.SUPER_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Only sender or admin can delete this message');
  }

  await db.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() }
  });

  realtimeGateway.emitToConversation(message.conversation.id, 'message:deleted', { id: messageId, conversationId: message.conversation.id });
  return { id: messageId, deleted: true };
}

async function listAnnouncements(currentUserRole: Role, currentUserId: string, query?: ListAnnouncementsQuery) {
  if (currentUserRole === Role.STAFF) {
    const recipients = await db.announcementRecipient.findMany({
      where: { staffId: currentUserId },
      include: {
        announcement: true
      },
      orderBy: { announcement: { createdAt: 'desc' } }
    });
    return recipients.map(staffAnnouncementResponse);
  }

  const page = query?.page ?? 1;
  const limit = query?.pageSize ?? 20;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (query?.sendTo) where.sendTo = query.sendTo;
  if (query?.fromDate || query?.toDate) {
    where.createdAt = {};
    if (query.fromDate) where.createdAt.gte = query.fromDate;
    if (query.toDate) where.createdAt.lte = query.toDate;
  }

  const [total, items] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      include: {
        recipients: {
          include: {
            staff: { select: { id: true, email: true, staffProfile: { select: { firstName: true, lastName: true } } } }
          },
          orderBy: { staffId: 'asc' }
        }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip,
      take: limit
    })
  ]);

  return paginated(items.map(adminAnnouncementResponse), total, page, limit);
}

async function markAnnouncementRead(announcementId: string, userId: string) {
  const recipient = await db.announcementRecipient.findFirst({
    where: { announcementId, staffId: userId },
    select: { id: true, readAt: true }
  });

  if (!recipient) throw new ApiError(404, 'Announcement recipient not found');
  if (recipient.readAt) return recipient;

  return db.announcementRecipient.update({
    where: { id: recipient.id },
    data: { readAt: new Date() },
    select: { id: true, readAt: true }
  });
}

async function createAnnouncement(input: CreateAnnouncementInput, actorUserId: string) {
  const staffWhere: any = { role: Role.STAFF, status: 'ACTIVE' };

  if (input.sendTo === 'Select Staff') {
    staffWhere.id = { in: input.recipientIds };
  } else if (input.sendTo === 'By Zone') {
    staffWhere.staffProfile = { zone: input.zone };
  } else if (input.sendTo === 'Car Owner') {
    staffWhere.staffProfile = { ownsCar: true };
  }

  const recipients = await db.user.findMany({
    where: staffWhere,
    select: { id: true, email: true, staffProfile: { select: { firstName: true, lastName: true } } }
  });

  if (recipients.length === 0) {
    throw new ApiError(400, 'No eligible staff recipients found for announcement');
  }

  const announcement = await db.$transaction(async (tx: any) => {
    const created = await tx.announcement.create({
      data: {
        title: input.title,
        body: input.message,
        sender: input.sender,
        audienceType: input.audienceType,
        sendTo: input.sendTo,
        recipientIds: input.recipientIds,
        zone: input.zone ?? null,
        acknowledgeRequired: input.acknowledgeRequired,
        visitSummary: input.visitSummary,
        visitCount: input.visitSummary ? input.visitCount : null,
        firstVisitTime: input.visitSummary ? input.firstVisitTime : null,
        lastVisitTime: input.visitSummary ? input.lastVisitTime : null,
        createdBy: actorUserId,
        recipients: { createMany: { data: recipients.map((recipient: any) => ({ staffId: recipient.id })) } }
      },
      include: {
        recipients: {
          include: { staff: { select: { id: true, email: true, staffProfile: { select: { firstName: true, lastName: true } } } } },
          orderBy: { staffId: 'asc' }
        }
      }
    });

    return adminAnnouncementResponse(created);
  });

  await enqueueNotificationEvent('announcement.created', {
    actorUserId,
    recipientIds: recipients.map((recipient: any) => recipient.id),
    type: COMM_NOTIFICATION_TYPE.ANNOUNCEMENT,
    title: input.title,
    body: input.message.slice(0, 200),
    metadataJson: { announcementId: announcement.id }
  });

  return announcement;
}

async function acknowledgeAnnouncement(announcementId: string, userId: string) {
  const recipient = await db.announcementRecipient.findFirst({
    where: { announcementId, staffId: userId },
    include: { announcement: { select: { acknowledgeRequired: true } } }
  });

  if (!recipient) throw new ApiError(404, 'Announcement not found');
  if (!recipient.announcement.acknowledgeRequired) throw new ApiError(400, 'This announcement does not require acknowledgement');
  if (recipient.acknowledgedAt) {
    return { id: announcementId, acknowledgedByMe: true, acknowledgedAt: recipient.acknowledgedAt.toISOString() };
  }

  const updated = await db.announcementRecipient.update({
    where: { id: recipient.id },
    data: { acknowledgedAt: new Date(), readAt: recipient.readAt ?? new Date() },
    select: { acknowledgedAt: true }
  });

  return { id: announcementId, acknowledgedByMe: true, acknowledgedAt: updated.acknowledgedAt.toISOString() };
}

async function deleteAnnouncement(id: string) {
  const existing = await db.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'Announcement not found');

  await db.announcement.delete({ where: { id } });
  return { id, deleted: true };
}

async function listNotifications(query: ListNotificationsQuery, userId: string) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (query.type) where.type = query.type;
  if (query.unreadOnly) where.readAt = null;

  const [total, items] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit
    })
  ]);

  return paginated(items, total, page, limit);
}

async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, readAt: true }
  });

  if (!notification) throw new ApiError(404, 'Notification not found');

  if (notification.readAt) return { id: notification.id, readAt: notification.readAt };

  return db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: { id: true, readAt: true }
  });
}

async function deleteNotification(notificationId: string, userId: string) {
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true }
  });

  if (!notification) throw new ApiError(404, 'Notification not found');

  await db.notification.delete({ where: { id: notificationId } });
  return { id: notificationId, deleted: true };
}

async function getNotificationPreferences(userId: string) {
  const pref = await db.notificationPreference.findUnique({
    where: { userId }
  });

  if (pref) return pref;

  return db.notificationPreference.create({
    data: { userId }
  });
}

async function updateNotificationPreferences(userId: string, input: UpdateNotificationPreferencesInput) {
  await getNotificationPreferences(userId);

  return db.notificationPreference.update({
    where: { userId },
    data: {
      emailEnabled: input.emailEnabled,
      inAppEnabled: input.inAppEnabled,
      messageEnabled: input.messageEnabled,
      announcementEnabled: input.announcementEnabled,
      visitEnabled: input.visitEnabled,
      systemEnabled: input.systemEnabled
    }
  });
}

async function listAdminInbox(query: any) {
  const page = query.page ?? 1;
  const limit = query.pageSize ?? 20;
  const search = String(query.search ?? '').toLowerCase();
  const tab = query.tab ?? 'all';
  const items: any[] = [];

  if (tab === 'all') {
    const threads = await listThreads({ page, limit, staffId: undefined } as any, Role.ADMIN, '');
    items.push(...threads.items.map((thread: any) => ({ id: thread.id, tab: 'all', name: staffName(thread.staff), icon: null, avatar: thread.staff?.staffProfile?.photoUrl ?? null, lastMessage: thread.messages?.[0]?.body ?? '', time: (thread.messages?.[0]?.createdAt ?? thread.updatedAt).toISOString(), unread: false })));
  } else if (tab === 'announcement') {
    const result = await listAnnouncements(Role.ADMIN, '', { page, pageSize: limit } as any);
    items.push(...result.items.map((item: any) => ({ id: item.id, tab: 'announcement', name: item.title, icon: item.icon, avatar: null, lastMessage: item.message, time: item.sentAt, unread: false })));
  } else if (tab === 'notification') {
    const result = await db.notification.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit, skip: (page - 1) * limit });
    items.push(...result.map((n: any) => ({ id: n.id, tab: 'notification', name: n.title, icon: 'bell', avatar: null, lastMessage: n.body, time: n.createdAt.toISOString(), unread: !n.readAt })));
  }
  const filtered = search ? items.filter((item) => item.name.toLowerCase().includes(search)) : items;
  return paginated(filtered, filtered.length, page, limit);
}

async function getAdminInboxDetail(id: string) {
  const conversation = await db.conversation.findUnique({ where: { id }, include: { staff: { include: { staffProfile: true } }, messages: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } } });
  if (conversation) return { id, tab: 'all', name: staffName(conversation.staff), avatar: conversation.staff?.staffProfile?.photoUrl ?? null, messages: conversation.messages.map((m: any) => ({ id: m.id, sender: m.senderUserId === conversation.staffId ? 'staff' : 'admin', text: m.body, time: m.createdAt.toISOString(), read: Boolean(m.readAt) })) };
  const announcement = await db.announcement.findUnique({ where: { id }, include: { recipients: { include: { staff: { include: { staffProfile: true } } } } } });
  if (announcement) return { tab: 'announcement', ...adminAnnouncementResponse(announcement) };
  const notification = await db.notification.findUnique({ where: { id } });
  if (notification) return { id, tab: 'notification', name: notification.title, from: 'System', received: notification.createdAt.toISOString(), body: notification.body, actions: [], notificationType: String(notification.type).toLowerCase(), embeddedCard: notification.metadataJson ?? null, visitDetails: notification.metadataJson ?? null };
  throw new ApiError(404, 'Message not found');
}

async function startAdminMessage(input: any, userId: string) {
  const thread = await createThread({ staffId: input.staffId }, Role.ADMIN, userId);
  await postMessage(thread.id, { body: input.message }, Role.ADMIN, userId);
  return getAdminInboxDetail(thread.id);
}

async function replyToConversation(id: string, text: string, role: Role, userId: string) {
  const created = await postMessage(id, { body: text }, role, userId);
  return { id: created.id, text: created.body, time: created.createdAt.toISOString() };
}

async function deleteInboxItem(id: string, userId: string, role: Role) {
  const conversation = await db.conversation.findUnique({ where: { id }, select: { id: true, staffId: true } });
  if (conversation) {
    if (role === Role.STAFF && conversation.staffId !== userId) throw new ApiError(403, 'Forbidden for this conversation');
    await db.message.updateMany({ where: { conversationId: id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
  const notification = await db.notification.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (notification) return deleteNotification(id, notification.userId);
  if (role !== Role.STAFF) return deleteAnnouncement(id);
  throw new ApiError(404, 'Message not found');
}

async function listStaffInbox(userId: string, query: any = {}) {
  const page = query.page ?? 1; const limit = query.pageSize ?? 20;
  const [threads, announcements, notifications] = await Promise.all([listThreads({ page: 1, limit: 100 } as any, Role.STAFF, userId), listAnnouncements(Role.STAFF, userId), listNotifications({ page: 1, limit: 100 } as any, userId)]);
  const items = [
    ...threads.items.map((t: any) => ({ id: t.id, type: 'chat', sender: 'Manager', subject: staffName(t.staff), time: (t.messages?.[0]?.createdAt ?? t.updatedAt).toISOString(), isNew: false })),
    ...announcements.map((a: any) => ({ id: a.id, type: a.visitsCard ? 'rota' : 'message', sender: a.from, subject: a.subject, time: a.sent, isNew: a.isNew })),
    ...notifications.items.map((n: any) => ({ id: n.id, type: 'reminder', sender: 'System', subject: n.title, time: n.createdAt.toISOString(), isNew: !n.readAt }))
  ].sort((a,b) => b.time.localeCompare(a.time));
  return paginated(items.slice((page-1)*limit, page*limit), items.length, page, limit);
}

async function getStaffInboxDetail(id: string, userId: string) {
  const conversation = await db.conversation.findUnique({ where: { id }, include: { messages: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } } });
  if (conversation) return { id, type: 'chat', sender: 'Manager', chatMessages: conversation.messages.map((m: any) => ({ id: m.id, from: m.senderUserId === userId ? 'staff' : 'manager', sender: m.senderUserId === userId ? 'You' : 'Manager', time: m.createdAt.toISOString(), paragraphs: [m.body] })) };
  const recipient = await db.announcementRecipient.findFirst({ where: { announcementId: id, staffId: userId }, include: { announcement: true } });
  if (recipient) { await markAnnouncementRead(id, userId); return staffAnnouncementResponse({ ...recipient, readAt: new Date() }); }
  const notification = await markNotificationRead(id, userId).catch(() => null);
  if (notification) { const n = await db.notification.findUnique({ where: { id } }); return { id, type: 'reminder', subject: n.title, from: 'System', sent: n.createdAt.toISOString(), icon: 'bell', body: n.body }; }
  throw new ApiError(404, 'Message not found');
}

export const communicationsService = {
  listAdminInbox,
  getAdminInboxDetail,
  startAdminMessage,
  replyToConversation,
  deleteInboxItem,
  listStaffInbox,
  getStaffInboxDetail,
  createThread,
  listThreads,
  getThreadMessages,
  postMessage,
  deleteMessage,
  listAnnouncements,
  markAnnouncementRead,
  createAnnouncement,
  acknowledgeAnnouncement,
  deleteAnnouncement,
  listNotifications,
  markNotificationRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences
};
