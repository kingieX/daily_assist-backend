import { AudienceType, NotificationType, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import type {
  CreateAnnouncementInput,
  ListNotificationsQuery,
  ListThreadsQuery,
  PostMessageInput
} from './communications.validation';

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

async function listThreads(query: ListThreadsQuery, currentUserRole: Role, currentUserId: string) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.ConversationWhereInput = {
    type: 'ADMIN_STAFF'
  };

  if (currentUserRole === Role.STAFF) {
    where.staffId = currentUserId;
  } else if (query.staffId) {
    where.staffId = query.staffId;
  }

  const [total, items] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
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
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, staffId: true }
  });

  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (currentUserRole === Role.STAFF && conversation.staffId !== currentUserId) {
    throw new ApiError(403, 'Forbidden for this conversation');
  }

  return prisma.message.findMany({
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
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, staffId: true }
  });

  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (currentUserRole === Role.STAFF && conversation.staffId !== currentUserId) {
    throw new ApiError(403, 'Forbidden for this conversation');
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderUserId: currentUserId,
        body: input.body,
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
      await tx.notification.create({
        data: {
          userId: conversation.staffId,
          type: NotificationType.MESSAGE,
          title: 'New message',
          body: input.body.slice(0, 150),
          metadataJson: { conversationId }
        }
      });
    }

    return created;
  });

  return message;
}

async function deleteMessage(messageId: string, currentUserRole: Role, currentUserId: string) {
  const message = await prisma.message.findUnique({
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
  const isStaffInThread = currentUserRole === Role.STAFF && message.conversation.staffId === currentUserId;
  const isAdmin = currentUserRole === Role.ADMIN || currentUserRole === Role.SUPER_ADMIN;

  if (!isOwner && !isStaffInThread && !isAdmin) {
    throw new ApiError(403, 'Forbidden to delete this message');
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() }
  });

  return { id: messageId, deleted: true };
}

async function listAnnouncements(currentUserRole: Role, currentUserId: string) {
  if (currentUserRole === Role.STAFF) {
    return prisma.announcementRecipient.findMany({
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

  return prisma.announcement.findMany({
    include: {
      _count: { select: { recipients: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function createAnnouncement(input: CreateAnnouncementInput, actorUserId: string) {
  const staffWhere: Prisma.UserWhereInput = {
    role: Role.STAFF,
    status: 'ACTIVE'
  };

  if (input.audienceType === AudienceType.SELECTED_STAFF) {
    staffWhere.id = { in: input.staffIds ?? [] };
  }

  const recipients = await prisma.user.findMany({
    where: staffWhere,
    select: { id: true }
  });

  if (recipients.length === 0) {
    throw new ApiError(400, 'No eligible staff recipients found for announcement');
  }

  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        audienceType: input.audienceType,
        createdBy: actorUserId,
        recipients: {
          createMany: {
            data: recipients.map((recipient) => ({ staffId: recipient.id }))
          }
        }
      },
      include: {
        _count: { select: { recipients: true } }
      }
    });

    await tx.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        type: NotificationType.ANNOUNCEMENT,
        title: input.title,
        body: input.body.slice(0, 200),
        metadataJson: { announcementId: announcement.id }
      }))
    });

    return announcement;
  });
}

async function deleteAnnouncement(id: string) {
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'Announcement not found');

  await prisma.announcement.delete({ where: { id } });
  return { id, deleted: true };
}

async function listNotifications(query: ListNotificationsQuery, userId: string) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = { userId };
  if (query.type) where.type = query.type;
  if (query.unreadOnly) where.readAt = null;

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit
    })
  ]);

  return paginated(items, total, page, limit);
}

async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, readAt: true }
  });

  if (!notification) throw new ApiError(404, 'Notification not found');

  if (notification.readAt) return { id: notification.id, readAt: notification.readAt };

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: { id: true, readAt: true }
  });
}

async function deleteNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true }
  });

  if (!notification) throw new ApiError(404, 'Notification not found');

  await prisma.notification.delete({ where: { id: notificationId } });
  return { id: notificationId, deleted: true };
}

export const communicationsService = {
  listThreads,
  getThreadMessages,
  postMessage,
  deleteMessage,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  listNotifications,
  markNotificationRead,
  deleteNotification
};
