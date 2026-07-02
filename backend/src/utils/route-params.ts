import { ValidationError } from "../errors";

export function getRouteParam(value: string | string[] | undefined, name = "parameter") {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (!resolved) {
    throw new ValidationError({}, `Missing route ${name}`);
  }
  return resolved;
}
