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

export const ledgerRequestAddSchema = z.object({
  type: z.literal("add_to_org"),
  items: z.array(z.object({
    itemName: z.string().min(1),
    subcategory: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
    location: z.string().min(1),
  })).min(1),
});

export const ledgerRequestTakeSchema = z.object({
  type: z.literal("take_from_org"),
  items: z.array(z.object({
    ledgerEntryId: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
  })).min(1),
  description: z.string().optional(),
});

export const ledgerRequestSchema = z.discriminatedUnion("type", [
  ledgerRequestAddSchema,
  ledgerRequestTakeSchema,
]);

export const ledgerRejectSchema = z.object({
  reason: z.string().optional(),
});

export const ledgerDeclineSchema = z.object({
  reason: z.string().optional(),
});

// Members
const VALID_RANKS = ["none", "supreme_commander", "executive_commander", "captain", "non_commissioned_officer", "operator", "black_horizon_group_ally"] as const;
const VALID_ROLES = ["viewer", "admin", "logistics", "ops", "raffle", "guide"] as const;

export const memberPatchSchema = z.object({
  role: z.enum(VALID_ROLES).optional(),
  roles: z.array(z.enum(VALID_ROLES)).optional(),
  rank: z.enum(VALID_RANKS).optional(),
});

// Operations
const opStatus = z.enum(["active", "completed", "archived"]);
const opPriority = z.enum(["low", "medium", "high", "critical"]);

export const operationCreateSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().min(1, "Description required"),
  status: opStatus.optional().default("active"),
  priority: opPriority.optional().default("medium"),
  meritTag: z.string().optional().default(""),
  steps: z.array(z.object({
    order: z.number().optional(),
    station: z.string(),
    target: z.string(),
    requirements: z.string().optional(),
    description: z.string(),
    mapUrl: z.string().nullable().optional(),
  })).optional().default([]),
});

export const operationUpdateSchema = operationCreateSchema;

export const operationMeritTagSchema = z.object({
  meritTag: z.string().optional().default(""),
});

// Guides
export const guideCreateSchema = z.object({
  title: z.string().min(1, "Title required").transform((s) => s.trim()),
  content: z.string().min(1, "Content required"),
  excerpt: z.string().optional().transform((s) => s?.trim() ?? null),
});

export const guideUpdateSchema = guideCreateSchema;

// Links
export const linkCreateSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional().default(""),
  url: z.string().url("Valid URL required"),
});

export const linkUpdateSchema = linkCreateSchema;

// Hangar
export const hangarAssetCreateSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional().default(""),
  shipClass: z.string().optional().default(""),
  requirementTag: z.string().min(1, "Requirement tag required"),
  categoryId: z.string().optional().default("cat-executive"),
  requirementCount: z.coerce.number().int().min(1).optional().default(2),
});

export const hangarAssetUpdateSchema = hangarAssetCreateSchema;

export const hangarCategorySchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional().default(""),
});

// Raffles
export const raffleCreateSchema = z.object({
  meritTag: z.string().min(1, "Merit tag required"),
  assetId: z.string().optional(),
  assetIds: z.array(z.string()).optional(),
}).refine((d) => (Array.isArray(d.assetIds) && d.assetIds.length > 0) || !!d.assetId, { message: "At least one assetId or assetIds required" });

export const raffleUpdateSchema = z.object({
  meritTag: z.string().optional(),
  assetId: z.string().optional(),
  assetIds: z.array(z.string()).optional(),
});

// Merits
export const meritAwardSchema = z.object({
  usernames: z.array(z.string().min(1)).min(1, "At least one username required"),
  operationId: z.string().min(1, "Operation ID required"),
});

export const meritRevokeSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => Number(v)),
});

// Profile avatar
export const avatarSchema = z.object({
  avatar: z.string().min(1, "Avatar data required").refine((s) => s.startsWith("data:image/"), "Invalid image format"),
});

// Profile background: base64 data URL, same-origin path, or http(s) URL (max 500 chars to limit abuse)
export const backgroundSchema = z.object({
  background: z.string().min(1, "Background required").max(500, "URL too long").refine(
    (s) =>
      s.startsWith("data:image/") ||
      (s.startsWith("/") && !s.includes("//")) ||
      s.startsWith("http://") ||
      s.startsWith("https://"),
    "Must be image data URL, same-origin path, or http(s) URL"
  ),
});

// Hangar selections
export const hangarSelectionSchema = z.object({
  assetId: z.string().min(1, "Asset ID required"),
});
