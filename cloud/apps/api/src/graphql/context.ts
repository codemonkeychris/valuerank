import type { Request } from 'express';
import { createDataLoaders, type DataLoaders } from './dataloaders/index.js';

// GraphQL context type - passed to all resolvers
export interface Context {
  req: Request;
  log: Request['log'];
  loaders: DataLoaders;
}

// Create new context for each request (per-request DataLoader instances)
export function createContext(req: Request): Context {
  return {
    req,
    log: req.log,
    loaders: createDataLoaders(),
  };
}
