import type { OpenAPIV3 } from 'openapi-types';

export const publicPaths: OpenAPIV3.PathsObject = {
  '/public/packages': {
    get: {
      tags: ['Public — Catalog'],
      summary: 'List active packages',
      description: 'Returns all active service packages with their included services. No authentication required.',
      responses: {
        '200': {
          description: 'List of active packages',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Package' }
                      }
                    }
                  }
                ]
              },
              example: {
                success: true,
                message: 'Packages retrieved',
                data: [
                  {
                    id: 'uuid',
                    name: 'Basic Care',
                    slug: 'basic',
                    description: 'Foundational daily assistance.',
                    priceMin: 50,
                    priceMax: 80,
                    displayOrder: 1,
                    packageServices: [{ service: { id: 'uuid', name: 'Personal Care', slug: 'personal-care', category: 'Care', isAdditional: false } }]
                  }
                ]
              }
            }
          }
        }
      }
    }
  },

  '/public/packages/{slug}': {
    get: {
      tags: ['Public — Catalog'],
      summary: 'Get package by slug',
      description: 'Returns a single active package with its full list of included services.',
      parameters: [
        {
          name: 'slug',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: 'standard'
        }
      ],
      responses: {
        '200': {
          description: 'Package details',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Package' }
                    }
                  }
                ]
              }
            }
          }
        },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  '/public/services': {
    get: {
      tags: ['Public — Catalog'],
      summary: 'List active services',
      description:
        'Returns all active services ordered by category then name. ' +
        'Use `isAdditional: true` to identify add-ons that can be appended to any package booking.',
      responses: {
        '200': {
          description: 'List of active services',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ServiceSummary' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  },

  '/public/bookings': {
    post: {
      tags: ['Public — Intake'],
      summary: 'Submit booking request',
      description: [
        'Creates a new booking request from a prospective client. No authentication required.',
        '',
        '**What happens:**',
        '1. A new `Client` record is created from the submitted contact details',
        '2. A `Booking` is created with status `REQUESTED`',
        '3. Any specified service IDs are snapshotted as `BookingService` records',
        '4. Admin reviews and assigns the booking (Phase 3)',
        '',
        '**Rate limited:** 10 requests per IP per hour.'
      ].join('\n'),
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBookingRequest' },
            example: {
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane.doe@example.com',
              phone: '+1 555 000 1234',
              address: '42 Maple Street',
              city: 'Lagos',
              zipcode: '100001',
              packageId: null,
              preferredDate: '2026-04-15',
              preferredTime: '09:00',
              startDate: '2026-04-20',
              specialMessage: 'Client uses a walker.',
              emergencyContactName: 'Michael Doe',
              emergencyContactPhone: '+1 555 999 8888',
              emergencyContactRelationship: 'Son',
              selectedServiceIds: [],
              additionalServiceIds: [],
              agreeToTerms: true,
              consentToDailyassist: true
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Booking submitted successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/BookingConfirmation' }
                    }
                  }
                ]
              },
              example: {
                success: true,
                message: 'Booking request submitted successfully',
                data: {
                  id: 'a1b2c3d4-uuid',
                  status: 'REQUESTED',
                  clientId: 'e5f6-uuid',
                  createdAt: '2026-04-10T10:00:00.000Z'
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/public/worker-applications': {
    post: {
      tags: ['Public — Intake'],
      summary: 'Submit worker application',
      description: [
        'Submits a job application for a domestic assistance worker position. No authentication required.',
        '',
        '**Duplicate prevention:**',
        '- Rejected if an active/pending application exists for the same email',
        '- Rejected if the email is already registered as a user account',
        '',
        '**Rate limited:** 10 requests per IP per hour.'
      ].join('\n'),
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/WorkerApplicationRequest' },
            example: {
              firstName: 'Alice',
              lastName: 'Smith',
              email: 'alice.smith@example.com',
              phone: '+1 555 123 4567',
              cvFileUrl: 'https://drive.google.com/file/d/abc123/view'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Application submitted successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/WorkerApplicationConfirmation' }
                    }
                  }
                ]
              },
              example: {
                success: true,
                message: 'Application submitted successfully',
                data: {
                  id: 'uuid',
                  firstName: 'Alice',
                  lastName: 'Smith',
                  email: 'alice.smith@example.com',
                  status: 'PENDING',
                  createdAt: '2026-04-10T10:00:00.000Z'
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '409': {
          description: 'Duplicate email — application or account already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'An application with this email is already under review' }
            }
          }
        },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  }
};
