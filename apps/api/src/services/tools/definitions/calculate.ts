import { evaluate } from 'mathjs';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const calculate: ToolDefinition = {
    name: 'calculate',
    description: 'Evaluate mathematical expressions. Supports: +, -, *, /, ^, sqrt, sin, cos, tan, log, abs, round, floor, ceil, pi, e, and more.',
    category: 'utility',
    parameters: {
        expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "sin(pi/2)", "5^3")',
            required: true
        }
    },
    handler: async ({ expression }: { expression: string }) => {
        console.log(`[Tool:calculate] Evaluating: ${expression}`);
        try {
            const result = evaluate(expression);
            console.log(`[Tool:calculate] Result: ${result}`);
            return JSON.stringify({
                expression: expression,
                result: result.toString(),
                type: typeof result
            });
        } catch (error: any) {
            console.error(`[Tool:calculate] Error:`, error.message);
            return `Calculation error: ${error.message}. Make sure the expression is valid.`;
        }
    }
};

ToolRegistry.register(calculate);
export default calculate;
