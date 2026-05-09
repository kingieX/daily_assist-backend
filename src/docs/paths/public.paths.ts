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

  '/public/consultations': {
    post: {
      tags: ['Public — Intake'],
      summary: 'Submit consultation/contact request',
      description: 'Submits the public contact form and sends a consultation enquiry email. No booking record is created.',
      parameters: [
        {
          name: 'x-captcha-token',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: 'Captcha token from the frontend widget (required when CAPTCHA_SECRET is configured).'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ConsultationRequest' }
          }
        }
      },
      responses: {
        '201': {
          description: 'Consultation request submitted successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/ConsultationConfirmation' } } }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/public/bookings': {
    post: {
      tags: ['Public — Intake'],
      summary: 'Submit package booking request',
      description: 'Submits the package booking form and creates client + booking + booking services records.',
      parameters: [
        {
          name: 'x-captcha-token',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: 'Captcha token from the frontend widget (required when CAPTCHA_SECRET is configured).'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PublicBookingRequest' }
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
                  { type: 'object', properties: { data: { $ref: '#/components/schemas/PublicBookingConfirmation' } } }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
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
        '**Captcha:**',
        '- Provide captcha token via `x-captcha-token` header (or `captchaToken` multipart field)',
        '',
        '**CV upload requirements:**',
        '- Field name: `cv`',
        '- Allowed types: PDF, DOC, DOCX',
        '- Maximum size: 5MB',
        '',
        '**Duplicate prevention:**',
        '- Rejected if an active/pending application exists for the same email',
        '- Rejected if the email is already registered as a user account',
        '',
        '**Rate limited:** 10 requests per IP per hour.'
      ].join('\n'),
      parameters: [
        {
          name: 'x-captcha-token',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: 'Captcha token from the frontend widget (required when CAPTCHA_SECRET is configured).'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { $ref: '#/components/schemas/WorkerApplicationRequest' },
            encoding: {
              cv: {
                contentType:
                  'application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              }
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
