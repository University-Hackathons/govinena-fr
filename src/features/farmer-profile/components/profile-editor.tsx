"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker } from "./location-picker";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/Loader";
import {
  districts, farmerFormSchema, farmerProfileSchema, formDefaults, toProfilePayload,
  type FarmerFormValues, type FarmerFormOutput, type FarmerProfile,
} from "../schema";

function ProfileField({ name, label, error, hint, children }: {
  name: string; label: string; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && <p id={`${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ProfileEditor({ initialProfile, onboarding = false, mapToken = "" }: {
  initialProfile: FarmerProfile | null; onboarding?: boolean; mapToken?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialProfile);
  const {
    register, control, handleSubmit, reset, setValue, clearErrors, setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FarmerFormValues, unknown, FarmerFormOutput>({
    resolver: zodResolver(farmerFormSchema), defaultValues: formDefaults(initialProfile),
  });

  const [latitude, longitude] = useWatch({ control, name: ["latitude", "longitude"] });

  function selectField(name: "district" | "transport_mode" | "preferred_language", options: { value: string; label: string }[], placeholder?: string) {
    return <Controller control={control} name={name} render={({ field }) => (
      <Select name={field.name} value={field.value || null} onValueChange={(value) => field.onChange(value ?? "")} disabled={isSubmitting} required items={options}>
        <SelectTrigger {...accessibility(name)} ref={field.ref} onBlur={field.onBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    )} />;
  }

  function accessibility(name: keyof FarmerFormValues) {
    return {
      id: name,
      "aria-invalid": !!errors[name],
      "aria-describedby": `${name}-hint${errors[name] ? ` ${name}-error` : ""}`,
    };
  }

  async function save(values: FarmerFormOutput) {
    try {
      const response = await fetch("/api/farmer/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toProfilePayload(values)),
      });
      if (response.status === 401) {
        toast.error("Your session expired. Sign in again to save your profile.", {
          action: { label: "Sign in", onClick: () => router.push("/login") },
        });
        return;
      }
      if (!response.ok) {
        if (response.status === 422) {
          const result = await response.json();
          for (const issue of result.error?.details ?? []) {
            const name = issue.location?.[1];
            if (typeof name === "string" && name in formDefaults(null)) {
              setError(name as keyof FarmerFormValues, { message: "Check this value and try again." });
            }
          }
          toast.error("Some profile details were rejected. Check your entries and try again.");
        } else if (response.status === 403) {
          toast.error("This profile update was not allowed. Reload the page and try again.");
        } else {
          toast.error("Your profile could not be saved. Please try again shortly.");
        }
        return;
      }
      const profile = farmerProfileSchema.parse(await response.json());
      setSaved(profile); reset(formDefaults(profile));
      toast.success("Your farmer profile has been saved.");
      if (onboarding) router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("We could not reach the profile service. Your changes are still here; please try again.");
    }
  }

  function invalidForm() {
    toast.error("Check the highlighted fields and try again.");
  }

  function skipOptional() {
    for (const name of ["contact_number", "latitude", "longitude", "vehicle_capacity_kg", "estimated_transport_rate", "preferred_market_ids"] as const) {
      setValue(name, "", { shouldDirty: true });
      clearErrors(name);
    }
    void handleSubmit(save, invalidForm)();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{onboarding ? "Set up your farmer profile" : "Farmer profile"}</h1>
        <p className="text-sm text-muted-foreground">Tell us about your location and transport preferences. Fields marked * are required. Precise GPS is never required.</p>
      </div>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Saved profile completion: {saved?.completion.percentage ?? 0}%</span>
            <Badge variant="outline">{saved ? "Required details complete" : "Profile not set up"}</Badge>
          </div>
          <progress className="h-2 w-full accent-primary" value={saved?.completion.percentage ?? 0} max={100} aria-label="Saved profile completion" />
          <p className="text-xs text-muted-foreground">{saved ? `${saved.completion.optional_completed} of ${saved.completion.optional_total} optional details added. Your core profile is ready; optional details can stay empty.` : "No farmer profile saved yet. Complete the required details below to get started."}{isDirty && " You have unsaved changes."}</p>
        </CardContent>
      </Card>
      <form onSubmit={handleSubmit(save, invalidForm)} noValidate className="space-y-6">
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
          <legend className="sr-only">Farmer profile details</legend>
          <Card>
            <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <ProfileField name="full_name" label="Full name *" error={errors.full_name?.message} hint="Your name as you would like it displayed.">
                <Input {...register("full_name")} {...accessibility("full_name")} autoComplete="name" required maxLength={120} />
              </ProfileField>
              <ProfileField name="contact_number" label="Contact number (optional)" error={errors.contact_number?.message} hint="Sri Lankan local or international +country format. This does not verify the number.">
                <Input {...register("contact_number")} {...accessibility("contact_number")} type="tel" autoComplete="tel" maxLength={40} />
              </ProfileField>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Farming location</CardTitle><CardDescription>A district and town are enough. Choose your current location or place a pin on the map if you wish.</CardDescription></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <ProfileField name="district" label="District *" error={errors.district?.message} hint="Select the district where you farm.">
                {selectField("district", districts.map((value) => ({ value, label: value })), "Select district")}
              </ProfileField>
              <ProfileField name="town" label="Town or village *" error={errors.town?.message} hint="Enter your nearest town or village; no street address is needed.">
                <Input {...register("town")} {...accessibility("town")} autoComplete="address-level2" required maxLength={120} />
              </ProfileField>
              <div className="space-y-2 sm:col-span-2">
                <LocationPicker token={mapToken} latitude={latitude} longitude={longitude} disabled={isSubmitting}
                  onChange={(location) => {
                    setValue("latitude", location?.latitude.toFixed(3) ?? "", { shouldDirty: true, shouldValidate: true });
                    setValue("longitude", location?.longitude.toFixed(3) ?? "", { shouldDirty: true, shouldValidate: true });
                  }} />
                {(errors.latitude || errors.longitude) && <p role="alert" className="text-sm text-destructive">Select a valid location on the map, or remove the location.</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Transport</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <ProfileField name="transport_mode" label="Default transport mode *" error={errors.transport_mode?.message} hint="Choose how you normally transport your harvest.">
                {selectField("transport_mode", [
                  { value: "other", label: "Other / not decided" }, { value: "own_vehicle", label: "Own vehicle" }, { value: "hired_vehicle", label: "Hired vehicle" },
                ])}
              </ProfileField>
              <ProfileField name="vehicle_capacity_kg" label="Vehicle capacity in kg (optional)" error={errors.vehicle_capacity_kg?.message} hint="Greater than 0, up to 1,000,000 kg; at most 2 decimal places.">
                <Input {...register("vehicle_capacity_kg")} {...accessibility("vehicle_capacity_kg")} type="number" inputMode="decimal" min={0.01} max={1000000} step="0.01" />
              </ProfileField>
              <ProfileField name="estimated_transport_rate" label="Estimated transport rate in LKR/km (optional)" error={errors.estimated_transport_rate?.message} hint="Your own estimate, from 0 to 1,000,000 LKR/km. This is not a quoted fare.">
                <Input {...register("estimated_transport_rate")} {...accessibility("estimated_transport_rate")} type="number" inputMode="decimal" min={0} max={1000000} step="0.01" />
              </ProfileField>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <ProfileField name="preferred_language" label="Preferred language *" error={errors.preferred_language?.message} hint="Saves your preference. The current interface remains in English.">
                {selectField("preferred_language", [
                  { value: "en", label: "English" }, { value: "si", label: "සිංහල (Sinhala)" }, { value: "ta", label: "தமிழ் (Tamil)" },
                ])}
              </ProfileField>
              <ProfileField name="preferred_market_ids" label="Preferred market IDs (optional)" error={errors.preferred_market_ids?.message} hint="No live market catalogue is connected yet. Leave empty, or enter known IDs separated by commas.">
                <Input {...register("preferred_market_ids")} {...accessibility("preferred_market_ids")} maxLength={1400} />
              </ProfileField>
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <Loader size={16} label="Saving profile" />}
              {isSubmitting ? "Saving…" : onboarding ? "Save and continue" : "Save profile"}
            </Button>
            {onboarding && <Button type="button" variant="outline" onClick={skipOptional} disabled={isSubmitting}>Skip optional fields</Button>}
            {!onboarding && <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset(formDefaults(saved))}>Discard changes</Button>}
          </div>
        </fieldset>
      </form>
    </div>
  );
}
