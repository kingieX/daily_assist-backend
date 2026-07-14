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
  const selectedServiceIds = Array.from(new Set(input.selectedServiceIds ?? []));
  const additionalServiceIds = Array.from(new Set(input.additionalServiceIds ?? []));
  const serviceIds = Array.from(new Set([...selectedServiceIds, ...additionalServiceIds]));
  const selectedServiceNames = Array.from(new Set(input.selectedServices ?? []));
  const additionalServiceNames = Array.from(new Set(input.additionalServices ?? []));

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
        packageId: input.packageId ?? null,
        selectedPlanSnapshot: {
          preferredDays: input.preferredDays,
          packageSlug: input.packageSlug ?? null,
          packageName: input.packageName ?? null,
          serviceName: input.serviceName ?? input.packageName ?? null,
          servicePrice: input.servicePrice ?? null,
          serviceFrequency: input.serviceFrequency ?? null,
          visitsPerWeek: input.visitsPerWeek ?? null,
          transportMileage: input.transportMileage ?? null,
          selectedServices: selectedServiceNames,
          additionalServices: additionalServiceNames
        },
        preferredTime: input.preferredTime,
        startDate: input.startDate,
        specialMessage: input.specialMessage,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        emergencyContactRelationship: input.emergencyContactRelationship,
        agreeToTerms: input.agreeToTerms,
        consentToDailyassist: input.consentToDailyassist
      },
      include: { client: true, package: true, bookingServices: true, assignedStaff: { include: { staffProfile: true } } }
    });

    const bookingServicesData: Prisma.BookingServiceCreateManyInput[] = [];

    if (serviceIds.length > 0) {
      const services = await tx.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } });
      if (services.length !== serviceIds.length) {
        throw new ApiError(400, "One or more selected services are invalid");
      }

      const selectedSet = new Set(selectedServiceIds);
      bookingServicesData.push(
        ...services.map((s) => ({
          bookingId: booking.id,
          serviceId: s.id,
          serviceNameSnapshot: s.name,
          serviceType: selectedSet.has(s.id) ? "SELECTED" as const : "ADDITIONAL" as const
        }))
      );
    }

    bookingServicesData.push(
      ...selectedServiceNames.map((name) => ({
        bookingId: booking.id,
        serviceId: null,
        serviceNameSnapshot: name,
        serviceType: "SELECTED" as const
      })),
      ...additionalServiceNames.map((name) => ({
        bookingId: booking.id,
        serviceId: null,
        serviceNameSnapshot: name,
        serviceType: "ADDITIONAL" as const
      }))
    );

    if (bookingServicesData.length > 0) {
      await tx.bookingService.createMany({ data: bookingServicesData });
    }

    return {
      id: booking.id,
      status: 'pending',
      clientName: `${booking.client.firstName} ${booking.client.lastName}`.trim(),
      email: booking.client.email ?? '',
      phone: booking.client.phone,
      address: booking.client.address ?? '',
      date: booking.createdAt.toISOString().slice(0, 10),
      emergencyContact: { name: booking.emergencyContactName ?? '', phone: booking.emergencyContactPhone ?? '', relationship: booking.emergencyContactRelationship ?? '' },
      service: { name: (booking.selectedPlanSnapshot as any)?.serviceName ?? booking.package?.name ?? '', price: (booking.selectedPlanSnapshot as any)?.servicePrice ?? '', frequency: (booking.selectedPlanSnapshot as any)?.serviceFrequency ?? '', visitsPerWeek: (booking.selectedPlanSnapshot as any)?.visitsPerWeek ?? '', transportMileage: (booking.selectedPlanSnapshot as any)?.transportMileage ?? '' },
      selectedServiceTypes: selectedServiceNames,
      selectedAdditional: additionalServiceNames,
      preferredDays: input.preferredDays,
      preferredTime: input.preferredTime,
      preferredStartDate: booking.startDate?.toISOString().slice(0, 10) ?? '',
      assignedStaffId: null,
      assignedStaffName: null,
      pricingAdjustment: null,
      mileageFee: null
    };
  });
}


async function generateNextApplicantStaffCode(): Promise<string> {
  const [users, applications] = await Promise.all([
    prisma.user.findMany({ where: { staffCode: { not: null } }, select: { staffCode: true } }),
    (prisma.workerApplication as any).findMany({ where: { staffCode: { not: null } }, select: { staffCode: true } })
  ]);
  const used = new Set([...users, ...applications]
    .map((record: any) => record.staffCode)
    .filter((code: any): code is string => Boolean(code))
    .map((code: string) => Number(code.replace(/^DA/, '')))
    .filter((value: number) => Number.isFinite(value)));
  let next = 10;
  while (used.has(next)) next += 1;
  return `DA${String(next).padStart(4, '0')}`;
}

async function submitWorkerApplication(input: WorkerApplicationInput & { cvFileUrl?: string; cvFileName?: string; cvFileSize?: number }) {
  const normalizedEmail = input.email.toLowerCase().trim();

  // Prevent duplicate applications (active or under review)
  const [existingUser, existingApplication] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    (prisma.workerApplication as any).findFirst({
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
    const application = await (prisma.workerApplication as any).create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizedEmail,
        phone: input.phone,
        role: input.role,
        staffCode: await generateNextApplicantStaffCode(),
        cvFileUrl: input.cvFileUrl,
        cvFileName: input.cvFileName,
        cvFileSize: input.cvFileSize
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        staffCode: true,
        applicantNumber: true,
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
