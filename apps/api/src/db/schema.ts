import { pgTable, text, integer, boolean, timestamp, jsonb, real } from 'drizzle-orm/pg-core';

// ----------------------------------------------------------------------------
// Better-Auth Tables
// ----------------------------------------------------------------------------

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull(),
	image: text("image"),
	role: text("role").default("user"), // Enum handled as text for simplicity or create PG Enum
	plan: text("plan").default("free"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expiresAt").notNull(),
	token: text("token").notNull().unique(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: text("userId").notNull().references(() => user.id),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt")
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId").notNull().references(() => user.id),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	expiresAt: timestamp("expiresAt"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt")
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt")
});

// ----------------------------------------------------------------------------
// Application Tables
// ----------------------------------------------------------------------------

export const bots = pgTable('bots', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull().references(() => user.id),
	token: text('token').notNull().unique(), // Encrypted
	clientId: text('client_id'), // Discord Bot ID
	name: text('name').notNull(),
	avatar: text('avatar'),
	status: text('status').default('offline'),
	config: jsonb('config'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const flows = pgTable('flows', {
	id: text('id').primaryKey(),
	botId: text('botId').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	triggerType: text('triggerType').notNull(),
	nodes: jsonb('nodes').notNull(),
	edges: jsonb('edges').notNull(),
	published: boolean('published').default(false),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const botCollaborators = pgTable('bot_collaborators', {
	id: text('id').primaryKey(),
	botId: text('botId').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
	role: text('role').default('editor'),
	createdAt: timestamp('created_at').defaultNow()
});

export const templates = pgTable('templates', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	category: text('category').default('utility'),
	icon: text('icon').default('code'),
	color: text('color').default('#3b82f6'),
	nodes: jsonb('nodes').notNull(),
	edges: jsonb('edges').notNull(),
	isDefault: boolean('is_default').default(false),
	downloads: integer('downloads').default(0),
	createdBy: text('created_by').references(() => user.id),
	creatorName: text('creator_name'),
	createdAt: timestamp('created_at').defaultNow()
});

// ----------------------------------------------------------------------------
// Billing & Payment Tables
// ----------------------------------------------------------------------------

export const plans = pgTable('plans', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	price: integer('price').notNull(), // in cents
	currency: text('currency').default('MYR'),
	interval: text('interval').default('monthly'),
	botLimit: integer('bot_limit').notNull().default(5),
	flowLimit: integer('flow_limit').notNull().default(10),
	features: jsonb('features'),
	contactSupport: boolean('contact_support').default(false),
	isActive: boolean('is_active').default(true),
	sortOrder: integer('sort_order').default(0),
	createdAt: timestamp('created_at').defaultNow()
});

export const subscriptions = pgTable('subscriptions', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
	planId: text('planId').notNull().references(() => plans.id),
	status: text('status').default('pending'),
	currentPeriodStart: timestamp('current_period_start'),
	currentPeriodEnd: timestamp('current_period_end'),
	cancelledAt: timestamp('cancelled_at'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const transactions = pgTable('transactions', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull().references(() => user.id),
	subscriptionId: text('subscriptionId').references(() => subscriptions.id),
	planId: text('planId').references(() => plans.id),
	amount: integer('amount').notNull(),
	currency: text('currency').default('MYR'),
	paymentMethod: text('payment_method'),
	paymentGateway: text('payment_gateway'),
	status: text('status').default('pending'),
	gatewayTransactionId: text('gateway_transaction_id'),
	gatewayResponse: jsonb('gateway_response'),
	metadata: jsonb('metadata'),
	paidAt: timestamp('paid_at'),
	createdAt: timestamp('created_at').defaultNow()
});

export const systemSettings = pgTable('system_settings', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	value: jsonb('value'),
	category: text('category').default('general'),
	description: text('description'),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const activityLogs = pgTable('activity_logs', {
	id: text('id').primaryKey(),
	userId: text('userId').references(() => user.id),
	action: text('action').notNull(),
	resource: text('resource'),
	resourceId: text('resource_id'),
	details: jsonb('details'),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').defaultNow()
});

export const aiSessions = pgTable('ai_sessions', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	threadId: text('thread_id').notNull(),
	channelId: text('channel_id').notNull(),
	userId: text('user_id').notNull(),
	aiProvider: text('ai_provider').default('gemini'),
	aiMode: text('ai_mode').default('auto'),
	aiModel: text('ai_model'),
	conversationHistory: jsonb('conversation_history'),
	status: text('status').default('active'),
	createdAt: timestamp('created_at').defaultNow(),
	closedAt: timestamp('closed_at')
});

export const aiConfigs = pgTable('ai_configs', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull(),
	apiKey: text('api_key').notNull(),
	isEnabled: boolean('is_enabled').default(true),
	models: jsonb('models'),
	endpoint: text('endpoint'),
	deployment: text('deployment'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const aiChannels = pgTable('ai_channels', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	channelId: text('channel_id').notNull(),
	messageId: text('message_id'),
	defaultProvider: text('default_provider'),
	defaultMode: text('default_mode').default('auto'),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at').defaultNow()
});

export const aiTokenUsage = pgTable('ai_token_usage', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	providerId: text('provider_id').notNull(),
	providerLabel: text('provider_label').notNull(),
	userId: text('user_id'),
	userName: text('user_name'),
	tokensUsed: integer('tokens_used'),
	requestType: text('request_type'),
	model: text('model'),
	costUsd: real('cost_usd').default(0),
	imageCount: integer('image_count').default(0),
	audioSeconds: real('audio_seconds').default(0),
	charactersCount: integer('characters_count').default(0),
	createdAt: timestamp('created_at').defaultNow()
});

export const aiTokenLimits = pgTable('ai_token_limits', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	providerId: text('provider_id').notNull(),
	providerLabel: text('provider_label').notNull(),
	dailyLimit: integer('daily_limit').default(0),
	weeklyLimit: integer('weekly_limit').default(0),
	monthlyLimit: integer('monthly_limit').default(0),
	autoResetDaily: boolean('auto_reset_daily').default(true),
	autoResetWeekly: boolean('auto_reset_weekly').default(true),
	autoResetMonthly: boolean('auto_reset_monthly').default(true),
	dailyUsed: integer('daily_used').default(0),
	weeklyUsed: integer('weekly_used').default(0),
	monthlyUsed: integer('monthly_used').default(0),
	dailyResetAt: timestamp('daily_reset_at'),
	weeklyResetAt: timestamp('weekly_reset_at'),
	monthlyResetAt: timestamp('monthly_reset_at'),
	allowAdminBypass: boolean('allow_admin_bypass').default(true),
	notifyOwnerOnLimit: boolean('notify_owner_on_limit').default(true),
	isEnabled: boolean('is_enabled').default(true),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const aiTrainingData = pgTable('ai_training_data', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	userMessage: text('user_message').notNull(),
	aiResponse: text('ai_response').notNull(),
	userId: text('user_id'),
	userName: text('user_name'),
	channelId: text('channel_id'),
	isApproved: boolean('is_approved').default(true),
	createdAt: timestamp('created_at').defaultNow()
});

export const aiTrainingSettings = pgTable('ai_training_settings', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }).unique(),
	isTrainingActive: boolean('is_training_active').default(false),
	trainingChannelId: text('training_channel_id'),
	totalExamples: integer('total_examples').default(0),
	notificationMsgIds: text('notification_msg_ids'), // Keep as text or jsonb? Using text to be safe if simple key-value, but jsonb better. IDK usage, sticking to text for simple ID storage or maybe jsonb? The previous schema said `text` for this one. Let's start with `text` to minimize friction. Wait, original was `text`.
	lastTrainedAt: timestamp('last_trained_at'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const aiKnowledgeBase = pgTable('ai_knowledge_base', {
	id: text('id').primaryKey(),
	botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	category: text('category').default('fact'),
	key: text('key').notNull(),
	value: text('value').notNull(),
	confidence: integer('confidence').default(80),
	source: text('source').default('auto'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});
