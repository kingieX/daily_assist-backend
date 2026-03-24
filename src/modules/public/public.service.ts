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

function parseIsoDateToUtcDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

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
    let packageServiceIds: string[] = [];

    if (input.packageId) {
      const pkg = await tx.package.findUnique({
        where: { id: input.packageId },
        select: {
          id: true,
          name: true,
          slug: true,
          priceMin: true,
          priceMax: true,
          packageServices: { select: { serviceId: true } }
        }
      });

      if (!pkg) {
        throw new ApiError(404, `Package not found: ${input.packageId}`);
      }

      packageServiceIds = pkg.packageServices.map((row) => row.serviceId);
      selectedPlanSnapshot = {
        id: pkg.id,
        name: pkg.name,
        slug: pkg.slug,
        priceMin: pkg.priceMin,
        priceMax: pkg.priceMax
      } as Prisma.InputJsonObject;
    }

    const selectedServiceIds = Array.from(new Set(input.selectedServiceIds ?? []));
    const additionalServiceIds = Array.from(new Set(input.additionalServiceIds ?? []));
    const resolvedSelectedServiceIds =
      selectedServiceIds.length > 0 ? selectedServiceIds : packageServiceIds;

    const overlappingIds = resolvedSelectedServiceIds.filter((serviceId) =>
      additionalServiceIds.includes(serviceId)
    );
    if (overlappingIds.length > 0) {
      throw new ApiError(
        400,
        `Service IDs cannot be both selected and additional: ${overlappingIds.join(', ')}`
      );
    }

    if (input.packageId && resolvedSelectedServiceIds.length > 0) {
      const packageServiceIdSet = new Set(packageServiceIds);
      const outsidePackage = resolvedSelectedServiceIds.filter(
        (serviceId) => !packageServiceIdSet.has(serviceId)
      );

      if (outsidePackage.length > 0) {
        throw new ApiError(
          400,
          `Selected services must belong to the selected package: ${outsidePackage.join(', ')}`
        );
      }
    }

    const requestedServiceIds = Array.from(
      new Set([...resolvedSelectedServiceIds, ...additionalServiceIds])
    );

    let serviceMap = new Map<string, { name: string; isAdditional: boolean }>();
    if (requestedServiceIds.length > 0) {
      const services = await tx.service.findMany({
        where: { id: { in: requestedServiceIds }, isActive: true },
        select: { id: true, name: true, isAdditional: true }
      });

      serviceMap = new Map(
        services.map((service) => [
          service.id,
          { name: service.name, isAdditional: service.isAdditional }
        ])
      );

      const missingOrInactive = requestedServiceIds.filter((serviceId) => !serviceMap.has(serviceId));
      if (missingOrInactive.length > 0) {
        throw new ApiError(
          400,
          `Invalid or inactive service IDs: ${missingOrInactive.join(', ')}`
        );
      }

      const invalidAdditional = additionalServiceIds.filter((serviceId) => {
        const service = serviceMap.get(serviceId);
        return !service?.isAdditional;
      });

      if (invalidAdditional.length > 0) {
        throw new ApiError(
          400,
          `Additional service IDs must reference add-on services: ${invalidAdditional.join(', ')}`
        );
      }
    }

    // 3. Create the booking
    const booking = await tx.booking.create({
      data: {
        clientId: client.id,
        packageId: input.packageId ?? null,
        selectedPlanSnapshot,
        preferredDate: input.preferredDate ? parseIsoDateToUtcDate(input.preferredDate) : null,
        preferredTime: input.preferredTime ?? null,
        startDate: input.startDate ? parseIsoDateToUtcDate(input.startDate) : null,
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

    for (const serviceId of resolvedSelectedServiceIds) {
      const service = serviceMap.get(serviceId);
      if (!service) continue;
      bookingServiceData.push({
        bookingId: booking.id,
        serviceId,
        serviceNameSnapshot: service.name,
        serviceType: ServiceType.SELECTED
      });
    }

    for (const serviceId of additionalServiceIds) {
      const service = serviceMap.get(serviceId);
      if (!service) continue;
      bookingServiceData.push({
        bookingId: booking.id,
        serviceId,
        serviceNameSnapshot: service.name,
        serviceType: ServiceType.ADDITIONAL
      });
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
