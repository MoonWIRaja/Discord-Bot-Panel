import { ToolDefinition, ToolRegistry } from '../registry.js';
import { UserIdentityService } from '../../user-identity.service.js';

/**
 * Tool for AI to save user's preferred nickname
 * This is called when a user tells the AI what they want to be called
 */
const setNicknameTool: ToolDefinition = {
    name: 'set_user_nickname',
    description: '💾 SAVE USER NICKNAME - Use this tool when a user tells you their preferred nickname or what they want to be called. This saves their preference so you will always call them by that name in future conversations. Examples: "panggil aku Amir", "call me John", "my name is Sarah", "nama saya Ali".',
    category: 'utility',
    parameters: {
        nickname: {
            type: 'string',
            description: 'The user\'s preferred nickname/name they want to be called',
            required: true
        }
    },
    handler: async ({ nickname }, { botId, userId }) => {
        try {
            if (!nickname || typeof nickname !== 'string') {
                return '❌ Please provide a valid nickname.';
            }

            const trimmedNickname = nickname.trim();
            if (trimmedNickname.length === 0) {
                return '❌ Nickname cannot be empty.';
            }

            if (trimmedNickname.length > 50) {
                return '❌ Nickname is too long. Maximum 50 characters.';
            }

            // Make sure user is registered first
            const isKnown = await UserIdentityService.isKnownUser(botId, userId);
            if (!isKnown) {
                // Register them first with a placeholder name
                await UserIdentityService.registerUser(botId, userId, trimmedNickname);
            }

            // Set the nickname
            await UserIdentityService.setNickname(botId, userId, trimmedNickname);

            console.log(`[Tool:set_user_nickname] Saved nickname "${trimmedNickname}" for user ${userId}`);

            return `✅ Got it! I'll remember to call you "${trimmedNickname}" from now on! 😊`;
        } catch (error: any) {
            console.error('[Tool:set_user_nickname] Error:', error);
            return `❌ Sorry, couldn't save the nickname: ${error.message}`;
        }
    }
};

ToolRegistry.register(setNicknameTool);
export default setNicknameTool;
