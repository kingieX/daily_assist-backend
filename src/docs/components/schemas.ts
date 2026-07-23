import type { OpenAPIV3 } from 'openapi-types';

type SchemasMap = NonNullable<OpenAPIV3.ComponentsObject['schemas']>;

export const schemas: SchemasMap = {
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'admin@dailyassist.local'
      },
      password: {
        type: 'string',
        minLength: 8,
        example: 'Admin@12345'
      }
    }
  },

  RefreshRequest: {
    type: 'object',
    properties: {
      refreshToken: {
        type: 'string',
        description:
          'Refresh token JWT. Can alternatively be delivered via the httpOnly `refreshToken` cookie set on login.'
      }
    }
  },

  AuthUser: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'admin@dailyassist.local'
      },
      role: {
        type: 'string',
        enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
        example: 'ADMIN'
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
        example: 'ACTIVE'
      }
    }
  },

  TokenPayloadUser: {
    type: 'object',
    description: 'Minimal user identity decoded from the JWT access token.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      role: {
        type: 'string',
        enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF']
      }
    }
  },

  TokenSession: {
    type: 'object',
    properties: {
      accessToken: {
        type: 'string',
        description: 'Short-lived JWT access token (15 min). Include in Authorization: Bearer <token> header.'
      },
      refreshToken: {
        type: 'string',
        description:
          'Long-lived JWT refresh token (7 days). Also set as httpOnly cookie. Use /auth/refresh to rotate.'
      },
      user: { $ref: '#/components/schemas/AuthUser' }
    }
  },

  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operation successful' },
      data: {
        description: 'Response payload — structure varies by endpoint.'
      }
    }
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'A description of what went wrong' },
      code: {
        type: 'string',
        example: 'VALIDATION_ERROR',
        description: 'Machine-readable error code. Present on specific error types.'
      },
      errors: {
        description: 'Detailed error info (e.g. Zod validation issues). Present on validation failures.'
      }
    }
  },


  JobPost: {
    type: 'object',
    required: ['id', 'title', 'reportTo', 'payRate', 'contractTypes', 'hours', 'location', 'overview', 'responsibilities', 'exclusions', 'benefits', 'requirements', 'desirable', 'standards'],
    description: 'Admin-managed job post. overview is the canonical role description; legacy description must not be written. Legacy contractType is deprecated and normalized to this contractTypes array on read.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string', description: 'Role Name.' },
      reportTo: { type: 'string', default: '' },
      payRate: { type: 'string', default: '', example: '£13.00 per hour' },
      contractTypes: {
        type: 'array',
        description: 'Multiple values may be selected. Defaults to [] when empty; never null. Replaces deprecated single-value contractType.',
        items: { type: 'string', enum: ['Full-Time Contract', 'Part-Time Contract', 'Zero-Hour Contract', 'Freelance / Remote Contract', 'Fixed-Term Contract'] },
        default: []
      },
      hours: { type: 'string', default: '' },
      location: { type: 'string', default: '' },
      overview: { type: 'string', default: '', description: 'Canonical role overview/description. Do not write legacy description.' },
      responsibilities: { type: 'array', items: { type: 'string' }, default: [], description: 'Defaults to [] when empty; never null.' },
      exclusions: { type: 'array', items: { type: 'string' }, default: [], description: 'Defaults to [] when empty; never null.' },
      benefits: { type: 'array', items: { type: 'string' }, default: [], description: 'Defaults to [] when empty; never null.' },
      requirements: { type: 'array', items: { type: 'string' }, default: [], description: 'Defaults to [] when empty; never null.' },
      desirable: { type: 'array', items: { type: 'string' }, default: [], description: 'Defaults to [] when empty; never null.' },
      standards: { type: 'array', items: { type: 'string' }, default: [], description: 'Defaults to [] when empty; never null.' }
    }
  },

  JobPostRequest: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      reportTo: { type: 'string' },
      payRate: { type: 'string' },
      contractTypes: { type: 'array', items: { type: 'string', enum: ['Full-Time Contract', 'Part-Time Contract', 'Zero-Hour Contract', 'Freelance / Remote Contract', 'Fixed-Term Contract'] }, default: [] },
      hours: { type: 'string' },
      location: { type: 'string' },
      overview: { type: 'string', description: 'Canonical role description field.' },
      responsibilities: { type: 'array', items: { type: 'string' }, default: [] },
      exclusions: { type: 'array', items: { type: 'string' }, default: [] },
      benefits: { type: 'array', items: { type: 'string' }, default: [] },
      requirements: { type: 'array', items: { type: 'string' }, default: [] },
      desirable: { type: 'array', items: { type: 'string' }, default: [] },
      standards: { type: 'array', items: { type: 'string' }, default: [] }
    }
  },


  VisitStatus: { type: 'string', enum: ['Assigned', 'late', 'not-started', 'completed', 'in-progress'], description: 'Frontend visit/task status enum; separate from booking status.' },
  Visit: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' }, clientTitle: { type: 'string', enum: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'] }, clientName: { type: 'string' }, clientId: { type: 'string', nullable: true, description: 'References Client when linked; nullable for free-text admin-created visits.' }, address: { type: 'string' }, date: { type: 'string', format: 'date' }, startTime: { type: 'string' }, endTime: { type: 'string' }, staffId: { type: 'string', format: 'uuid', description: 'References Staff/User returned by GET /admin/staff.' }, staffName: { type: 'string' }, package: { type: 'string', enum: ['Basic Package', 'Standard Package', 'Premium Package'] }, selectedServiceTypes: { type: 'array', items: { type: 'string' } }, selectedAdditional: { type: 'array', items: { type: 'string' } }, note: { type: 'string' }, status: { $ref: '#/components/schemas/VisitStatus' }, time: { type: 'string', readOnly: true, description: 'Derived display range from startTime/endTime; not written by clients.' }
    }
  },
  StaffVisitSummary: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, status: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, photo: { type: 'string', nullable: true }, tasksDone: { type: 'integer' }, tasksTotal: { type: 'integer' } } },
  StaffTask: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, client: { type: 'string' }, status: { $ref: '#/components/schemas/VisitStatus' }, address: { type: 'string' }, serviceType: { type: 'string' }, time: { type: 'string' }, notes: { type: 'string' } } },
  StaffWithTasks: { allOf: [{ $ref: '#/components/schemas/StaffVisitSummary' }, { type: 'object', properties: { role: { type: 'string' }, ownsCar: { type: 'boolean' }, trainingUpToDate: { type: 'boolean', description: 'Defaults false until a training data source is added.' }, milesCovered: { type: 'string', description: 'Defaults to 0 miles until mileage tracking is added.' }, tasks: { type: 'array', items: { $ref: '#/components/schemas/StaffTask' } } } }] },

  // ── Phase 2: Auth ─────────────────────────────────────────────────────────────

  ForgotPasswordRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@dailyassist.local' }
    }
  },

  ResetPasswordRequest: {
    type: 'object',
    required: ['token', 'newPassword'],
    properties: {
      token: { type: 'string', description: 'Raw reset token received via email link' },
      newPassword: {
        type: 'string',
        minLength: 8,
        description: 'Min 8 chars, must include uppercase letter and number',
        example: 'NewPass1'
      }
    }
  },

  // ── Phase 2: Catalog ─────────────────────────────────────────────────────────

  ServiceSummary: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Personal Care' },
      slug: { type: 'string', example: 'personal-care' },
      category: { type: 'string', example: 'Care' },
      description: { type: 'string' },
      isAdditional: { type: 'boolean', example: false }
    }
  },

  Package: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Standard Care' },
      slug: { type: 'string', example: 'standard' },
      description: { type: 'string' },
      priceMin: { type: 'number', example: 90 },
      priceMax: { type: 'number', example: 130 },
      price: { type: 'string', example: '£25' },
      duration: { type: 'string', example: 'per hour' },
      icon: { type: 'string', enum: ['clock', 'home', 'heart', 'star', 'shield', 'users', 'zap'], example: 'heart' },
      tagline: { type: 'string', example: 'Flexible support for everyday needs.' },
      features: { type: 'array', items: { type: 'string' }, maxItems: 10, example: ['Daily welfare check-in', 'Medication reminders'] },
      additionalCharge: { type: 'string', example: 'Transport mileage: 45p/mile' },
      highlighted: { type: 'boolean', example: false },
      isActive: { type: 'boolean', example: true },
      displayOrder: { type: 'integer', example: 2 },
      packageServices: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            service: { $ref: '#/components/schemas/ServiceSummary' }
          }
        }
      }
    }
  },



  AdminPackageRequest: {
    type: 'object',
    required: ['icon', 'name', 'price', 'duration', 'tagline'],
    properties: {
      icon: { type: 'string', enum: ['Clock', 'Home', 'Heart', 'Star', 'Shield', 'Users', 'Zap', 'clock', 'home', 'heart', 'star', 'shield', 'users', 'zap'], example: 'Heart' },
      name: { type: 'string', example: 'Welfare Check-In Account' },
      price: { type: 'string', example: '£25' },
      duration: { type: 'string', enum: ['per hour', 'per week', 'per month', 'per visit'], example: 'per hour' },
      tagline: { type: 'string', example: 'Friendly check-ins and practical support for independent living.' },
      features: { type: 'array', items: { type: 'string' }, maxItems: 10, example: ['Daily welfare check-in', 'Medication reminders'] },
      additionalCharge: { type: 'string', example: 'Transport mileage: 45p/mile' },
      highlighted: { type: 'boolean', example: false },
      isActive: { type: 'boolean', example: true },
      displayOrder: { type: 'integer', minimum: 0, example: 1 }
    }
  },



  BookingListItem: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'contacted', 'assigned', 'completed', 'cancelled'] },
      clientName: { type: 'string' },
      serviceRequest: { type: 'string' },
      phone: { type: 'string' },
      address: { type: 'string' },
      date: { type: 'string', format: 'date' }
    }
  },

  Booking: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'contacted', 'assigned', 'completed', 'cancelled'] },
      clientName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      address: { type: 'string' },
      date: { type: 'string', format: 'date' },
      emergencyContact: { type: 'object' },
      service: { type: 'object' },
      selectedServiceTypes: { type: 'array', items: { type: 'string', enum: ['Home-Help (cleaning, tidying, laundry)', 'Errands & Shopping Support', 'Welfare Check-Ins & Companionship', 'Appointment Escort/Transport', 'Light Gardening & Practical Tasks', 'Community Access Support', 'Light Meal Preparation'] } },
      selectedAdditional: { type: 'array', items: { type: 'string', enum: ['One-off Deep Clean', 'End of Tenancy Cleaning', 'Building Construction Cleaning'] } },
      preferredDays: { type: 'array', items: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] } },
      preferredTime: { type: 'string', enum: ['8:00 Am', '9:00 Am', '10:00 Am', '11:00 Am', '12:00 Pm', '1:00 Pm', '2:00 Pm', '3:00 Pm', '4:00 Pm', '5:00 Pm', '6:00 Pm'] },
      preferredStartDate: { type: 'string' },
      assignedStaffId: { type: 'string', nullable: true },
      assignedStaffName: { type: 'string', nullable: true },
      pricingAdjustment: { type: 'number', nullable: true },
      mileageFee: { type: 'number', nullable: true }
    }
  },

  // ── Phase 2: Consultation + Public Booking ─────────────────────────────────────

  ConsultationRequest: {
    type: 'object',
    required: ['fullName', 'email', 'phoneNumber', 'subject', 'message'],
    properties: {
      fullName: { type: 'string', example: 'Jane Doe' },
      email: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
      phoneNumber: { type: 'string', example: '+1 555 000 1234' },
      subject: { type: 'string', example: 'Help needed for elderly parent' },
      message: {
        type: 'string',
        example: 'I would like to discuss home support options and next available dates.'
      }
    }
  },

  ConsultationConfirmation: {
    type: 'object',
    properties: {
      submittedAt: { type: 'string', format: 'date-time' }
    }
  },

  PublicBookingRequest: {
    type: "object",
    required: [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "address",
      "city",
      "postcode",
      "preferredDays",
      "preferredTime",
      "startDate",
      "agreeToTerms"
    ],
    properties: {
      firstName: { type: "string", example: "Jane" },
      lastName: { type: "string", example: "Doe" },
      email: { type: "string", format: "email", example: "jane.doe@example.com" },
      phoneNumber: { type: "string", example: "+44 1268 904 508" },
      address: { type: "string", example: "123 Church Street" },
      city: { type: "string", example: "Canvey Island" },
      zipcode: { type: "string", example: "SS8 0XY", description: "Accepted for backward compatibility. `postcode` is preferred for the public booking form." },
      postcode: { type: "string", example: "SS8 0XY" },
      packageId: { type: "string", format: "uuid", description: "Optional package UUID when the frontend has one." },
      packageSlug: { type: "string", example: "welfare-check-in-account", description: "Optional package/page slug when no package UUID is available." },
      packageName: { type: "string", example: "Welfare Check-In Account", description: "Optional package display name for snapshotting the page/form selected." },
      preferredDays: {
        type: "array",
        description: "Accepts uppercase enum values or frontend labels such as `Monday`.",
        items: { type: "string", enum: ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] }
      },
      preferredTime: { type: "string", example: "morning", description: "Accepts the frontend values such as `morning`, `afternoon`, or `evening`." },
      startDate: { type: "string", format: "date", example: "2026-07-01" },
      specialMessage: { type: "string", example: "Please let us know about any specific needs." },
      selectedServiceIds: { type: "array", items: { type: "string", format: "uuid" }, description: "Optional service UUIDs when loaded from the API catalog." },
      additionalServiceIds: { type: "array", items: { type: "string", format: "uuid" }, description: "Optional additional-service UUIDs when loaded from the API catalog." },
      selectedServices: { type: "array", items: { type: "string" }, example: ["Companionship", "Medication reminders"], description: "Frontend service labels are accepted when IDs are not available." },
      additionalServices: { type: "array", items: { type: "string" }, example: ["Shopping support"], description: "Frontend additional-service labels are accepted when IDs are not available." },
      emergencyContactName: { type: "string" },
      emergencyContactPhone: { type: "string" },
      emergencyContactRelationship: { type: "string" },
      agreeToTerms: { type: "boolean", enum: [true] },
      consentToDailyassist: { type: "boolean", enum: [true], description: "Required unless `consentToDataProcessing` is sent as true." },
      consentToDataProcessing: { type: "boolean", enum: [true], description: "Alias matching the frontend data-processing consent checkbox." }
    }
  },

  PublicBookingConfirmation: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["pending","contacted","assigned","completed","cancelled"] },
      createdAt: { type: "string", format: "date-time" }
    }
  },

  // ── Phase 2: Worker Application ───────────────────────────────────────────────

  WorkerApplicationRequest: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'phone', 'role'],
    properties: {
      firstName: { type: 'string', example: 'Alice' },
      lastName: { type: 'string', example: 'Smith' },
      email: { type: 'string', format: 'email', example: 'alice.smith@example.com' },
      phone: { type: 'string', example: '+1 555 123 4567' },
      role: { type: 'string', example: 'Home-Help & Support Assistant Role', description: 'Stored exactly as submitted; admin recruitment reads this value.' },
      cv: {
        type: 'string',
        format: 'binary',
        description: 'Optional upload CV file (PDF, DOC, or DOCX), max size 5MB.'
      }
    }
  },

  WorkerApplicationConfirmation: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string' },
      number: { type: 'integer' },
      staffId: { type: 'string' },
      status: { type: 'string', enum: ['PENDING'], example: 'PENDING' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  }
