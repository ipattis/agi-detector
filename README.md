# AGI Detector 🔍

[![Build Status](https://img.shields.io/badge/build-in%20progress-yellow)](https://github.com/bencium/agi-detector)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A real-time monitoring system to detect early signs of emerging artificial general intelligence by tracking and analyzing research publications, breakthroughs, and developments across major AI research organizations.

## 🎯 Project Vision

Monitor and analyze the AI research landscape to detect potential indicators of AGI emergence through automated data collection, pattern recognition, and trend analysis.

## 🚀 Current Features

- **Research Blog Monitoring**: 
  - Real-time crawling of major AI research blogs (OpenAI, DeepMind, Anthropic, Microsoft AI)
  - RSS feed integration with HTML fallback
  - Automated content extraction and analysis
  
- **Data Collection**:
  - Structured article storage with metadata
  - Source tracking and verification
  - Rate-limited and respectful crawling
  
- **User Interface**:
  - Clean, modern React-based dashboard
  - Real-time crawl status updates
  - Article browsing and filtering
  - Manual and scheduled crawl controls

## 🏗️ Project Status

Currently in active development with core crawling infrastructure implemented.

### Tech Stack
- **Frontend**: Next.js 14, React 19, TypeScript
- **Data Collection**: Custom crawler with Cheerio
- **Testing**: Jest with React Testing Library
- **Styling**: TailwindCSS
- **API**: Next.js API Routes
- **Database**: Prisma ORM

## 📚 Documentation

- [Specification](docs/Specification.md) - Project requirements and goals
- [Architecture](docs/Architecture.md) - System design and components
- [API Documentation](docs/API.md) - API endpoints and usage

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/bencium/agi-detector.git
cd agi-detector
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Run the development server:
```bash
npm run dev
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built using Next.js and React
- Inspired by the SPARC framework
- Thanks to all contributors
