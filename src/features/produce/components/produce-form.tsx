"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CropSelector } from "@/features/catalog/components/catalog-selectors";
import { districts, type FarmerProfile } from "@/features/farmer-profile/schema";
import { LocationPicker } from "@/features/farmer-profile/components/location-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import Loader from "@/components/Loader";
import { saveProduce } from "../api";
import { produceDefaults, produceFormSchema, statusLabels, statuses, toSriLankaInput, type ProduceBatch, type ProduceFormValues } from "../schema";

function Field({ name, label, error, children, hint }: { name: string; label: string; error?: string; children: ReactNode; hint?: string }) {
  return <div className="min-w-0 space-y-2"><Label htmlFor={name}>{label}</Label>{children}{hint && <p id={`${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>}{error && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}

export function ProduceForm({ initialBatch, profile, mapToken }: { initialBatch: ProduceBatch | null; profile: FarmerProfile; mapToken: string }) {
  const router = useRouter(); const queries = useQueryClient(); const [saveError, setSaveError] = useState("");
  const { register, control, handleSubmit, reset, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<ProduceFormValues>({
    resolver: zodResolver(produceFormSchema), defaultValues: produceDefaults(initialBatch, profile),
  });
  const [latitude, longitude] = useWatch({ control, name: ["latitude", "longitude"] });
  const back = initialBatch ? `/produce/${initialBatch.id}` : "/produce";
  function a11y(name: keyof ProduceFormValues) {
    return { id: name, "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `${name}-error` : undefined };
  }
  async function save(values: ProduceFormValues) {
    setSaveError("");
    try {
      const batch = await saveProduce(values, initialBatch?.id, initialBatch ? produceDefaults(initialBatch, profile) : undefined);
      reset(produceDefaults(batch, profile));
      await queries.invalidateQueries({ queryKey: ["produce"] });
      toast.success(initialBatch ? "Produce batch updated." : "Produce batch added.");
      router.push(`/produce/${batch.id}`); router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Your produce batch could not be saved. Please try again.";
      setSaveError(message); toast.error(message);
    }
  }
  function selectField(name: "district" | "status", options: { value: string; label: string }[]) {
    return <Controller control={control} name={name} render={({ field }) => <Select name={name} value={field.value} onValueChange={(value) => field.onChange(value ?? "")} disabled={isSubmitting} items={options}>
      <SelectTrigger {...a11y(name)} ref={field.ref} onBlur={field.onBlur}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>} />;
  }
  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href={back} className="text-sm underline underline-offset-4">Back to {initialBatch ? "batch" : "produce"}</Link>
    <header className="space-y-2"><h1 className="text-2xl font-semibold">{initialBatch ? "Edit produce" : "Add produce"}</h1><p className="text-sm text-muted-foreground">Fields marked * are required. Dates and times use Sri Lanka time (UTC+05:30).</p></header>
    <form noValidate onSubmit={handleSubmit(save, () => toast.error("Check the highlighted fields and try again."))} className="space-y-6">
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-6"><legend className="sr-only">Produce batch details</legend>
        <Card><CardHeader><CardTitle>Harvest details</CardTitle></CardHeader><CardContent className="space-y-5">
          <Controller control={control} name="crop_id" render={({ field }) => <CropSelector id="crop_id" name={field.name} label="Crop" value={field.value || null} onValueChange={(value) => field.onChange(value ?? "")} disabled={isSubmitting} error={errors.crop_id?.message} required />} />
          {initialBatch && !initialBatch.crop.active && <p className="text-sm text-muted-foreground">This crop is inactive in the catalog. You can keep it for this existing batch or choose an active crop.</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="quantity_kg" label="Quantity in kg *" error={errors.quantity_kg?.message} hint="Above 0, up to 1,000,000 kg; at most 3 decimal places."><Input {...register("quantity_kg")} {...a11y("quantity_kg")} type="number" inputMode="decimal" step="0.001" min="0.001" max="1000000" required /></Field>
            <Field name="quality" label="Grade or quality (optional)" error={errors.quality?.message} hint="Your description; no certification is implied."><Input {...register("quality")} {...a11y("quality")} maxLength={80} /></Field>
            <Field name="harvested_at" label="Harvest date and time *" error={errors.harvested_at?.message}>
              <Input {...register("harvested_at")} {...a11y("harvested_at")} type="datetime-local" required />
              <Button type="button" variant="ghost" size="sm" onClick={() => setValue("harvested_at", toSriLankaInput(new Date().toISOString()), { shouldDirty: true, shouldValidate: true })}>Use current time</Button>
            </Field>
            <Field name="sell_by" label="Latest acceptable sale date and time *" error={errors.sell_by?.message} hint="After harvest; available and reserved batches need a future deadline."><Input {...register("sell_by")} {...a11y("sell_by")} type="datetime-local" required /></Field>
            <Field name="status" label="Status *" error={errors.status?.message}>{selectField("status", statuses.filter((status) => status !== "archived").map((value) => ({ value, label: statusLabels[value] })))}</Field>
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Source location</CardTitle><CardDescription>Starts with your saved farmer location. A district and town are enough; the pin is optional.</CardDescription></CardHeader><CardContent className="space-y-5">
          <Button type="button" variant="outline" onClick={() => {
            for (const name of ["district", "town"] as const) setValue(name, profile[name], { shouldDirty: true, shouldValidate: true });
            for (const name of ["latitude", "longitude"] as const) setValue(name, profile[name]?.toString() ?? "", { shouldDirty: true, shouldValidate: true });
          }}>Use farmer profile location</Button>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="district" label="Source district *" error={errors.district?.message}>{selectField("district", districts.map((value) => ({ value, label: value })))}</Field>
            <Field name="town" label="Source town or village *" error={errors.town?.message}><Input {...register("town")} {...a11y("town")} autoComplete="address-level2" required maxLength={120} /></Field>
          </div>
          <LocationPicker token={mapToken} latitude={latitude} longitude={longitude} disabled={isSubmitting} onChange={(location) => {
            setValue("latitude", location?.latitude.toFixed(3) ?? "", { shouldDirty: true, shouldValidate: true });
            setValue("longitude", location?.longitude.toFixed(3) ?? "", { shouldDirty: true, shouldValidate: true });
          }} />
          {(errors.latitude || errors.longitude) && <p role="alert" className="text-sm text-destructive">Choose a valid map location or remove the pin.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><Field name="notes" label="Batch notes (optional)" error={errors.notes?.message}><Textarea {...register("notes")} {...a11y("notes")} maxLength={2000} rows={4} /></Field></CardContent></Card>
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={isSubmitting || (!!initialBatch && !isDirty)} aria-busy={isSubmitting}>{isSubmitting && <Loader size={16} label="Saving produce" />}{isSubmitting ? "Saving…" : initialBatch ? "Save changes" : "Add produce batch"}</Button><Button asChild variant="outline"><Link href={back}>Cancel</Link></Button>{isDirty && <p className="self-center text-xs text-muted-foreground">You have unsaved changes.</p>}</div>
      </fieldset>
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
    </form>
  </div>;
}