,
  CV: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      date: { type: 'string' },
      size: { type: 'string' },
      url: { type: 'string' }
    }
  },

  StaffProfile: {
    type: 'object',
    properties: {
      name: { type: 'string' }, initials: { type: 'string' }, role: { type: 'string' }, email: { type: 'string', format: 'email' },
      gender: { type: 'string' }, phone: { type: 'string' }, dob: { type: 'string', format: 'date' }, staffId: { type: 'string' },
      zone: { type: 'string' }, accountStatus: { type: 'string' }, lastLoginAt: { type: 'string', format: 'date-time' }
    }
  },
  AdminProfile: {
    type: 'object',
    properties: { id: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string' }, photoUrl: { type: 'string', nullable: true } }
  },
  NotificationSetting: {
    type: 'object',
    properties: { key: { type: 'string', enum: ['bookingRequest','staffCheckin','staffCheckout','missedCheckin','missedCheckout'] }, label: { type: 'string' }, sub: { type: 'string' }, enabled: { type: 'boolean' } }
  },
  SystemLogEntry: {
    type: 'object',
    properties: { id: { type: 'string' }, time: { type: 'string', format: 'date-time' }, user: { type: 'string' }, action: { type: 'string' }, module: { type: 'string' }, affectedItem: { type: 'string' }, description: { type: 'string' }, ipAddress: { type: 'string' }, status: { type: 'string', enum: ['Success','Warning','Failed','Cancelled'] } }
  },

  Application: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      number: { type: 'integer' },
      role: { type: 'string', example: 'Home-Help & Support Assistant Role' },
      name: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      staffId: { type: 'string', description: 'Pre-assigned staff ID; editable during conversion.' },
      cv: { $ref: '#/components/schemas/CV', nullable: true }
    }
  }

};
