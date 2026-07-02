import { AsyncLocalStorage } from "node:async_hooks";
import type { SessionUser } from "../types/domain";

export type RequestContext = {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  user: SessionUser | null;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T) {
  return requestContext.run(context, callback);
}

export function getRequestContext() {
  return requestContext.getStore() ?? null;
}

export function getRequestUser() {
  return requestContext.getStore()?.user ?? null;
}

export function setRequestUser(user: SessionUser | null) {
  const context = requestContext.getStore();
  if (context) {
    context.user = user;
  }
}