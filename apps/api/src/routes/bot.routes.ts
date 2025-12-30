import { Router } from 'express';
import { BotService } from '../services/bot.service.js';
import { BotRuntime } from '../services/bot.runtime.js';
import { TokenUsageService } from '../services/tokenUsage.service.js';
import { TrainingService } from '../services/training.service.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Protect all bot routes
router.use(requireAuth);

const createBotSchema = z.object({
  token: z.string().min(1),
  name: z.string().optional() // Name is now optional as we fetch it from Discord
});

const updateBotSchema = z.object({
  name: z.string().min(1)
});

const addCollaboratorSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['editor', 'viewer']).optional()
});

router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const bots = await BotService.getUserBots(user.id);
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// Get user's current plan limits and status
router.get('/user/limits', async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const userPlan = reqUser.plan || 'free';

    // Get dynamic limits from BotService
    const limits = await BotService.getPlanLimits(userPlan);
    const ownedBotCount = await BotService.countOwnedBots(reqUser.id);

    res.json({
      plan: userPlan,
      planEnabled: limits.enabled,
      planDisplayName: limits.planDisplayName,
      botLimit: limits.botLimit,
      flowLimit: limits.flowLimit,
      ownedBotCount,
      // Display values
      botLimitDisplay: limits.botLimit === 0 ? '∞' : String(limits.botLimit),
      flowLimitDisplay: limits.flowLimit === 0 ? '∞' : String(limits.flowLimit)
    });
  } catch (error) {
    console.error('Failed to get user limits:', error);
    res.status(500).json({ error: 'Failed to get user limits' });
  }
});

// Validate token without creating
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    // Check if token is already registered
    const isDuplicate = await BotService.isTokenDuplicate(token);
    if (isDuplicate) {
      res.status(400).json({ error: 'This bot is already registered in the system' });
      return;
    }

    const discordBot = await BotService.validateToken(token);
    if (!discordBot) {
      res.status(400).json({ error: 'Invalid Bot Token' });
      return;
    }
    res.json(discordBot);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Search users by Discord name or email
