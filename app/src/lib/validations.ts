import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  passkey: z.string().min(1, "Passkey required"),
});

export const ledgerAddSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  subcategory: z.string().min(1, "Subcategory required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  location: z.string().min(1, "Location required"),
  sharedWithOrg: z.boolean().optional().default(false),
});

export const ledgerTakeSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const ledgerPatchSchema = z.object({
  sharedWithOrg: z.boolean(),
});
