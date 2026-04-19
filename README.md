# Ollama Local WebUI

A modern, responsive web interface for interacting with [Ollama](https://ollama.ai) — a tool for running large language models locally on your machine.

![Ollama WebUI](https://img.shields.io/badge/Ollama-Local%20LLM%20Interface-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Features

- **Multi-Chat Support**: Manage multiple conversations simultaneously with persistent storage
- **Model Selection**: Easy model switching from available Ollama models
- **Advanced Settings Panel**: Fine-tune model behavior with configurable parameters:
  - **Temperature**: Control creativity/randomness (0-2)
  - **Top P**: Nucleus sampling for focused/diverse responses
  - **Top K**: Limit candidate tokens per step
  - **Max Tokens**: Set maximum response length (unlimited support)
- **Real-time Streaming**: Stream responses from Ollama for faster feedback
- **Markdown Rendering**: Beautiful formatting for code blocks, lists, and text
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Local Persistence**: All chats and settings saved to browser's LocalStorage
- **Dark Theme**: Modern, easy-on-the-eyes dark UI with glassmorphism design

## 🚀 Quick Start

### Prerequisites
- [Ollama](https://ollama.ai) installed and running locally
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. **Clone the repository** (or download the files):
   ```bash
   git clone https://github.com/yourusername/Ollama-WebUI.git
   cd Ollama-WebUI
   ```

2. **Start Ollama** (if not already running):
   ```bash
   ollama serve
   ```
   By default, Ollama runs on `http://localhost:11434`

3. **Open the application**:
   - Open `index.html` in your web browser directly, or
   - Serve it locally using any HTTP server:
     ```bash
     python -m http.server 8000
     # Visit http://localhost:8000
     ```

## 📝 Usage

### Creating a Chat
1. Click **"New Chat"** button in the sidebar to start a new conversation
2. Type your message in the input field at the bottom
3. Press **Enter** or click the send button

### Selecting a Model
1. Click the **"Loading models..."** button in the header
2. Choose from available Ollama models in the modal
3. Click **"Save"** to confirm

### Configuring Settings
1. Click the **Settings** icon (⚙️) in the top right
2. Adjust the parameters:
   - **Temperature**: Higher values (closer to 2) make responses more creative; lower values (closer to 0) make them more deterministic
   - **Top P**: Controls diversity through nucleus sampling (recommended: 0.5-0.9)
   - **Top K**: Limits token selection per step (recommended: 20-40)
   - **Max Tokens**: Maximum length of generated responses (use -1 for unlimited)
3. Click **"Save"** to apply

### Managing Chats
- **View chat**: Click any chat in the sidebar
- **Rename chat**: Right-click or long-press a chat name
- **Delete chat**: Swipe or click the delete icon
- **Clear all**: Use "Clear all chats" button at bottom of sidebar

## ⚙️ Configuration

All settings are stored in the browser's LocalStorage:
- `ollama_chats_v2`: Chat history
- `ollama_current_chat_v2`: Currently active chat ID
- `ollama_settings`: Model generation settings

### Ollama API Endpoint
The default API endpoint is `http://localhost:11434`. To modify it, edit the API calls in `script.js`:
```javascript
const OLLAMA_API = 'http://localhost:11434';
```

## 🎨 Technologies Used

- **Frontend Framework**: Vanilla JavaScript (ES6+)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Markdown Parser**: [Marked.js](https://marked.js.org)
- **Backend**: [Ollama](https://ollama.ai) (local LLM inference)
- **Storage**: Browser LocalStorage API

## 📁 Project Structure

```
Ollama-WebUI/
├── index.html       # Main HTML structure
├── script.js        # Application logic & API calls
├── styles.css       # Custom CSS & animations
└── README.md        # This file
```

## 🔧 How It Works

1. **Initialization**: On load, the app fetches available models from Ollama API
2. **Chat Management**: Each conversation is stored with ID, name, and message history
3. **Message Streaming**: User messages are sent to Ollama, responses stream back in real-time
4. **Rendering**: Markdown responses are parsed and rendered with syntax highlighting
5. **Persistence**: All data automatically saves to LocalStorage on changes

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Models not loading** | Ensure Ollama is running: `ollama serve` |
| **"Failed to fetch"** errors | Check CORS settings or run Ollama with `--cors=*` |
| **Responses are cut short** | Increase "Max Tokens" in settings (default was 128) |
| **No response from model** | Verify model is installed: `ollama list` |
| **LocalStorage errors** | Clear browser cache or disable private browsing mode |

## 🎯 Future Enhancements

- [ ] Export chat history (JSON, PDF)
- [ ] Import previous chats
- [ ] System prompts & custom instructions
- [ ] Token counting & cost estimation
- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] Chat search functionality
- [ ] Model fine-tuning UI

## 📄 License

MIT License — Feel free to use, modify, and distribute this project.

## 🙏 Credits

Built with ❤️ for the Ollama community. Special thanks to [Ollama](https://ollama.ai) for making local LLMs accessible.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📞 Support

For issues related to Ollama itself, visit: https://github.com/ollama/ollama

For issues with this WebUI, please open an issue in this repository.

---

**Happy chatting! 🚀**
