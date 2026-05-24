import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  femurSize: text("femur_size").notNull().default(""),
  tibiaSize: text("tibia_size").notNull().default(""),
  polySize: text("poly_size").notNull().default(""),
  flexion: text("flexion").notNull().default(""),
  varus: text("varus").notNull().default(""),
  valgus: text("valgus").notNull().default(""),
  externalRotation: text("external_rotation").notNull().default(""),
  posteriorSlope: text("posterior_slope").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertCase = Omit<typeof casesTable.$inferInsert, "id" | "createdAt">;
export type Case = typeof casesTable.$inferSelect;
