import { EMAIL_SYSTEM_PROMPT } from '@/lib/emailPrompt';
import { NextRequest, NextResponse } from 'next/server';

// Set the allowed origin to Gmail only
const allowedOrigin = "https://mail.google.com";
const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-extension-secret'
};

// Handle preflight (OPTIONS) request
export async function OPTIONS() {
    return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    // Optional: Ensure the request really comes from Gmail using the referer header
    const referer = req.headers.get('referer') || '';
    if (!referer.includes('mail.google.com')) {
        return NextResponse.json(
            { error: 'Access not allowed' },
            { status: 401, headers: corsHeaders }
        );
    }

    // Verify the custom header (make sure EXTENSION_SECRET is set in your .env file)
    const extensionSecret = req.headers.get('x-extension-secret');
    if (extensionSecret !== process.env.EXTENSION_SECRET) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: corsHeaders }
        );
    }

    const { emailContent, recipientInfo, senderInfo } = await req.json();
    if (!emailContent) {
        return NextResponse.json(
            { error: 'Missing required field: emailContent' },
            { status: 400, headers: corsHeaders }
        );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'API key not configured in environment variables' },
            { status: 500, headers: corsHeaders }
        );
    }

    const contextInfo = `
    ${recipientInfo ? `The email recipient's name is ${recipientInfo.fullName} (first name: ${recipientInfo.firstName}).` : "The recipient's name could not be determined."}
    ${senderInfo ? `Your name is ${senderInfo.fullName} (first name: ${senderInfo.firstName}, last name: ${senderInfo.lastName}).` : "Your name could not be determined, so sign off naturally without a name."}
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
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error (${response.status})`);
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });
} 