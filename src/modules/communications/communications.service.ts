import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
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

    if (conversation.staffId && conversation.staffId !== currentUserId) {
      const preferences = await tx.notificationPreference.findUnique({
        where: { userId: conversation.staffId }
      });
      if ((preferences?.inAppEnabled ?? true) && (preferences?.messageEnabled ?? true)) {
        await tx.notification.create({
          data: {
            userId: conversation.staffId,
            type: COMM_NOTIFICATION_TYPE.MESSAGE,
            title: 'New message',
            body: (input.body?.trim() || 'New attachment').slice(0, 150),
            metadataJson: { conversationId }
          }
        });
      }
    }

    return created;
  });

  return message;
}

async function deleteMessage(messageId: string, currentUserRole: Role, currentUserId: string) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        select: { staffId: true }
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

  return db.$transaction(async (tx: any) => {
    const announcement = await tx.announcement.create({
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

    const recipientPreferences = await tx.notificationPreference.findMany({
      where: { userId: { in: recipients.map((recipient: any) => recipient.id) } },
      select: { userId: true, inAppEnabled: true, announcementEnabled: true }
    });
    const prefsMap = new Map<string, any>(recipientPreferences.map((pref: any) => [pref.userId, pref]));

    await tx.notification.createMany({
      data: recipients
        .filter((recipient: any) => {
          const pref = prefsMap.get(recipient.id);
          return (pref?.inAppEnabled ?? true) && (pref?.announcementEnabled ?? true);
        })
        .map((recipient: any) => ({
          userId: recipient.id,
          type: COMM_NOTIFICATION_TYPE.ANNOUNCEMENT,
          title: input.title,
          body: input.message.slice(0, 200),
          metadataJson: { announcementId: announcement.id }
        }))
    });

    return adminAnnouncementResponse(announcement);
  });
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

export const communicationsService = {
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
