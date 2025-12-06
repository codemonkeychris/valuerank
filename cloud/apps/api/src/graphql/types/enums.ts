import { builder } from '../builder.js';

// RunStatus enum - mirrors Prisma RunStatus
// Registered with builder, not exported as value
builder.enumType('RunStatus', {
  values: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const,
  description: 'Status of a run execution',
});

// AnalysisStatus enum - mirrors Prisma AnalysisStatus
// Registered with builder, not exported as value
builder.enumType('AnalysisStatus', {
  values: ['CURRENT', 'SUPERSEDED'] as const,
  description: 'Status of an analysis result',
});
