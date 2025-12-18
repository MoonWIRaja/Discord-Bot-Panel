import { mysqlTable, serial, varchar, text, timestamp, boolean, json, mysqlEnum } from 'drizzle-orm/mysql-core';

// ----------------------------------------------------------------------------
// Better-Auth Tables
// ----------------------------------------------------------------------------

export const user = mysqlTable("user", {
	id: varchar("id", { length: 36 }).primaryKey(),
	name: text("name").notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: boolean("emailVerified").notNull(),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull()
});

export const session = mysqlTable("session", {
	id: varchar("id", { length: 36 }).primaryKey(),
	expiresAt: timestamp("expiresAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: varchar("userId", { length: 36 }).notNull().references(() => user.id)
});

export const account = mysqlTable("account", {
	id: varchar("id", { length: 36 }).primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: varchar("userId", { length: 36 }).notNull().references(() => user.id),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	expiresAt: timestamp("expiresAt"),
	password: text("password")
});

export const verification = mysqlTable("verification", {
	id: varchar("id", { length: 36 }).primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull()
});

// ----------------------------------------------------------------------------
// Application Tables
// ----------------------------------------------------------------------------

export const bots = mysqlTable('bots', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 }).notNull().references(() => user.id),
  token: text('token').notNull(), // Encrypted
  name: varchar('name', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['online', 'offline', 'error']).default('offline'),
  config: json('config'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const flows = mysqlTable('flows', {
  id: varchar('id', { length: 36 }).primaryKey(),
  botId: varchar('botId', { length: 36 }).notNull().references(() => bots.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  triggerType: varchar('triggerType', { length: 50 }).notNull(), // e.g., 'message_create'
  nodes: json('nodes').notNull(), // SvelteFlow nodes
  edges: json('edges').notNull(), // SvelteFlow edges
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
