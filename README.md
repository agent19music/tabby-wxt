# 🐱 Tabby - Smart Browser Assistant

A Chrome extension that transforms your browsing experience with AI-powered insights, smart shopping assistance, and intelligent habit tracking.

## 🎯 Problem We're Solving

Modern web browsing generates tons of data, but users struggle to:

- Understand their browsing habits and maintain focus
- Rediscover content they viewed weeks ago
- Make informed shopping decisions across multiple sites
- Get meaningful insights from their digital behavior

Tabby solves these problems by turning your browsing data into actionable intelligence.

## ✨ Core Features

### 1. 📊 Weekly & Daily Stats

**Goal**: Help users understand their browsing habits and maintain balance between focus and leisure.

- **Time Tracking**: Automatically categorizes time spent on Work, Study, Shopping, Entertainment, etc.
- **Weekly Summaries**: Shows most visited sites and top activities with insights like "You spent 5 hours researching design tools"
- **Focus Goals**: Set personal goals and get gentle reminders when off-track
- **Habit Insights**: Track patterns like "You switched from Study mode to social media 3 times today"

### 2. 🧠 AI Search History

**Goal**: Make it easy to rediscover past content using natural language or image-based recall.

- **Natural Language Search**: Find content with queries like "Show me the Dribbble design with a pink dashboard" or "Find that fridge I saw last night"
- **Visual Recall**: AI recognizes and describes images from past pages
- **Smart Summarization**: Auto-tags and summarizes visited pages
- **Topic Grouping**: Organizes content by themes (design tools, productivity, electronics)

### 3. 🛒 Smart Shopping Assistant

**Goal**: Enhance online shopping with intelligent comparisons, insights, and recommendations.

- **Product Detection**: Automatically identifies product details (name, specs, price) on shopping sites
- **Cross-Site Comparison**: Compares items viewed across multiple retailers
- **Plain Language Explanations**: Simplifies complex product descriptions
- **Smart Recommendations**: Suggests better or similar products from your browsing history
- **Price Tracking**: Monitors price changes for products you've viewed

## 🏗️ Technical Architecture

### Frontend

- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **WXT Framework** for Chrome extension development
- **Radix UI** for accessible components

### Browser APIs

- **Chrome Side Panel API** for expanded interface
- **Chrome Storage API** for data persistence
- **Chrome History API** for browsing data
- **Chrome Tabs API** for active tab monitoring

### AI Integration

- **Gemini API** for natural language processing and content analysis
- **Nano API** for product information and comparisons
- **Local ML** for privacy-focused content categorization

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Chrome Browser (for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tabby-wxt

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Create extension zip
npm run zip
```

### Development

1. Run `npm run dev` to start the development server
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `.output/chrome-mv3` folder

## 📁 Project Structure

## 🎨 User Experience

### Main Interface

- **Popup**: Quick access with three main buttons (Shopping, AI Search, Stats)
- **Side Panel**: Expanded interface for detailed interactions

### Shopping Flow

1. **Current Product Tab**: Analyzes the current product page, shows related items from your history
2. **Past Products Tab**: Displays grouped categories of previously viewed items
3. **Comparisons**: Side-by-side product comparisons with AI insights

### AI Search Flow

1. **Natural Language Input**: Type what you remember about the content
2. **Smart Results**: AI matches your description to browsing history
3. **Visual Context**: Shows page screenshots and content summaries

### Stats Dashboard

1. **Daily Overview**: Today's browsing breakdown by category
2. **Weekly Trends**: Patterns and insights over the past week
3. **Focus Metrics**: Time in productive vs. leisure activities

## 🔒 Privacy & Data

- **Local Storage**: All browsing data stays on your device
- **No Tracking**: We don't collect or transmit personal browsing data
- **API Calls**: Only product details and content summaries are sent to AI services
- **User Control**: Complete control over data retention and deletion

## 🛣️ Roadmap

### Phase 1 (Current)

- [x] Basic project setup
- [ ] Three-button popup interface
- [ ] Side panel framework
- [ ] Basic shopping detection

### Phase 2

- [ ] AI search history implementation
- [ ] Weekly stats dashboard
- [ ] Product comparison engine

### Phase 3

- [ ] Advanced AI insights
- [ ] Cross-browser compatibility
- [ ] Export/import functionality

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [WXT Framework](https://wxt.dev/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide React](https://lucide.dev/)

---

**Tabby** - Making your browsing smarter, one tab at a time 🐱
