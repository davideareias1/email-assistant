# Gmail AI Response Generator

A Chrome extension that helps you generate smart email responses using AI. The extension integrates with Gmail and uses OpenRouter's Gemini Pro model to generate contextually appropriate responses to your emails.

## Features

- Seamless Gmail integration
- One-click response generation
- Professional and contextual responses
- Simple and modern interface
- Secure API key management

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing the extension files

## Setup

1. Sign up for an account at [OpenRouter](https://openrouter.ai/)
2. Get your API key from the OpenRouter dashboard
3. Click the extension icon in Chrome
4. Enter your OpenRouter API key in the settings
5. Click "Save Settings"

## Usage

1. Open Gmail in Chrome
2. Open an email you want to respond to
3. Click "Reply" or "Compose"
4. Look for the "Generate Response" button in the Gmail compose toolbar
5. Click the button to generate an AI-powered response
6. Edit the generated response as needed before sending

## Security

- Your OpenRouter API key is stored securely in Chrome's storage
- No email content is stored or logged
- All API calls are made directly to OpenRouter with proper security headers

## Development

The extension is built using vanilla JavaScript and follows Chrome's Manifest V3 guidelines. The main components are:

- `manifest.json`: Extension configuration
- `popup.html/js`: Extension popup interface
- `content.js`: Gmail integration and response generation
- `styles.css`: UI styling

## Contributing

Feel free to submit issues and pull requests to improve the extension.

## License

MIT License - feel free to use and modify as needed. 