# EduVerse Unified Platform

A comprehensive AI-powered educational platform that combines intelligent tutoring with real-time classroom capture capabilities. EduVerse integrates two powerful systems into a seamless learning experience.

## 🚀 Overview

EduVerse is the unified platform that brings together:

1. **AI Tutor System** - Transform static content (PDFs, videos, topics) into interactive learning experiences
2. **Classroom Whisperer** - Real-time lecture transcription, analysis, and smart note generation

### Key Features

- **📚 Multi-Source Learning**: Process PDFs, YouTube videos, or any topic into structured learning materials
- **🎤 Live Lecture Capture**: Real-time transcription and AI-powered analysis of classroom sessions
- **🧠 Adaptive Learning**: Personalized quiz cycles that identify and target weak areas
- **🗣️ Voice Tutoring**: Conversational AI tutoring with speech-to-speech interaction
- **📊 Learning Analytics**: Comprehensive performance tracking and insights
- **💾 Persistent Storage**: All projects and materials saved to Supabase database
- **🔐 User Management**: Full authentication and profile management

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI**: Google Gemini API (multiple models)
- **State Management**: Zustand with persistence
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Build Tool**: Vite

### Project Structure

```
eduverse-unified/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI elements
│   │   ├── tutor/          # AI Tutor components
│   │   └── lecture/        # Lecture capture components
│   ├── pages/              # Main application pages
│   ├── services/           # API and business logic
│   │   ├── geminiService.ts    # AI service layer
│   │   └── databaseService.ts  # Database operations
│   ├── stores/             # Zustand state management
│   ├── types/              # TypeScript type definitions
│   └── lib/                # Utility libraries
├── database/               # Database schema and migrations
└── docs/                   # Documentation
```

## 🔄 Unified Workflow

### 1. Project Creation
Users start by creating a learning project, which serves as a container for all related materials and activities.

### 2. Content Input
Multiple ways to add learning content:
- **Upload PDFs**: Extract and process document content
- **YouTube URLs**: Transcribe and analyze video content
- **Topic Search**: AI-generated content with web search
- **Live Lectures**: Real-time capture and processing

### 3. Learning Materials Generation
AI automatically creates:
- Structured summaries
- Interactive flashcards
- Adaptive quizzes
- Presentation slides
- Deep-dive explanations
- Organized notes and concepts

### 4. Interactive Learning
- Take quizzes with adaptive feedback
- Engage with voice tutors
- Participate in verbal testing
- Chat with lecture content

### 5. Performance Analytics
- Track learning progress
- Identify weak areas
- Get personalized recommendations
- View improvement over time

## 🎯 Integration Benefits

### Seamless Data Flow
- Lecture content automatically becomes study material
- Cross-reference between live sessions and uploaded content
- Unified search across all project materials

### Contextual AI Tutoring
- Voice tutor has access to both static and live content
- Personalized conversations based on complete learning history
- Targeted help for specific lecture topics

### Comprehensive Analytics
- Combined insights from quizzes, lectures, and voice sessions
- Holistic view of learning patterns
- Intelligent content recommendations

## 📊 Database Schema

### Core Entities

- **Users/Profiles**: User management and preferences
- **Projects**: Learning project containers
- **Content Sources**: PDFs, videos, topics, lectures
- **Learning Materials**: Generated flashcards, quizzes, summaries
- **Lecture Sessions**: Live recordings and transcripts
- **Assessment Results**: Quiz and test performance
- **Voice Sessions**: Tutoring conversation logs
- **Learning Analytics**: Performance metrics and insights

### Data Relationships

```
User → Projects → Content Sources → Learning Materials
     → Projects → Lecture Sessions → Chat Messages
     → Assessment Results
     → Voice Sessions
     → Learning Analytics
```

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Gemini API key

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd eduverse-unified
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env.local
```

Fill in your environment variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key

3. **Database Setup**
```bash
# Run the schema.sql in your Supabase SQL editor
# Create storage buckets: 'lecture-audio', 'project-files', 'avatars'
```

4. **Start Development**
```bash
npm run dev
```

### Supabase Configuration

1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql`
3. Create storage buckets:
   - `lecture-audio` (for lecture recordings)
   - `project-files` (for uploaded PDFs)
   - `avatars` (for user profile pictures)
4. Configure Row Level Security policies (included in schema)

## 🎮 Usage Guide

### Creating Your First Project

1. **Sign Up/Login**: Create account or sign in
2. **New Project**: Click "New Project" and provide title/description
3. **Add Content**: Upload a PDF or enter a topic
4. **Generate Materials**: Use the Study Zone to create flashcards, quizzes, etc.
5. **Record Lectures**: Use "Start Recording" to capture live content
6. **Learn & Assess**: Take quizzes, chat with AI tutor, review analytics

### Advanced Features

- **Adaptive Quizzes**: Take initial quiz → get analysis → targeted remediation
- **Voice Tutoring**: Speak with AI tutor about any content in your project
- **Lecture Integration**: Recorded lectures become searchable, interactive content
- **Cross-Content Learning**: Ask questions that span multiple sources

## 🔮 Future Enhancements

### Phase 1 Extensions
- **Mobile App**: React Native companion app
- **Chrome Extension**: Capture web content directly
- **Collaboration**: Shared projects and group study
- **Advanced Analytics**: Machine learning insights

### Phase 2 Features
- **Instructor Dashboard**: Teacher tools and classroom management
- **Content Marketplace**: Share and discover learning materials
- **Integration APIs**: Connect with LMS platforms
- **Offline Mode**: Study without internet connection

## 🛠️ Development

### Key Services

- **geminiService.ts**: All AI operations (text generation, analysis, voice)
- **databaseService.ts**: CRUD operations for all entities
- **authStore.ts**: User authentication state
- **projectStore.ts**: Project and content state management

### Adding New Features

1. Define types in `src/types/index.ts`
2. Add database operations in `databaseService.ts`
3. Create UI components in appropriate subdirectory
4. Implement business logic in services
5. Update state management if needed

### Testing Strategy

- **Unit Tests**: Service layer functions
- **Integration Tests**: Database operations
- **E2E Tests**: Complete user workflows
- **Performance Tests**: AI response times and large content handling

## 📈 Performance Considerations

- **Chunked Processing**: Large content processed in segments
- **Caching**: Frequent AI responses cached in database
- **Lazy Loading**: Components and data loaded on demand
- **Optimistic Updates**: Immediate UI feedback with background sync

## 🔒 Security & Privacy

- **Row Level Security**: Database access controlled per user
- **API Key Security**: Environment variables only
- **Data Encryption**: All storage encrypted at rest
- **GDPR Compliance**: User data deletion and export

## 📞 Support & Contributing

For questions, bug reports, or feature requests, please create an issue in the repository.

### Contributing Guidelines

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request with detailed description

---

**EduVerse - Transforming Education with AI** 🚀