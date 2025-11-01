# 🐱 Tabby - Smart Browser Assistant Features

## **1. 🛒 Smart Shopping Assistant**

**Main Goal:** Enhance online shopping with intelligent comparisons, insights, and recommendations.

### **Sub-features:**

#### **Current Product Analysis**
- Auto-detect product details (name, price, specs, category) on shopping sites
- AI-powered product summarization using Chrome's built-in Summarizer API
- Pros/Cons extraction from product descriptions
- Product image detection and storage
- Chat with AI about the current product
- Follow-up question suggestions

#### **Shopping Cart**
- Add products to cart for comparison
- Quantity management
- Total price calculation
- Visit count tracking (how many times you've viewed a product)
- Quick access to product pages
- Remove items from cart

#### **Viewed Products History**
- **E-commerce Products**: Track all products viewed across shopping sites
- **YouTube Product Reviews**: Automatically detect and link product reviews from YouTube
- Product-to-review linking (connect YouTube reviews with e-commerce products)
- Filter and search past products
- Category-based organization
- Time-based sorting

#### **Product Insights**
- Related product recommendations from browsing history
- Cross-site comparison (view similar products across different retailers)
- Smart recommendations based on your preferences

---

## **2. 🧠 AI Search History**

**Main Goal:** Make it easy to rediscover past content using natural language or visual recall.

### **Sub-features:**

#### **Natural Language Search**
- AI-powered semantic search using queries like "Show me the Dribbble design with a pink dashboard"
- Relevance scoring for search results
- Match reason explanations (why a result was returned)

#### **Content Indexing**
- Automatic page summarization
- Auto-tagging of visited pages
- Image extraction and storage
- Full-text content storage
- Domain and URL tracking

#### **Search Results**
- High-confidence vs low-confidence result separation
- Preview images for visited pages
- Metadata display (domain, timestamp, tags)
- Quick access to original URLs
- Copy URL functionality
- Site favicon display

#### **Smart Filtering**
- Text-based filtering for non-AI searches
- Recent history view (last 50 visits)
- Time-based sorting

---

## **3. 📊 Browsing Stats & Analytics**

**Main Goal:** Help users understand their browsing habits and maintain balance between focus and leisure.

### **Sub-features:**

#### **Weekly Comparison Analytics**
- Current week vs previous week comparison
- Percentage change tracking (time spent, visits, productivity)
- Trend indicators (up/down arrows)

#### **Category-Based Tracking**
- Automatic site categorization (Development, Shopping, Social Media, News, Entertainment, etc.)
- Time spent per category
- Visit count per category
- Top 3 domains per category
- Color-coded category visualization

#### **Interactive Visualizations**
- **Pie Chart**: Category distribution with time spent
- **Segmented Progress Bar**: Visual category breakdown
- **Daily Activity Bar Chart**: 7-day breakdown showing time per category per day
- Interactive tooltips with detailed breakdowns

#### **Week Insights**
- **Productivity Score**: Percentage of time spent on productive categories
- **Trending Up**: Fastest-growing category this week
- **Trending Down**: Most declining category
- Productivity change tracking

#### **Top Sites Analysis**
- Most visited sites (ranked by visit count)
- Time spent per site
- Category association for each site
- Visual ranking indicators

#### **Enhanced Tooltips**
- Category-specific site breakdowns
- "Other" category expansion (shows all lumped categories)
- Color-coded dots matching chart colors
- Time spent key-value pairs

---

## **🔧 Background Features (Supporting Infrastructure)**

- **Automatic Content Extraction**: Background script extracts page content automatically
- **Site Categorization**: AI-powered categorization of websites
- **Chrome Prompt API Integration**: Local AI for privacy-focused processing
- **Storage Management**: Efficient Chrome storage usage for products, visits, and categories
- **Real-time Sync**: Live updates across panels when data changes
