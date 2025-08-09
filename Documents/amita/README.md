# amita.ai - AI Writing Analysis & Authentication Platform

**"The flaws in your writing are part of your expression—keep them that way"**

amita.ai is a full-stack web application that helps writers, students, and professionals detect AI usage in writing while preserving and developing their authentic writing voice. Built with Next.js 15.4.5, Supabase, and xAI API integration.

## 🚀 Features

- **AI Detection**: Advanced analysis to identify AI-generated content with confidence scores
- **Voice Fingerprinting**: Unique writing style analysis and pattern recognition
- **Authenticity Scoring**: Measure how human your writing appears
- **Real-time Analysis**: Instant feedback on writing samples
- **Document Upload**: Support for PDF, DOCX, and TXT file analysis
- **Progress Tracking**: Monitor improvement over time
- **Personalized Coaching**: Custom suggestions based on your writing goals
- **Secure Authentication**: Email/password login with Supabase Auth
- **Responsive Design**: Works seamlessly on desktop and mobile

## 🛠 Tech Stack

- **Frontend**: Next.js 15.4.5 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **AI Analysis**: xAI API (Grok)
- **UI Components**: Custom components with HeadlessUI
- **Icons**: Heroicons
- **Deployment**: Vercel-ready configuration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ 
- npm or yarn package manager
- Git
- A Supabase account
- An xAI API account

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd amita
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment template:

```bash
cp .env.example .env.local
```

Fill in your environment variables in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# xAI API Configuration
XAI_API_KEY=your_xai_api_key
XAI_API_URL=https://api.x.ai/v1

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Development Settings
NODE_ENV=development
```

### 4. Supabase Setup

#### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key from Settings > API
3. Copy your service role key (keep this secure!)

#### Run Database Migrations

The database schema is already set up through Supabase MCP. The following tables will be created:

- `profiles` - User profile information
- `writing_samples` - Analyzed writing samples  
- `voice_analysis` - Detailed analysis results
- `progress_tracking` - User progress metrics

#### Configure Row Level Security (RLS)

RLS policies are automatically applied to ensure users can only access their own data.

#### Set up Storage Bucket

A `documents` storage bucket is created for file uploads with appropriate security policies.

### 5. xAI API Setup

1. Create an account at [x.ai](https://x.ai)
2. Generate an API key from your dashboard
3. Add the key to your `.env.local` file

### 6. NextAuth Secret (Optional)

Generate a secure secret for NextAuth:

```bash
npx auth secret
```

Add the generated secret to your `.env.local` file.

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🗄️ Database Schema

### Core Tables

#### profiles
```sql
- id (UUID, FK to auth.users)
- full_name (TEXT)
- writing_level (ENUM: beginner, intermediate, advanced, professional)
- ai_usage_frequency (ENUM: never, rarely, sometimes, often, always)
- primary_goals (TEXT[])
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### writing_samples
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- title (TEXT)
- content (TEXT)
- file_url (TEXT)
- file_name (TEXT)
- file_type (ENUM: txt, pdf, docx)
- ai_confidence_score (DECIMAL)
- authenticity_score (DECIMAL)
- voice_fingerprint (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### voice_analysis
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- sample_id (UUID, FK to writing_samples)
- style_characteristics (JSONB)
- improvement_suggestions (TEXT[])
- ai_detected_sections (JSONB)
- overall_score (JSONB)
- created_at (TIMESTAMP)
```

#### progress_tracking
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- metric_type (ENUM: authenticity, ai_detection_risk, voice_consistency, writing_frequency)
- value (DECIMAL)
- recorded_at (TIMESTAMP)
```

## 🔐 Security Features

- **Row Level Security**: All tables protected with RLS policies
- **Authentication**: Secure email/password auth with Supabase
- **Data Isolation**: Users can only access their own data
- **Environment Variables**: Sensitive keys stored securely
- **Input Validation**: All user inputs validated and sanitized
- **File Upload Security**: Restricted file types and size limits

## 🎨 Design System

### Color Palette
- **Primary**: Blue variants for main actions
- **Secondary**: Purple variants for accents  
- **Accent**: Orange variants for highlights
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Headings**: Poppins font family
- **Body**: Inter font family

### Components
- Custom Button component with variants
- Input fields with validation states
- Card layouts for content organization
- Responsive navigation
- Loading states and animations

## 📱 Responsive Design

The application is fully responsive and works across:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - All variables from `.env.local`
4. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure these are set in your deployment environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `XAI_API_KEY`
- `XAI_API_URL`
- `NEXTAUTH_URL` (your production domain)
- `NEXTAUTH_SECRET`

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### API Testing

Test the analysis API endpoint:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text to analyze here",
    "user_id": "user-uuid",
    "title": "Test Analysis"
  }'
```

## 📝 API Documentation

### POST /api/analyze

Analyze text for AI detection and authenticity scoring.

**Request Body:**
```json
{
  "text": "Text to analyze (minimum 50 characters)",
  "user_id": "User UUID",
  "title": "Optional title for the analysis"
}
```

**Response:**
```json
{
  "ai_confidence_score": 25.5,
  "authenticity_score": 87.3,
  "voice_fingerprint": {
    "avg_sentence_length": 18,
    "vocabulary_diversity": 0.7,
    "tone_characteristics": {...}
  },
  "detected_sections": [...],
  "improvement_suggestions": [...],
  "style_analysis": {...}
}
```

### POST /api/upload

Upload and analyze documents (PDF, DOCX, TXT).

**Request:** FormData with file and user_id

## 🔍 Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env.local` is in the root directory
   - Restart the development server after changes
   - Check variable names match exactly

2. **Supabase Connection Issues**
   - Verify project URL and keys are correct
   - Check if RLS policies are properly set
   - Ensure database tables exist

3. **xAI API Errors**
   - Verify API key is valid and not expired
   - Check API quotas and rate limits
   - Ensure proper API URL format

4. **Build Errors**
   - Run `npm run type-check` to identify TypeScript issues
   - Clear `.next` folder and rebuild
   - Check for missing dependencies

### Development Tips

- Use the browser's developer tools to debug API calls
- Check Supabase dashboard for database issues
- Monitor xAI API usage in their dashboard
- Use React Developer Tools for component debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing component patterns
- Add proper error handling
- Write descriptive commit messages
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Customer Feedback**: Real user quotes and pain points integrated throughout
- **Modern Stack**: Built with the latest Next.js and React 19
- **Security First**: Comprehensive security measures
- **Performance Focused**: Optimized for fast loading and smooth interactions

## 📞 Support

For support, email support@amita.ai or create an issue in this repository.

---

**Built with ❤️ to preserve authentic human writing in the age of AI**