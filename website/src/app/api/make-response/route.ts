import { EMAIL_SYSTEM_PROMPT } from '@/app/lib/prompts/emailPrompt';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { emailContent, apiKey, recipientInfo, senderInfo } = await req.json();

        if (!emailContent || !apiKey) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const contextInfo = `
      ${recipientInfo ? `The email recipient's name is ${recipientInfo.fullName} (first name: ${recipientInfo.firstName}).` : 'The recipient\'s name could not be determined.'}
      ${senderInfo ? `Your name is ${senderInfo.fullName} (first name: ${senderInfo.firstName}, last name: ${senderInfo.lastName}).` : 'Your name could not be determined, so sign off naturally without a name.'}
      Please detect the language of the email and respond in the same language with appropriate formality and cultural considerations.
    `;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Gmail AI Response Generator'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
                messages: [
                    { role: 'system', content: EMAIL_SYSTEM_PROMPT },
                    { role: 'user', content: `${contextInfo}\n\nPlease generate a response to this email:\n\n${emailContent}` }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `API error (${response.status})`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error generating response:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error occurred' },
            { status: 500 }
        );
    }
} 