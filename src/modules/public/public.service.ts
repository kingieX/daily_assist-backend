import { ApplicationStatus, Prisma } from '@prisma/client';
import { sendBookingInquiryEmail } from '../../config/mailer';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import type { CreateConsultationInput, CreatePublicBookingInput, WorkerApplicationInput } from './public.validation';

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

async function submitConsultation(input: CreateConsultationInput) {
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

async function submitBooking(input: CreatePublicBookingInput) {
  const serviceIds = Array.from(new Set([...(input.selectedServiceIds ?? []), ...(input.additionalServiceIds ?? [])]));

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase().trim(),
        phone: input.phoneNumber,
        address: input.address,
        city: input.city,
        zipcode: input.zipcode,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        emergencyContactRelationship: input.emergencyContactRelationship
      }
    });

    const booking = await tx.booking.create({
      data: {
        clientId: client.id,
        packageId: input.packageId,
        selectedPlanSnapshot: { preferredDays: input.preferredDays },
        preferredTime: input.preferredTime,
        startDate: input.startDate,
        specialMessage: input.specialMessage,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        emergencyContactRelationship: input.emergencyContactRelationship,
        agreeToTerms: input.agreeToTerms,
        consentToDailyassist: input.consentToDailyassist
      },
      select: { id: true, status: true, createdAt: true }
    });

    if (serviceIds.length > 0) {
      const services = await tx.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } });
      if (services.length !== serviceIds.length) {
        throw new ApiError(400, "One or more selected services are invalid");
      }

      const selectedSet = new Set(input.selectedServiceIds ?? []);
      await tx.bookingService.createMany({
        data: services.map((s) => ({
          bookingId: booking.id,
          serviceId: s.id,
          serviceNameSnapshot: s.name,
          serviceType: selectedSet.has(s.id) ? "SELECTED" : "ADDITIONAL"
        }))
      });
    }

    return booking;
  });
}

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
  submitConsultation,
  submitBooking,
  submitWorkerApplication
};
