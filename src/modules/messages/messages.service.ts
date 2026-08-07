import { Role } from '@prisma/client';
import { communicationsService } from '../communications/communications.service';
import type { CreateThreadInput, ListThreadsQuery, PostMessageInput } from '../communications/communications.validation';

async function listAdminInbox(query: any) {
  return communicationsService.listAdminInbox(query);
}

async function getAdminInboxDetail(id: string) {
  return communicationsService.getAdminInboxDetail(id);
}

async function startAdminMessage(input: any, userId: string) {
  return communicationsService.startAdminMessage(input, userId);
}

async function bulkDeleteInbox(ids: string[], userId: string, role: Role) {
  const items = await Promise.all(ids.map((id) => communicationsService.deleteInboxItem(id, userId, role)));
  return { items };
}

async function deleteInboxItem(id: string, userId: string, role: Role) {
  return communicationsService.deleteInboxItem(id, userId, role);
}

async function listStaffInbox(userId: string, query: any = {}) {
  return communicationsService.listStaffInbox(userId, query);
}

async function getStaffInboxDetail(id: string, userId: string) {
  return communicationsService.getStaffInboxDetail(id, userId);
}

async function replyToConversation(id: string, text: string, role: Role, userId: string) {
  return communicationsService.replyToConversation(id, text, role, userId);
}

async function createThread(input: CreateThreadInput, role: Role, userId: string) {
  return communicationsService.createThread(input, role, userId);
}

async function listThreads(query: ListThreadsQuery, role: Role, userId: string) {
  return communicationsService.listThreads(query, role, userId);
}

async function getThreadMessages(id: string, role: Role, userId: string) {
  return communicationsService.getThreadMessages(id, role, userId);
}

async function postMessage(id: string, input: PostMessageInput, role: Role, userId: string) {
  return communicationsService.postMessage(id, input, role, userId);
}

async function deleteMessage(id: string, role: Role, userId: string) {
  return communicationsService.deleteMessage(id, role, userId);
}

export const messagesService = {
  listAdminInbox,
  getAdminInboxDetail,
  startAdminMessage,
  bulkDeleteInbox,
  deleteInboxItem,
  listStaffInbox,
  getStaffInboxDetail,
  replyToConversation,
  createThread,
  listThreads,
  getThreadMessages,
  postMessage,
  deleteMessage
};
