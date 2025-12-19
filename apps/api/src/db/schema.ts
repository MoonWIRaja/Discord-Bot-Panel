import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ----------------------------------------------------------------------------
// Better-Auth Tables
// ----------------------------------------------------------------------------

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
	image: text("image"),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: text("userId").notNull().references(() => user.id),
	createdAt: integer("createdAt", { mode: "timestamp" }),
	updatedAt: integer("updatedAt", { mode: "timestamp" })
});

export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId").notNull().references(() => user.id),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	expiresAt: integer("expiresAt", { mode: "timestamp" }),
	accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
	refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("createdAt", { mode: "timestamp" }),
	updatedAt: integer("updatedAt", { mode: "timestamp" })
});

export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	createdAt: integer("createdAt", { mode: "timestamp" }),
	updatedAt: integer("updatedAt", { mode: "timestamp" })
});

// ----------------------------------------------------------------------------
// Application Tables
// ----------------------------------------------------------------------------

export const bots = sqliteTable('bots', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull().references(() => user.id),
	token: text('token').notNull().unique(), // Encrypted, unique to prevent duplicates
	clientId: text('client_id'), // Discord Bot ID
	name: text('name').notNull(),
	avatar: text('avatar'),
	status: text('status', { enum: ['online', 'offline', 'error'] }).default('offline'),
	config: text('config', { mode: 'json' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const flows = sqliteTable('flows', {
	id: text('id').primaryKey(),
	botId: text('botId').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	triggerType: text('triggerType').notNull(), // e.g., 'message_create'
	nodes: text('nodes', { mode: 'json' }).notNull(), // SvelteFlow nodes
	edges: text('edges', { mode: 'json' }).notNull(), // SvelteFlow edges
	published: integer('published', { mode: 'boolean' }).default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Bot collaborators - users who can manage a bot
export const botCollaborators = sqliteTable('bot_collaborators', {
	id: text('id').primaryKey(),
	botId: text('botId').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['owner', 'editor', 'viewer'] }).default('editor'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Flow templates - pre-built bot flows that can be imported
export const templates = sqliteTable('templates', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	category: text('category', { enum: ['notification', 'music', 'utility', 'moderation', 'fun'] }).notNull(),
	icon: text('icon').notNull(),
	color: text('color').notNull(),
	nodes: text('nodes', { mode: 'json' }).notNull(),
	edges: text('edges', { mode: 'json' }).notNull(),
	isDefault: integer('is_default', { mode: 'boolean' }).default(true),
	downloads: integer('downloads').default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});
