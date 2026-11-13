import { ApiError } from "@/lib/api-error";
import { produceSchema, type ProduceFormValues, producePayload, producePatchPayload } from "./schema";

export function produceError(status: number) {
  return status === 401 ? "Your session expired. Sign in again to continue."
    : status === 403 ? "This action was not allowed. Reload the page and try again."
    : status === 404 ? "This batch could not be found. Reload your produce list."
    : status === 409 ? "Complete your farmer profile first. Archived batches cannot be edited."
    : status === 422 ? "Check the crop, quantity, selling dates and location. New crop selections must still be active."
    : "The produce service is unavailable. Your changes have not been saved; please try again.";
}
export async function saveProduce(values: ProduceFormValues, id?: string, original?: ProduceFormValues) {
  const payload = id && original ? producePatchPayload(values, original) : producePayload(values);
  const method = id ? Object.keys(payload).length ? "PATCH" : "GET" : "POST";
  let response: Response;
  try { response = await fetch(`/api/produce${id ? `/${id}` : ""}`, { method, headers: { "Content-Type": "application/json" }, ...(method === "GET" ? {} : { body: JSON.stringify(payload) }) }); }
  catch { throw new ApiError("Could not reach the produce service. Your entries are still here; try again.", "network"); }
  if (!response.ok) throw new ApiError(produceError(response.status), "http", response.status);
  try { return produceSchema.parse(await response.json()); }
  catch { throw new ApiError("The save response could not be verified. Reload your produce list before trying again.", "unknown"); }
}
export async function archiveProduce(id: string) {
  let response: Response;
  try { response = await fetch(`/api/produce/${id}`, { method: "DELETE" }); }
  catch { throw new ApiError("Could not reach the produce service. Please try again.", "network"); }
  if (!response.ok) throw new ApiError(produceError(response.status), "http", response.status);
}
