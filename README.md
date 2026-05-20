# AI Web Application

A small fullstack chat application built with React, Vite, Tailwind CSS, Node.js and Express.

The application allows the user to:
- have a continuous chat with an AI assistant;
- send messages through the backend to the Mistral API;
- use voice input if the browser supports Web Speech API;
- send messages with Enter and add a new line with Shift + Enter;
- see a loading indicator while the answer is being generated.

The API key is used only on the backend and is not exposed in the browser.

## Tech stack

### Frontend
- React
- Vite
- Tailwind CSS
- JavaScript

### Backend
- Node.js
- Express
- Mistral AI API
- dotenv
- cors

## Project structure

```txt
ai-web-application-mistral-chat/
  client/
    src/
      api/
        chatApi.js
      components/
        ChatComposer.jsx
        ChatMessage.jsx
        LoadingBubble.jsx
      App.jsx
      index.css
      main.jsx
    package.json
    vite.config.js

  server/
    src/
      index.js
    .env.example
    package.json
```

## How to run locally

### 1. Install frontend dependencies

```bash
cd client
npm install
npm run dev
```

By default, the frontend runs on:

```txt
http://localhost:5173
```

### 2. Install backend dependencies

Open another terminal:

```bash
cd server
npm install
npm run dev
```

By default, the backend runs on:

```txt
http://localhost:3000
```

### 3. Configure environment variables

Create a `.env` file inside the `server` folder based on `.env.example`.

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
MISTRAL_API_KEY=your_api_key_here
MISTRAL_MODEL=mistral-small-latest
```

## API endpoints

### Health check

```http
GET /api/health
```

### Send chat history to the AI assistant

```http
POST /api/chat
```

Request body:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

Response:

```json
{
  "answer": "Hello! How can I help you?"
}
```

## Notes

- The Mistral API key must be stored only in `server/.env`.
- Do not commit `.env` to GitHub.
- Voice input depends on browser support.
- The chat is stored in React state for the current session.
