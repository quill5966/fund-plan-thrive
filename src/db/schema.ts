import { pgTable, text, timestamp, decimal, uuid, boolean, integer } from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Assets table
export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  effectiveDate: timestamp("effective_date").defaultNow().notNull(), // When was this balance true?
  updatedDate: timestamp("updated_date").defaultNow().notNull(), // When did the system write it?
  source: text("source").notNull().default('user_input'), // 'user_input', 'system_sync'
  isActive: boolean("is_active").default(true).notNull(), // updates to false if user says "I closed this account"
});

// Assets History (Time Series)
export const assetsHistory = pgTable("assets_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => assets.id).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  updatedDate: timestamp("updated_date").defaultNow().notNull(),
  source: text("source").notNull(),
  // History doesn't strictly need isActive, as it records the state at that time. 
  // However, logging the 'active status' change in history is good practice.
});

// Debts table
export const debts = pgTable("debts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  effectiveDate: timestamp("effective_date").defaultNow().notNull(),
  updatedDate: timestamp("updated_date").defaultNow().notNull(),
  source: text("source").notNull().default('user_input'),
  isActive: boolean("is_active").default(true).notNull(),
});

// Debts History (Time Series)
export const debtsHistory = pgTable("debts_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  debtId: uuid("debt_id").references(() => debts.id).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  updatedDate: timestamp("updated_date").defaultNow().notNull(),
  source: text("source").notNull(),
});

// Conversations table - Chat sessions with the AI advisor
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").default('active').notNull(), // 'active', 'completed'
  summary: text("summary"), // Optional AI-generated summary of the conversation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table - Individual chat messages within a conversation
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Goals table
export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).default('0'),
  // deadline: timestamp("deadline"), // Optional, maybe in v2
  status: text("status").default('active').notNull(), // 'active', 'completed', 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Goal Steps table
export const goalSteps = pgTable("goal_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id").references(() => goals.id).notNull(),
  description: text("description").notNull(),  // Also serves as "topic" for intent spec
  order: text("order").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  isUserDefined: boolean("is_user_defined").default(false).notNull(),
  // Intent Spec fields (populated async after step creation)
  userJob: text("user_job"),  // "research", "compare", "calculate", "draft", "buy", "negotiate", "implement"
  constraints: text("constraints"),  // JSON: {"budget": "...", "timeline": "...", "location": "...", "riskTolerance": "...", "vendorPreference": "..."}
  resourceTypesNeeded: text("resource_types_needed"),  // JSON array: ["guide", "checklist", "calculator", "dataset", "video", "template"]
  queryTerms: text("query_terms"),  // JSON array: 1 high-quality search query (limited for Brave free tier)
  intentExtractedAt: timestamp("intent_extracted_at"),
});

// Goal Resources table
export const goalResources = pgTable("goal_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  stepId: uuid("step_id").references(() => goalSteps.id).notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  // Curation metadata (populated by Resource Curation Service)
  publisher: text("publisher"),  // Domain/publisher name
  resourceType: text("resource_type"),  // "guide", "checklist", "calculator", "dataset", "video", "template"
  credibilityScore: decimal("credibility_score", { precision: 3, scale: 2 }),  // 0.00 - 1.00
  curatedAt: timestamp("curated_at").defaultNow().notNull(),
});
