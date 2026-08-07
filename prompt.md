I want to build a premium AI assistant for my portfolio called "TJ Assistant".

IMPORTANT:
I DO NOT want to use OpenAI, Gemini, Claude, Chrome Built-in AI, window.ai, or any external API.

I also DO NOT want any backend.

Everything must work completely inside the browser using JavaScript.

The assistant should feel like ChatGPT but should actually answer questions using the content already present in my portfolio.

===================================================
GOAL
===================================================

Build a conversational assistant that can answer questions about me.

Examples:

"What projects have you worked on?"

"Tell me about your Kafka experience."

"What backend technologies do you know?"

"What databases have you used?"

"Do you have experience with AWS?"

"Tell me about your work at Dhan AI."

"What microservices have you built?"

"How can I contact you?"

"What are your strongest skills?"

"What makes you different?"

The assistant should understand these questions naturally.

It should not rely on exact keyword matching.

===================================================
ARCHITECTURE
===================================================

Instead of using an LLM:

1. Extract all portfolio content into a structured JSON knowledge base.

Example:

knowledge.json

{
  "about": "...",
  "experience":[...],
  "projects":[...],
  "skills":[...],
  "education":[...],
  "contact":[...]
}

This should become the source of truth.

===================================================
SEARCH ENGINE
===================================================

Implement semantic search.

Use Fuse.js or MiniSearch.

Do NOT use simple string matching.

Requirements:

- fuzzy search
- typo tolerance
- partial matching
- ranking
- multiple results
- confidence score

Example:

User:

"kafk"

Should still match

Kafka

Example:

"user portal"

Should match

Customer Self Service Portal

===================================================
ANSWER ENGINE
===================================================

Build an Answer Engine.

It should:

Search knowledge

↓

Find top matching sections

↓

Merge results

↓

Generate a natural sounding answer

The answer should feel conversational.

Example:

Question:

"What backend technologies do you know?"

Instead of returning JSON

Respond like:

"I primarily specialize in backend development using Node.js, TypeScript, GraphQL and Spring Boot. I have extensive experience building distributed microservices, Kafka-based event systems, REST APIs and scalable backend architectures."

Another example:

"What projects have you worked on?"

Return a summary followed by bullets.

===================================================
PERSONALITY
===================================================

The assistant is called TJ Assistant.

It represents Sai Teja.

Tone:

Professional

Friendly

Concise

Confident

Technical

Never invent information.

Never hallucinate.

If information isn't found:

"I couldn't find that information in Sai Teja's portfolio. Feel free to ask something about his projects, experience, skills or contact information."

===================================================
SUGGESTED QUESTIONS
===================================================

When opened show

Hello 👋

I'm TJ Assistant.

Ask me anything about Sai Teja.

Buttons

• Projects

• Experience

• Skills

• Contact

• Resume

===================================================
CHAT WINDOW
===================================================

Design a premium floating chatbot.

Bottom right.

Modern glassmorphism.

Rounded corners.

Smooth animations.

Dark theme.

Features:

Auto scrolling

Typing indicator

Message timestamps

Enter to send

Shift+Enter for newline

Markdown support

Code block support

Copy button for code

Mobile responsive

Close button

Open animation

Thinking animation

===================================================
CHAT EXPERIENCE
===================================================

Messages should appear like ChatGPT.

User bubble

↓

Assistant typing

↓

Assistant answer

Typing indicator:

TJ is thinking...

===================================================
SMART FEATURES
===================================================

Support follow-up questions.

Example:

User:

Tell me about Kafka.

Assistant:

...

User:

Which project used it?

The assistant should understand "it" refers to Kafka.

Maintain conversation history.

===================================================
CONTEXT MEMORY
===================================================

Remember previous conversation.

Store only current session.

No backend.

===================================================
SEARCH RANKING
===================================================

Search across

About

Projects

Experience

Skills

Blogs

Resume

Education

Contact

Certifications

Rank by relevance.

===================================================
SOURCES
===================================================

At the bottom of every answer show

Source:

✓ Projects

✓ Experience

✓ Skills

Clicking the source should scroll the portfolio to that section.

===================================================
UI ENHANCEMENTS
===================================================

When answering

"What projects?"

Show beautiful project cards.

When answering

"Skills"

Show badges.

When answering

"Experience"

Show timeline cards.

When answering

"Contact"

Show contact buttons.

===================================================
NO HARD CODED IF ELSE
===================================================

Avoid

if(question.includes("kafka"))

Instead build a reusable search engine.

===================================================
FILE STRUCTURE
===================================================

Create

/assets

knowledge.json

/js

assistant.js

search.js

chat.js

knowledge.js

ui.js

/styles

assistant.css

Everything modular.

===================================================
PERFORMANCE
===================================================

Load knowledge once.

Index once.

Search instantly.

No noticeable lag.

===================================================
BONUS FEATURES
===================================================

Add

Conversation suggestions

Recent questions

Quick actions

Animated typing

Highlight matched terms

Streaming responses (character-by-character typing)

Search confidence

Dark/light mode support

Accessibility

Keyboard navigation

===================================================
CODE QUALITY
===================================================

Write production-quality code.

Use ES modules.

Well documented.

No global variables.

No jQuery.

Modern JavaScript only.

===================================================
EXPECTED RESULT
===================================================

The final experience should feel very similar to ChatGPT, but it should be powered entirely by semantic search over my portfolio content without using any LLM or external AI service.