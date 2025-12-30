import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ----------------------------------------------------------------------------
// Better-Auth Tables
// ----------------------------------------------------------------------------

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
	image: text("image"),
	role: text("role", { enum: ["user", "admin"] }).default("user"),
	plan: text("plan", { enum: ["free", "pro", "unlimited"] }).default("free"),
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

// Flow templates - pre-built bot flows and user-created templates
export const templates = sqliteTable('templates', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	category: text('category').default('utility'), // notification, music, utility, moderation, fun, welcome
	icon: text('icon').default('code'),
	color: text('color').default('#3b82f6'),
	nodes: text('nodes', { mode: 'json' }).notNull(),
	edges: text('edges', { mode: 'json' }).notNull(),
	isDefault: integer('is_default', { mode: 'boolean' }).default(false),
	downloads: integer('downloads').default(0),
	createdBy: text('created_by').references(() => user.id), // null = built-in template
	creatorName: text('creator_name'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// ----------------------------------------------------------------------------
// Billing & Payment Tables
// ----------------------------------------------------------------------------

// Subscription Plans
export const plans = sqliteTable('plans', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	price: integer('price').notNull(), // in cents (e.g., 999 = RM9.99)
	currency: text('currency').default('MYR'),
	interval: text('interval', { enum: ['monthly', 'yearly', 'lifetime'] }).default('monthly'),
	botLimit: integer('bot_limit').notNull().default(5),
	flowLimit: integer('flow_limit').notNull().default(10),
	features: text('features', { mode: 'json' }), // ["feature1", "feature2"]
	contactSupport: integer('contact_support', { mode: 'boolean' }).default(false), // Requires contacting support
	isActive: integer('is_active', { mode: 'boolean' }).default(true),
	sortOrder: integer('sort_order').default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// User Subscriptions
export const subscriptions = sqliteTable('subscriptions', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
	planId: text('planId').notNull().references(() => plans.id),
	status: text('status', { enum: ['active', 'cancelled', 'expired', 'pending', 'past_due'] }).default('pending'),
	currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
	currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
	cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Payment Transactions
export const transactions = sqliteTable('transactions', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull().references(() => user.id),
	subscriptionId: text('subscriptionId').references(() => subscriptions.id),
	planId: text('planId').references(() => plans.id),
	amount: integer('amount').notNull(), // in cents
	currency: text('currency').default('MYR'),
	paymentMethod: text('payment_method'), // duitnow, alipay, fpx, card
	paymentGateway: text('payment_gateway'), // hitpay, stripe, alipayplus
	status: text('status', { enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'] }).default('pending'),
	gatewayTransactionId: text('gateway_transaction_id'),
	gatewayResponse: text('gateway_response', { mode: 'json' }),
	metadata: text('metadata', { mode: 'json' }),
	paidAt: integer('paid_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// System Settings (for admin configuration)
export const systemSettings = sqliteTable('system_settings', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	value: text('value', { mode: 'json' }),
	category: text('category').default('general'), // general, payment, email, etc.
	description: text('description'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Activity Logs (for admin monitoring)
export const activityLogs = sqliteTable('activity_logs', {
	id: text('id').primaryKey(),
	userId: text('userId').references(() => user.id),
	action: text('action').notNull(), // login, create_bot, upgrade_plan, etc.
	resource: text('resource'), // bots, flows, users, etc.
	resourceId: text('resource_id'),
	details: text('details', { mode: 'json' }),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// AI Chat Sessions - tracks active AI chat rooms/threads
export const aiSessions = sqliteTable('ai_sessions', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	threadId: text('thread_id').notNull(), // Discord thread ID
	channelId: text('channel_id').notNull(), // Parent channel ID
	userId: text('user_id').notNull(), // Discord user ID who created the session
	aiProvider: text('ai_provider').default('gemini'), // Provider ID
	aiMode: text('ai_mode').default('auto'), // Mode ID (auto, chat, code, etc.)
	aiModel: text('ai_model'), // Selected model (optional, for custom model)
	conversationHistory: text('conversation_history', { mode: 'json' }), // Array of messages
	status: text('status').default('active'), // active, closed
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	closedAt: integer('closed_at', { mode: 'timestamp' })
});

// AI Configurations - stores provider configs from Studio nodes
export const aiConfigs = sqliteTable('ai_configs', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull(), // gemini, openai, claude, etc.
	apiKey: text('api_key').notNull(), // Encrypted API key
	isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
	// Model selections per mode (JSON object)
	models: text('models', { mode: 'json' }), // { chat: 'model', code: 'model', etc. }
	// Provider-specific settings
	endpoint: text('endpoint'), // For Azure, Ollama
	deployment: text('deployment'), // For Azure
	// Metadata
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// AI Channel Setup - stores channel UI configuration
export const aiChannels = sqliteTable('ai_channels', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	channelId: text('channel_id').notNull(), // Discord channel ID
	messageId: text('message_id'), // Discord message ID of the UI embed
	defaultProvider: text('default_provider'), // Default provider for this channel
	defaultMode: text('default_mode').default('auto'), // Default mode
	isActive: integer('is_active', { mode: 'boolean' }).default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// ----------------------------------------------------------------------------
// AI Token Usage & Limits Tables
// ----------------------------------------------------------------------------

// AI Token Usage - logs individual token usage for audit trail
export const aiTokenUsage = sqliteTable('ai_token_usage', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	providerId: text('provider_id').notNull(), // Provider ID from config (e.g., 'gemini', 'openai')
	providerLabel: text('provider_label').notNull(), // Human-readable label from Studio node
	userId: text('user_id'), // Discord user ID who triggered the usage
	userName: text('user_name'), // Discord username
	tokensUsed: integer('tokens_used'), // null = "token not provided"
	requestType: text('request_type'), // 'chat', 'image', 'audio', 'code', 'embedding'
	model: text('model'), // Model used
	// Cost tracking
	costUsd: real('cost_usd').default(0), // Calculated cost in USD
	imageCount: integer('image_count').default(0), // For image generation (number of images)
	audioSeconds: real('audio_seconds').default(0), // For voice (duration in seconds)
	charactersCount: integer('characters_count').default(0), // For TTS (number of characters)
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// AI Token Limits - settings per provider for limiting usage
export const aiTokenLimits = sqliteTable('ai_token_limits', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	providerId: text('provider_id').notNull(),
	providerLabel: text('provider_label').notNull(),
	// Limits (0 = unlimited)
	dailyLimit: integer('daily_limit').default(0),
	weeklyLimit: integer('weekly_limit').default(0),
	monthlyLimit: integer('monthly_limit').default(0),
	// Auto-reset settings
	autoResetDaily: integer('auto_reset_daily', { mode: 'boolean' }).default(true),
	autoResetWeekly: integer('auto_reset_weekly', { mode: 'boolean' }).default(true),
	autoResetMonthly: integer('auto_reset_monthly', { mode: 'boolean' }).default(true),
	// Current usage counters (reset periodically)
	dailyUsed: integer('daily_used').default(0),
	weeklyUsed: integer('weekly_used').default(0),
	monthlyUsed: integer('monthly_used').default(0),
	// Last reset timestamps
	dailyResetAt: integer('daily_reset_at', { mode: 'timestamp' }),
	weeklyResetAt: integer('weekly_reset_at', { mode: 'timestamp' }),
	monthlyResetAt: integer('monthly_reset_at', { mode: 'timestamp' }),
	// Admin bypass settings
	allowAdminBypass: integer('allow_admin_bypass', { mode: 'boolean' }).default(true),
	notifyOwnerOnLimit: integer('notify_owner_on_limit', { mode: 'boolean' }).default(true),
	// Metadata
	isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// ----------------------------------------------------------------------------
// AI Training Mode Tables
// ----------------------------------------------------------------------------

// AI Training Data - stores learned conversation examples
export const aiTrainingData = sqliteTable('ai_training_data', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	// Training example
	userMessage: text('user_message').notNull(),
	aiResponse: text('ai_response').notNull(),
	// Metadata
	userId: text('user_id'),
	userName: text('user_name'),
	channelId: text('channel_id'),
	// Quality markers
	isApproved: integer('is_approved', { mode: 'boolean' }).default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// AI Training Settings - per bot training configuration
export const aiTrainingSettings = sqliteTable('ai_training_settings', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }).unique(),
	isTrainingActive: integer('is_training_active', { mode: 'boolean' }).default(false),
	trainingChannelId: text('training_channel_id'),
	totalExamples: integer('total_examples').default(0),
	// Store notification message IDs as JSON for cleanup when training stops
	notificationMsgIds: text('notification_msg_ids'), // JSON: { channelId: messageId }
	lastTrainedAt: integer('last_trained_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// AI Knowledge Base - extracted facts/information from training
export const aiKnowledgeBase = sqliteTable('ai_knowledge_base', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	category: text('category').default('fact'), // people, company, product, fact, preference
	key: text('key').notNull(), // Topic/subject name
	value: text('value').notNull(), // Information/detail
	confidence: integer('confidence').default(80), // 1-100 confidence score
	source: text('source').default('auto'), // auto-extracted / manual
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});
