import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';

import { env } from './env.js';

const routesGlob =
  env.NODE_ENV === 'production'
    ? path.join(
        process.cwd(),
        'dist',
        'modules',
        '**',
        '*.routes.js',
      )
    : path.join(
        process.cwd(),
        'src',
        'modules',
        '**',
        '*.routes.ts',
      );

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',

    info: {
      title: 'ViralForge AI API',
      version: '1.0.0',
      description:
        'Trend Intelligence SaaS — REST API',
      contact: {
        name: 'ViralForge AI',
        url: 'https://viralforge.ai',
      },
    },

    servers: [
      {
        url: env.API_URL,
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },

      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                },
                message: {
                  type: 'string',
                },
                details: {},
                requestId: {
                  type: 'string',
                },
              },
            },
          },
        },

        TrendRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            url: {
              type: 'string',
              nullable: true,
            },
            source: {
              $ref: '#/components/schemas/Source',
            },
            metrics: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TrendMetric',
              },
            },
            collectedAt: {
              type: 'string',
              format: 'date-time',
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },

        TrendMetric: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            volume: {
              type: 'integer',
            },
            growthPct: {
              type: 'integer',
            },
            declinePct: {
              type: 'integer',
            },
            competitionScore: {
              type: 'number',
            },
            opportunityScore: {
              type: 'number',
            },
            seasonalityScore: {
              type: 'number',
            },
            lifetimeDays: {
              type: 'integer',
            },
            popularity: {
              type: 'integer',
            },
            timeSeries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                  },
                  value: {
                    type: 'integer',
                  },
                },
              },
            },
            snapshotDate: {
              type: 'string',
              format: 'date',
            },
          },
        },

        Source: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            slug: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: [
                'GOOGLE_TRENDS',
                'YOUTUBE',
                'REDDIT',
                'TIKTOK',
                'GOOGLE_NEWS',
                'RSS',
                'HACKERNEWS',
              ],
            },
            baseUrl: {
              type: 'string',
              nullable: true,
            },
            active: {
              type: 'boolean',
            },
          },
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: [routesGlob],
});
