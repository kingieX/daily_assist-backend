import { ApplicationStatus, BookingStatus, ClientSource, Prisma, ServiceType } from '@prisma/client';
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

// ─── Bookings ─────────────────────────────────────────────────────────────────

async function submitBooking(input: CreateBookingInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Create client record from submitted info
    const client = await tx.client.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone,
        address: input.address ?? null,
        city: input.city ?? null,
        zipcode: input.zipcode ?? null,
        source: ClientSource.WEB_BOOKING
      }
    });

    // 2. If a packageId was provided, verify it exists and snapshot its details
    let selectedPlanSnapshot: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
    if (input.packageId) {
      const pkg = await tx.package.findUnique({
        where: { id: input.packageId },
        select: { id: true, name: true, slug: true, priceMin: true, priceMax: true }
      });
      if (!pkg) {
        throw new ApiError(404, `Package not found: ${input.packageId}`);
      }
      selectedPlanSnapshot = pkg as Prisma.InputJsonObject;
    }

    // 3. Create the booking
    const booking = await tx.booking.create({
      data: {
        clientId: client.id,
        packageId: input.packageId ?? null,
        selectedPlanSnapshot,
        preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
        preferredTime: input.preferredTime ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        specialMessage: input.specialMessage ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
        emergencyContactRelationship: input.emergencyContactRelationship ?? null,
        agreeToTerms: input.agreeToTerms,
        consentToDailyassist: input.consentToDailyassist,
        status: BookingStatus.REQUESTED
      }
    });

    // 4. Build booking service entries (snapshot service names at time of booking)
    const bookingServiceData: {
      bookingId: string;
      serviceId: string;
      serviceNameSnapshot: string;
      serviceType: ServiceType;
    }[] = [];

    const allRequestedIds = [
      ...(input.selectedServiceIds ?? []).map((id) => ({ id, type: ServiceType.SELECTED })),
      ...(input.additionalServiceIds ?? []).map((id) => ({ id, type: ServiceType.ADDITIONAL }))
    ];

    if (allRequestedIds.length > 0) {
      const ids = allRequestedIds.map((s) => s.id);
      const services = await tx.service.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, name: true }
      });

      const serviceMap = new Map(services.map((s) => [s.id, s.name]));

      for (const { id, type } of allRequestedIds) {
        const name = serviceMap.get(id);
        if (name) {
          bookingServiceData.push({
            bookingId: booking.id,
            serviceId: id,
            serviceNameSnapshot: name,
            serviceType: type
          });
        }
      }
    }

    if (bookingServiceData.length > 0) {
      await tx.bookingService.createMany({ data: bookingServiceData });
    }

    return {
      id: booking.id,
      status: booking.status,
      clientId: client.id,
      createdAt: booking.createdAt
    };
  });
}

// ─── Worker Applications ──────────────────────────────────────────────────────

async function submitWorkerApplication(input: WorkerApplicationInput) {
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

  const application = await prisma.workerApplication.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: input.phone,
      cvFileUrl: input.cvFileUrl ?? null
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
}

export const publicService = {
  listPackages,
  getPackageBySlug,
  listServices,
  submitBooking,
  submitWorkerApplication
};