router.get('/users/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters' });
      return;
    }
    const users = await BotService.searchUsers(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get available AI models for a provider (MUST be before /:id routes!)
router.get('/ai/models/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { PROVIDER_MODELS } = await import('../services/ai.service.js');

    const providerModels = PROVIDER_MODELS[provider];
    if (!providerModels) {
      res.json({ models: {} });
      return;
    }

    // Return models as string arrays for each mode
    res.json({ models: providerModels });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Get all AI providers with their modes
router.get('/ai/providers', async (req, res) => {
  try {
    const { AI_PROVIDERS, AI_MODES, PROVIDER_MODELS } = await import('../services/ai.service.js');

    const providers = Object.values(AI_PROVIDERS).map((p: any) => ({
      id: p.id,
      name: p.name,
      modes: Object.keys(PROVIDER_MODELS[p.id] || {})
    }));

    const modes = Object.values(AI_MODES).map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      icon: m.icon
    }));

    res.json({ providers, modes });
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Universal Fetch Models from Provider API (works for all providers)
router.post('/ai/fetch-models', async (req, res) => {
  try {
    const { provider, apiKey, endpoint, validate } = req.body;

    if (!provider || !apiKey) {
      res.status(400).json({ error: 'Provider and API key required' });
      return;
    }

    let models: { id: string; name: string; modes: string[] }[] = [];

    switch (provider) {
      case 'azure': {
        if (!endpoint) {
          res.status(400).json({ error: 'Azure endpoint required' });
          return;
        }

        // Detect if this is Azure AI Services (Anthropic) or Azure OpenAI
        const isAnthropic = endpoint.includes('/anthropic');
        console.log('[FetchModels] Azure endpoint type:', isAnthropic ? 'Anthropic' : 'OpenAI');

        if (isAnthropic) {
          // Azure AI Services Anthropic endpoint - query the API for available models
          // Try multiple possible API endpoints for model listing
          const baseEndpoint = endpoint.replace(/\/$/, '');

          // Try to list models from Azure Anthropic API
          const modelsUrls = [
            `${baseEndpoint}/v1/models`,
            `${baseEndpoint}/models`,
          ];

          let foundModels = false;
          for (const modelsUrl of modelsUrls) {
            console.log('[FetchModels] Azure Anthropic trying URL:', modelsUrl);
            try {
              const response = await fetch(modelsUrl, {
                headers: {
                  'x-api-key': apiKey,
                  'api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                  'Content-Type': 'application/json'
                }
              });
              const responseText = await response.text();
              console.log('[FetchModels] Azure Anthropic response status:', response.status);
              console.log('[FetchModels] Azure Anthropic response:', responseText.substring(0, 500));

              if (response.ok) {
                try {
                  const data = JSON.parse(responseText);
                  const modelsList = data.data || data.models || data.value || [];
                  if (modelsList.length > 0) {
                    models = modelsList.map((m: any) => ({
                      id: m.id || m.name || m.model,
                      name: m.display_name || m.name || m.id || m.model,
                      modes: ['chat', 'code', 'vision']
                    }));
                    foundModels = true;
                    console.log('[FetchModels] Azure Anthropic: Found', models.length, 'models');
                    break;
                  }
                } catch (e) {
                  console.log('[FetchModels] Azure Anthropic parse error:', e);
                }
              }
            } catch (e) {
              console.log('[FetchModels] Azure Anthropic fetch error:', e);
            }
          }

          // If no models found via API, return empty - Azure Anthropic doesn't support model listing
          if (!foundModels || models.length === 0) {
            console.log('[FetchModels] Azure Anthropic: API does not support model listing');
            // Return empty - user should enter model manually
            res.json({
              models: [],
              message: 'Azure Anthropic does not support model listing. Please enter your model name manually (e.g., claude-opus-4-5).',
              manualEntry: true
            });
            return;
          }
        } else {
          // Standard Azure OpenAI endpoint - clean any existing /openai path first
          const baseEndpoint = endpoint.replace(/\/$/, '').replace(/\/openai.*$/, '');
          const azureUrl = `${baseEndpoint}/openai/deployments?api-version=2024-02-01`;
          console.log('[FetchModels] Azure OpenAI URL:', azureUrl);
          const response = await fetch(azureUrl, {
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });
          const responseText = await response.text();
          console.log('[FetchModels] Azure response status:', response.status);
          console.log('[FetchModels] Azure response:', responseText.substring(0, 500));

          if (response.ok) {
            try {
              const data = JSON.parse(responseText);
              models = (data.data || data.value || []).map((d: any) => ({
                id: d.id || d.name,
                name: (d.id || d.name) + (d.model ? ` (${d.model})` : ''),
                modes: ['chat', 'code', 'debug']
              }));
            } catch (e) {
              console.log('[FetchModels] Azure parse error:', e);
            }
          }
        }
        break;
      }

      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          models = data.data?.filter((m: any) =>
            m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('dall-e')
          ).map((m: any) => ({
            id: m.id,
            name: m.id,
            modes: m.id.includes('dall-e') ? ['image'] : ['chat', 'code', 'debug']
          })) || [];
        }
        break;
      }

      case 'gemini': {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (response.ok) {
          const data = await response.json();
          models = data.models?.filter((m: any) =>
            m.name.includes('gemini') || m.name.includes('imagen')
          ).map((m: any) => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', ''),
            modes: m.name.includes('imagen') ? ['image'] : ['chat', 'code', 'debug', 'vision']
          })) || [];
        }
        break;
      }

      case 'groq': {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          models = data.data?.map((m: any) => ({
            id: m.id,
            name: m.id,
            modes: ['chat', 'code', 'debug']
          })) || [];
        }
        break;
      }

      case 'together': {
        const response = await fetch('https://api.together.xyz/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          models = data?.filter((m: any) => m.type === 'chat' || m.type === 'image').map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            modes: m.type === 'image' ? ['image'] : ['chat', 'code']
          })).slice(0, 50) || []; // Limit to 50
        }
        break;
      }

      case 'mistral': {
        const response = await fetch('https://api.mistral.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          models = data.data?.map((m: any) => ({
            id: m.id,
            name: m.id,
            modes: ['chat', 'code']
          })) || [];
        }
        break;
      }

      case 'deepseek': {
        const response = await fetch('https://api.deepseek.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          models = data.data?.map((m: any) => ({
            id: m.id,
            name: m.id,
            modes: ['chat', 'code', 'debug']
          })) || [];
        }
        break;
      }

      default:
        // For providers without model listing API, return empty
        res.json({ models: [], message: 'This provider does not support model listing' });
        return;
    }

    console.log(`[FetchModels] ${provider}: Found ${models.length} models`);

    // If validate=true, test each model with a quick API call
    if (validate && models.length > 0) {
      console.log(`[FetchModels] Validating ${models.length} models...`);

      const validateModel = async (model: any): Promise<{ model: any; valid: boolean }> => {
        try {
          let testUrl = '';
          let testBody: any = {};
          let headers: any = {};

          switch (provider) {
            case 'gemini':
              testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`;
              testBody = { contents: [{ parts: [{ text: 'test' }] }] };
              headers = { 'Content-Type': 'application/json' };
              break;
            case 'openai':
              testUrl = 'https://api.openai.com/v1/chat/completions';
              testBody = { model: model.id, messages: [{ role: 'user', content: 'test' }], max_tokens: 20 };
              headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
              break;
            case 'groq':
              testUrl = 'https://api.groq.com/openai/v1/chat/completions';
              testBody = { model: model.id, messages: [{ role: 'user', content: 'test' }], max_tokens: 20 };
              headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
              break;
            case 'azure':
              if (endpoint?.includes('/anthropic')) {
                testUrl = `${endpoint.replace(/\/$/, '')}/v1/messages`;
                testBody = { model: model.id, max_tokens: 20, messages: [{ role: 'user', content: 'test' }] };
                headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
              }
              break;
            default:
              return { model, valid: true }; // Skip validation for unknown providers
          }

          if (!testUrl) return { model, valid: true };

          let response = await fetch(testUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(testBody),
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });

          // Retry with max_completion_tokens if max_tokens is unsupported
          if (response.status === 400 && (await response.clone().text()).includes("max_tokens' is not supported")) {
            const newBody = { ...testBody };
            if (newBody.max_tokens) {
              newBody.max_completion_tokens = newBody.max_tokens;
              delete newBody.max_tokens;
            }

            response = await fetch(testUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(newBody),
              signal: AbortSignal.timeout(5000)
            });
          }

          const valid = response.ok || response.status === 200;
          console.log(`[FetchModels] Model ${model.id}: ${valid ? '✓' : '✗'} (${response.status})`);
          return { model, valid };
        } catch (e: any) {
          console.log(`[FetchModels] Model ${model.id}: ✗ (timeout/error)`);
          return { model, valid: false };
        }
      };

      // Test models in parallel (max 5 at a time to avoid rate limits)
      const results: { model: any; valid: boolean }[] = [];
      const batchSize = 5;
      for (let i = 0; i < models.length; i += batchSize) {
        const batch = models.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(validateModel));
        results.push(...batchResults);
      }

      // Filter to only valid models
      const validModels = results.filter(r => r.valid).map(r => r.model);
      console.log(`[FetchModels] ${provider}: ${validModels.length}/${models.length} models validated`);

      res.json({
        models: validModels,
        count: validModels.length,
        total: models.length,
        validated: true
      });
      return;
    }

    res.json({ models, count: models.length });

  } catch (error: any) {
    console.error('[FetchModels] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch models' });
  }
});

// Deploy/Validate a custom model - tests the model and determines supported modes
router.post('/ai/deploy-model', async (req, res) => {
  try {
    const { provider, apiKey, endpoint, modelName } = req.body;

    if (!provider || !apiKey || !modelName) {
      res.status(400).json({ error: 'Provider, API key, and model name required' });
      return;
    }

    console.log(`[DeployModel] Testing model "${modelName}" for provider "${provider}"`);

    // Test the model with actual API call
    let testUrl = '';
    let testBody: any = {};
    let headers: any = {};
    let isValid = false;
    let errorMessage = '';

    switch (provider) {
      case 'gemini':
        testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        testBody = { contents: [{ parts: [{ text: 'test' }] }] };
        headers = { 'Content-Type': 'application/json' };
        break;
      case 'openai':
        // Check if this is an image model (DALL-E)
        const isOpenAIImageModel = modelName.toLowerCase().includes('dall') || modelName.toLowerCase().includes('image');

        if (isOpenAIImageModel) {
          testUrl = 'https://api.openai.com/v1/images/generations';
          testBody = { model: modelName, prompt: 'test', n: 1, size: '1024x1024' };
          headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        } else {
          testUrl = 'https://api.openai.com/v1/chat/completions';
          testBody = { model: modelName, messages: [{ role: 'user', content: 'test' }], max_tokens: 20 };
          headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        }
        break;
      case 'groq':
        testUrl = 'https://api.groq.com/openai/v1/chat/completions';
        testBody = { model: modelName, messages: [{ role: 'user', content: 'test' }], max_tokens: 20 };
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        break;
      case 'azure':
        if (endpoint?.includes('/anthropic')) {
          testUrl = `${endpoint.replace(/\/$/, '')}/v1/messages`;
          testBody = { model: modelName, max_tokens: 20, messages: [{ role: 'user', content: 'test' }] };
          headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
        } else if (endpoint) {
          // Clean endpoint - extract base URL only (remove /openai and anything after)
          const baseEndpoint = endpoint.replace(/\/$/, '').replace(/\/openai.*$/, '');

          // Check if this is an image model (DALL-E)
          const isImageModel = modelName.toLowerCase().includes('dall') || modelName.toLowerCase().includes('image');

          if (isImageModel) {
            // DALL-E uses images/generations endpoint
            testUrl = `${baseEndpoint}/openai/deployments/${modelName}/images/generations?api-version=2024-02-01`;
            testBody = { prompt: 'test', n: 1, size: '1024x1024' };
            headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
          } else {
            // Chat models use chat/completions endpoint
            testUrl = `${baseEndpoint}/openai/deployments/${modelName}/chat/completions?api-version=2024-02-01`;
            testBody = { messages: [{ role: 'user', content: 'test' }], max_tokens: 20 };
            headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
          }
        }
        break;
      case 'claude':
        testUrl = 'https://api.anthropic.com/v1/messages';
        testBody = { model: modelName, max_tokens: 20, messages: [{ role: 'user', content: 'test' }] };
        headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
        break;
    }

    // Test the model
    if (testUrl) {
      try {
        console.log(`[DeployModel] Testing at: ${testUrl}`);

        let response = await fetch(testUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(testBody),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        let responseText = await response.text();
        console.log(`[DeployModel] Test response status: ${response.status}`);

        // Retry with max_completion_tokens if max_tokens is unsupported (for new O1/O3 models)
        if (response.status === 400 && responseText.includes("max_tokens' is not supported")) {
          console.log('[DeployModel] Retrying with max_completion_tokens...');
          const newBody = { ...testBody };
          if (newBody.max_tokens) {
            newBody.max_completion_tokens = newBody.max_tokens;
            delete newBody.max_tokens;
          }

          response = await fetch(testUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(newBody),
            signal: AbortSignal.timeout(10000)
          });
          responseText = await response.text();
          console.log(`[DeployModel] Retry response status: ${response.status}`);
        }

        console.log(`[DeployModel] Test response: ${responseText.substring(0, 300)}`);

        if (response.ok || response.status === 200) {
          isValid = true;
          console.log(`[DeployModel] ✓ Model "${modelName}" is working!`);
        } else if (response.status === 400 && responseText.includes('content_policy_violation')) {
          // For image models, content_policy_violation means the model IS working
          // It's just rejecting the test prompt - this is expected behavior
          isValid = true;
          console.log(`[DeployModel] ✓ Model "${modelName}" is working (content policy triggered on test prompt, which is expected)`);
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'API key invalid or unauthorized';
        } else if (response.status === 404) {
          errorMessage = `Model "${modelName}" not found`;
        } else {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData?.error?.message || errorData?.message || `Model test failed (${response.status})`;
          } catch {
            errorMessage = `Model test failed with status ${response.status}`;
          }
        }
      } catch (e: any) {
        console.log(`[DeployModel] Test error:`, e.message);
        errorMessage = e.message?.includes('timeout') ? 'Model test timed out' : 'Model test failed';
      }
    } else {
      // No test URL, assume valid for unknown providers
      isValid = true;
    }

    if (!isValid) {
      res.json({
        success: false,
        error: errorMessage || `Model "${modelName}" could not be validated`,
        model: null
      });
      return;
    }

    // Determine supported modes based on model name patterns
    let supportedModes: string[] = [];
    const modelLower = modelName.toLowerCase();

    if (modelLower.includes('dall') || modelLower.includes('imagen') || modelLower.includes('image')) {
      supportedModes = ['image'];
    } else {
      supportedModes = ['chat', 'code'];
      if (modelLower.includes('vision') || modelLower.includes('4o') || modelLower.includes('opus') ||
        modelLower.includes('sonnet') || modelLower.includes('gemini') || modelLower.includes('pro') ||
        modelLower.includes('flash')) {
        supportedModes.push('vision');
      }
    }

    const deployedModel = {
      id: modelName,
      name: modelName,
      modes: supportedModes,
      custom: true,
      validated: true
    };

    console.log(`[DeployModel] ✓ Deployed:`, deployedModel);

    res.json({
      success: true,
      model: deployedModel,
      modes: deployedModel.modes,
      message: `✓ Model "${modelName}" validated and deployed with modes: ${supportedModes.join(', ')}`
    });

  } catch (error: any) {
    console.error('[DeployModel] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to deploy model' });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = createBotSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }

    const user = (req as any).user;
    // We pass token only, name is fetched from Discord
    const bot = await BotService.createBot(user.id, result.data.token);
    res.status(201).json(bot);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
    }
    // Mask token for safety
    const maskedBot = { ...bot, token: '******' };
    res.json(maskedBot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Refresh bot info from Discord (update name, avatar in database)
router.post('/:id/refresh', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await BotService.refreshBotInfo(req.params.id, user.id);
    res.json(result);
  } catch (error: any) {
    console.error('[Bot Refresh] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh bot info' });
  }
});

// Get bot collaborators
router.get('/:id/collaborators', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }
    const collaborators = await BotService.getCollaborators(req.params.id);
    res.json(collaborators);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

// Add collaborator
router.post('/:id/collaborators', async (req, res) => {
  try {
    const result = addCollaboratorSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Only owner can add collaborators
    if (bot.userId !== user.id) {
      res.status(403).json({ error: 'Only bot owner can add collaborators' });
      return;
    }

    await BotService.addCollaborator(req.params.id, result.data.userId, result.data.role || 'editor');
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:collaboratorId', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Only owner can remove collaborators
    if (bot.userId !== user.id) {
      res.status(403).json({ error: 'Only bot owner can remove collaborators' });
      return;
    }

    await BotService.removeCollaborator(req.params.id, req.params.collaboratorId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const result = updateBotSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Update on Discord
    const token = Buffer.from(bot.token, 'base64').toString('ascii');
    await BotService.updateBotDiscordProfile(token, result.data.name);

    res.json({ success: true, name: result.data.name });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ----- Bot Control Endpoints -----

// Get bot status
router.get('/:id/status', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }
    res.json({ status: bot.status || 'offline' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bot status' });
  }
});

// Start bot
router.post('/:id/start', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Actually start the bot and connect to Discord
    const result = await BotRuntime.startBot(req.params.id);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to start bot' });
      return;
    }

    res.json({ success: true, status: 'online', message: 'Bot started and connected to Discord' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start bot' });
  }
});

// Stop bot
router.post('/:id/stop', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Actually stop the bot and disconnect from Discord
    const result = await BotRuntime.stopBot(req.params.id);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to stop bot' });
      return;
    }

    res.json({ success: true, status: 'offline', message: 'Bot stopped' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to stop bot' });
  }
});

// Restart bot
router.post('/:id/restart', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Actually restart the bot
    const result = await BotRuntime.restartBot(req.params.id);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to restart bot' });
      return;
    }

    res.json({ success: true, status: 'online', message: 'Bot restarted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to restart bot' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    await BotService.deleteBot(req.params.id, user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// Get bot activity logs
router.get('/:id/logs', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const logs = BotRuntime.getBotLogs(req.params.id, limit);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get logs' });
  }
});

// Clear bot activity logs
router.delete('/:id/logs', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    BotRuntime.clearBotLogs(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear logs' });
  }
});

// Clear AI channel chat history (bulk delete Discord messages)
router.delete('/:id/ai-history', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const result = await BotRuntime.clearAIChannelHistory(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear AI channel history' });
  }
});

// ----- Token Usage Endpoints -----

// Get token usage summary for all providers
router.get('/:id/token-usage/summary', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const summary = await TokenUsageService.getUsageSummary(req.params.id);
    res.json({ summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get token usage summary' });
  }
});

// Get token usage logs (audit trail)
router.get('/:id/token-usage/logs', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await TokenUsageService.getUsageLogs(req.params.id, limit);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get token usage logs' });
  }
});

// Get token limits for all providers
router.get('/:id/token-limits', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const limits = await TokenUsageService.getLimits(req.params.id);
    res.json({ limits });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get token limits' });
  }
});

// Update token limits for a provider
router.put('/:id/token-limits/:providerId', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const { providerId } = req.params;
    const { dailyLimit, weeklyLimit, monthlyLimit, autoResetDaily, autoResetWeekly, autoResetMonthly, allowAdminBypass, notifyOwnerOnLimit, isEnabled } = req.body;

    await TokenUsageService.updateLimits(req.params.id, providerId, {
      dailyLimit,
      weeklyLimit,
      monthlyLimit,
      autoResetDaily,
      autoResetWeekly,
      autoResetMonthly,
      allowAdminBypass,
      notifyOwnerOnLimit,
      isEnabled
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update token limits' });
  }
});

// Manual reset token usage for a provider
router.post('/:id/token-limits/:providerId/reset', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const { providerId } = req.params;
    const { period } = req.body; // 'daily' | 'weekly' | 'monthly' | 'all'

    await TokenUsageService.manualReset(req.params.id, providerId, period || 'all');
    res.json({ success: true, message: `Reset ${period || 'all'} usage counter(s)` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reset token usage' });
  }
});

// Initialize provider (called from Studio when AI provider node is saved)
router.post('/:id/token-limits/init', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const { providerId, providerLabel } = req.body;
    if (!providerId || !providerLabel) {
      res.status(400).json({ error: 'providerId and providerLabel required' });
      return;
    }

    await TokenUsageService.initializeProvider(req.params.id, providerId, providerLabel);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initialize provider' });
  }
});

// ----- AI Training Mode Endpoints -----

// Get training status
router.get('/:id/training', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const status = await TrainingService.getStatus(req.params.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get training status' });
  }
});

// Start training mode
router.post('/:id/training/start', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    await TrainingService.startTraining(req.params.id);

    // Send Discord embed notifications to AI channels
    const msgIds = await BotRuntime.sendTrainingNotifications(req.params.id);
    if (Object.keys(msgIds).length > 0) {
      await TrainingService.saveNotificationMsgIds(req.params.id, msgIds);
    }

    // Add to bot logs
    BotRuntime.addBotLog(req.params.id, 'System', '🧠 Training Mode ACTIVATED - AI is now learning from conversations');

    res.json({ success: true, message: 'Training mode activated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start training' });
  }
});

// Stop training mode
router.post('/:id/training/stop', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const status = await TrainingService.getStatus(req.params.id);

    // Delete Discord embed notifications from AI channels
    const msgIds = await TrainingService.getNotificationMsgIds(req.params.id);
    if (Object.keys(msgIds).length > 0) {
      await BotRuntime.deleteTrainingNotifications(req.params.id, msgIds);
      await TrainingService.clearNotificationMsgIds(req.params.id);
    }

    await TrainingService.stopTraining(req.params.id);

    // Add to bot logs
    BotRuntime.addBotLog(req.params.id, 'System', `✅ Training Mode STOPPED - AI learned from ${status.totalExamples} examples`);

    res.json({ success: true, message: 'Training mode stopped' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to stop training' });
  }
});

// Delete all training data
router.delete('/:id/training', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    await TrainingService.deleteAllTraining(req.params.id);

    // Add to bot logs
    BotRuntime.addBotLog(req.params.id, 'System', '🗑️ Training data DELETED - AI reset to default');

    res.json({ success: true, message: 'All training data deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete training data' });
  }
});

// Get training examples (for viewing)
router.get('/:id/training/examples', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const examples = await TrainingService.getExamples(req.params.id, limit);
    res.json({ examples });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get training examples' });
  }
});

// =====================
// KNOWLEDGE BASE ROUTES
// =====================

import { KnowledgeService } from '../services/knowledge.service.js';

// Get knowledge base entries
router.get('/:id/knowledge', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const knowledge = await KnowledgeService.getKnowledge(req.params.id);
    const count = knowledge.length;
    res.json({ knowledge, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get knowledge base' });
  }
});

// Add manual knowledge entry
router.post('/:id/knowledge', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const { category, key, value } = req.body;
    if (!key || !value) {
      res.status(400).json({ error: 'Key and value are required' });
      return;
    }

    await KnowledgeService.addManualEntry(req.params.id, category || 'fact', key, value);
    res.json({ success: true, message: 'Knowledge entry added' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add knowledge entry' });
  }
});

// Delete a knowledge entry
router.delete('/:id/knowledge/:entryId', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    await KnowledgeService.deleteEntry(req.params.id, req.params.entryId);
    res.json({ success: true, message: 'Knowledge entry deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete knowledge entry' });
  }
});

export const botRoutes = router;
