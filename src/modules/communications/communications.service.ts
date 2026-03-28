import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import type {
  CreateAnnouncementInput,
  CreateThreadInput,
  ListNotificationsQuery,
  ListThreadsQuery,
  PostMessageInput,
  UpdateNotificationPreferencesInput
} from './communications.validation';

const COMM_AUDIENCE = {
  ALL_STAFF: 'ALL_STAFF',
  SELECTED_STAFF: 'SELECTED_STAFF'
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

async function listAnnouncements(currentUserRole: Role, currentUserId: string) {
  if (currentUserRole === Role.STAFF) {
    return db.announcementRecipient.findMany({
      where: { staffId: currentUserId },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            body: true,
            audienceType: true,
            createdAt: true,
            createdBy: true
          }
        }
      },
      orderBy: { announcement: { createdAt: 'desc' } }
    });
  }

  return db.announcement.findMany({
    include: {
      _count: { select: { recipients: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
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
  const staffWhere: any = {
    role: Role.STAFF,
    status: 'ACTIVE'
  };

  if (input.audienceType === COMM_AUDIENCE.SELECTED_STAFF) {
    staffWhere.id = { in: input.staffIds ?? [] };
  }

  const recipients = await db.user.findMany({
    where: staffWhere,
    select: { id: true }
  });

  if (recipients.length === 0) {
    throw new ApiError(400, 'No eligible staff recipients found for announcement');
  }

  return db.$transaction(async (tx: any) => {
    const announcement = await tx.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        audienceType: input.audienceType,
        createdBy: actorUserId,
        recipients: {
          createMany: {
            data: recipients.map((recipient: any) => ({ staffId: recipient.id }))
          }
        }
      },
      include: {
        _count: { select: { recipients: true } }
      }
    });

    const recipientPreferences = await tx.notificationPreference.findMany({
      where: {
        userId: { in: recipients.map((recipient: any) => recipient.id) }
      },
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
          body: input.body.slice(0, 200),
          metadataJson: { announcementId: announcement.id }
        }))
    });

    return announcement;
  });
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
  deleteAnnouncement,
  listNotifications,
  markNotificationRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences
};
