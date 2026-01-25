import { pgTable, text, serial, timestamp, boolean, varchar, integer, jsonb, index } from 'drizzle-orm/pg-core'; // Added index import

// 1. Contacts: The Rolodex with Identity Validation
export const contacts = pgTable('contacts', {
    id: serial('id').primaryKey(),
    phone: varchar('phone', { length: 50 }).notNull().unique(), // +254...

    // Identity fields
    originalPushname: text('original_pushname'), // Name from WhatsApp (for reference)
    confirmedName: text('confirmed_name'), // Name the user actually gave
    isVerified: boolean('is_verified').default(false), // Has identity been confirmed?

    // Legacy field (keeping for backward compatibility)
    name: text('name'), // Will be synced with confirmedName

    // Profile & Context
    contextSummary: text('context_summary'), // "John's brother", "Client from Nairobi", etc.
    summary: text('summary'), // AI-generated detailed profile
    trustLevel: integer('trust_level').default(0), // 0-10

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    lastSeenAt: timestamp('last_seen_at').defaultNow(),
}, (table) => {
    return {
        phoneIdx: index('phone_idx').on(table.phone), // Optimize lookup by phone
    };
});

// 2. Message History: The Memory
export const messageLogs = pgTable('message_logs', {
    id: serial('id').primaryKey(),
    contactPhone: varchar('contact_phone', { length: 50 }).references(() => contacts.phone),
    role: varchar('role', { length: 10 }).notNull(), // 'agent' | 'user'
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
    return {
        contactPhoneIdx: index('contact_phone_idx').on(table.contactPhone), // Optimize history lookup
        createdAtIdx: index('created_at_idx').on(table.createdAt), // Optimize resizing/sorting
    };
});

// 3. Auth Credentials: session persistence
export const authCredentials = pgTable('auth_credentials', {
    key: text('key').primaryKey(),
    value: text('value').notNull(), // JSON stringified auth data
});

// 4. Session Lock: Prevent multiple instances from connecting
export const sessionLock = pgTable('session_lock', {
    id: serial('id').primaryKey(),
    sessionName: varchar('session_name', { length: 100 }).notNull().unique(),
    instanceId: text('instance_id').notNull(), // Unique ID for this process
    lockedAt: timestamp('locked_at').defaultNow(),
    expiresAt: timestamp('expires_at').notNull(), // Auto-expire after 5 minutes
});

// 5. Conversations: The Smart Snitch Sessions
export const conversations = pgTable('conversations', {
    id: serial('id').primaryKey(),
    contactPhone: varchar('contact_phone', { length: 50 }).references(() => contacts.phone),
    status: varchar('status', { length: 20 }).default('active'), // 'active' | 'completed'
    urgency: varchar('urgency', { length: 10 }), // 'red' | 'yellow' | 'green'
    summary: text('summary'), // The "Traffic Light" report content
    startedAt: timestamp('started_at').defaultNow(),
    endedAt: timestamp('ended_at'),
    unreadByOwner: boolean('unread_by_owner').default(true),
});

// 6. AI Profile: Agent Customization
export const aiProfile = pgTable('ai_profile', {
    id: serial('id').primaryKey(),

    // Agent Identity
    agentName: varchar('agent_name', { length: 100 }).default('Representative'),
    agentRole: text('agent_role').default('Personal Assistant'),

    // Personality & Behavior
    personalityTraits: text('personality_traits').default('Professional, helpful, and efficient'),
    communicationStyle: text('communication_style').default('Friendly yet professional'),

    // Custom System Prompts
    systemPrompt: text('system_prompt'), // Main system prompt override
    greetingMessage: text('greeting_message'), // Custom greeting for new contacts

    // Behavior Settings
    responseLength: varchar('response_length', { length: 20 }).default('medium'), // short, medium, long
    useEmojis: boolean('use_emojis').default(true),
    formalityLevel: integer('formality_level').default(5), // 1-10 scale

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// 7. User Profile: Boss/Owner Information
export const userProfile = pgTable('user_profile', {
    id: serial('id').primaryKey(),

    // Personal Information
    fullName: varchar('full_name', { length: 100 }),
    preferredName: varchar('preferred_name', { length: 50 }),
    title: varchar('title', { length: 100 }), // CEO, Manager, etc.
    company: varchar('company', { length: 200 }),

    // Contact Information
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    location: varchar('location', { length: 200 }),
    timezone: varchar('timezone', { length: 50 }),

    // Professional Context
    industry: varchar('industry', { length: 100 }),
    role: text('role'), // Detailed role description
    responsibilities: text('responsibilities'), // What they do

    // Preferences
    workingHours: text('working_hours'), // e.g., "9 AM - 5 PM EST"
    availability: text('availability'), // When they're available
    priorities: text('priorities'), // What matters most to them

    // AI Context
    backgroundInfo: text('background_info'), // Additional context for AI
    communicationPreferences: text('communication_preferences'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

