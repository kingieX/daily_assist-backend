import { ApplicationStatus, Prisma } from '@prisma/client';
import { sendBookingInquiryEmail } from '../../config/mailer';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import type { CreateBookingInput, WorkerApplicationInput } from './public.validation';

// ─── Packages ─────────────────────────────────────────────────────────────────

async function listPackages() {
  return prisma.package.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      packageServices: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              description: true,
              isAdditional: true
            }
          }
        }
      }
    }
  });
}

async function getPackageBySlug(slug: string) {
  const pkg = await prisma.package.findFirst({
    where: { slug, isActive: true },
    include: {
      packageServices: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              description: true,
              isAdditional: true
            }
          }
        }
      }
    }
  });

  if (!pkg) {
    throw new ApiError(404, 'Package not found');
  }
  return pkg;
}

// ─── Services ─────────────────────────────────────────────────────────────────

async function listServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      description: true,
      isAdditional: true
    }
  });
}

async function submitBooking(input: CreateBookingInput) {
  await sendBookingInquiryEmail({
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    subject: input.subject,
    message: input.message
  });

  return {
    submittedAt: new Date().toISOString()
  };
}

// ─── Worker Applications ──────────────────────────────────────────────────────

async function submitWorkerApplication(input: WorkerApplicationInput & { cvFileUrl: string }) {
  const normalizedEmail = input.email.toLowerCase().trim();

  // Prevent duplicate applications (active or under review)
  const [existingUser, existingApplication] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    prisma.workerApplication.findFirst({
      where: {
        email: normalizedEmail,
        status: { notIn: [ApplicationStatus.REJECTED] }
      },
      select: { id: true, status: true }
    })
  ]);

  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  if (existingApplication) {
    throw new ApiError(409, 'An application with this email is already under review');
  }

  try {
    const application = await prisma.workerApplication.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizedEmail,
        phone: input.phone,
        cvFileUrl: input.cvFileUrl
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true
      }
    });

    return application;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, 'An application with this email is already under review');
    }
    throw error;
  }
}

export const publicService = {
  listPackages,
  getPackageBySlug,
  listServices,
  submitBooking,
  submitWorkerApplication
};
