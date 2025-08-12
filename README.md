#  Data Alchemist (by Sagnik Chowdhury)

> **Transform your raw data into intelligent insights with AI-powered analysis**

Data Alchemist is a sophisticated web application that combines advanced data validation, AI-powered analysis, and intelligent business rule management to help organizations optimize their workforce allocation and task management processes.

##  Screenshots

### Smart Data Analytics & Insights Dashboard (Special feature!!)
![Data Analytics Dashboard](./screenshots/analytics-dashboard.png)
*AI-powered insights with real-time bottleneck detection and optimization recommendations*


##  Key Features

###  **Smart Data Analytics & Insights** *Special Feature*
- **AI-Powered Analysis**: Generate intelligent insights from your data using Google's Gemini AI
- **Bottleneck Detection**: Automatically identify workflow bottlenecks and capacity issues
- **Optimization Recommendations**: Get actionable suggestions to improve efficiency
- **Risk Assessment**: Proactive identification of potential risks and mitigation strategies
- **Interactive Dashboard**: Beautiful, collapsible sections with real-time statistics

###  **Multi-Format Data Support**
- **CSV & Excel Import**: Support for `.csv` and `.xlsx` file formats
- **Real-time Validation**: Instant data quality checks and error reporting
- **Data Grid Editing**: In-place editing with live validation
- **Export Capabilities**: Generate configuration files and reports

###  **AI-Powered Features**
- **Natural Language Queries**: Ask questions about your data in plain English
- **Intelligent Rule Generation**: Convert natural language descriptions to business rules
- **Auto Error Correction**: AI suggests fixes for data quality issues
- **Data Modification**: Modify data using natural language instructions

###  **Business Rules Engine**
- **Multiple Rule Types**: Support for co-run, slot-restriction, load-limit, and more
- **Visual Rule Builder**: Interactive forms for creating complex business rules
- **Rule Recommendations**: AI-suggested rules based on data patterns
- **Conflict Detection**: Automatic identification of conflicting rules

###  **Advanced Prioritization**
- **Multi-Criteria Optimization**: Balance multiple objectives simultaneously
- **Preset Profiles**: Quick setup with predefined optimization strategies
- **Real-time Adjustments**: Dynamic weight adjustments with instant feedback
- **Custom Weightings**: Fine-tune prioritization based on business needs

##  Architecture

### Core Components
- **Frontend**: React 19 with TypeScript for type-safe development
- **UI Framework**: Material-UI with custom dark theme
- **Data Processing**: Advanced CSV/Excel parsing with validation
- **AI Integration**: Google Gemini AI for intelligent analysis
- **State Management**: React hooks with optimized re-rendering

### Data Models
- **Client Management**: Priority-based client data with JSON attributes
- **Worker Allocation**: Skill-based worker management with capacity planning
- **Task Scheduling**: Duration-aware task scheduling with concurrency controls
- **Validation Engine**: Comprehensive data quality assurance

##  Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/data-alchemist.git
   cd data-alchemist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   echo "GOOGLE_API_KEY=your_google_ai_api_key_here" > .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

##  Usage Guide

### 1. **Data Upload**
- Drag and drop CSV/Excel files or use the file picker
- Supported formats: Clients, Workers, Tasks data
- Real-time validation with detailed error reporting

### 2. **AI Analytics** 
- Click "Generate Smart Insights" to analyze your data
- Review key insights, bottlenecks, and opportunities
- Explore risk alerts and mitigation strategies

### 3. **Natural Language Queries**
- Ask questions like "How many high-priority clients do we have?"
- Get instant answers across all your datasets

### 4. **Business Rules**
- Create rules using the visual builder or natural language
- Set up co-run requirements, load limits, and slot restrictions
- Get AI-powered rule recommendations

### 5. **Prioritization**
- Configure optimization weights for different criteria
- Use preset profiles or create custom configurations
- Balance client satisfaction with operational efficiency

##  Sample Data

Get started quickly with our sample datasets:
- [Sample Clients Data](https://docs.google.com/spreadsheets/d/1L5zQg_jzD8fP_zD_vL_Wh_example/edit)
- [Sample Workers Data](https://docs.google.com/spreadsheets/d/17Bp_W3u8Ff_keX9EYbx9xE14UolDmsAVyD4u3hzkuI8/edit)
- [Sample Tasks Data](https://docs.google.com/spreadsheets/d/1example_tasks_data/edit)

##  Configuration

### Environment Variables
```bash
GOOGLE_API_KEY=your_google_gemini_api_key
NODE_ENV=development
```

### Data Schema
The application expects specific column structures:

**Clients**: `ClientID`, `ClientName`, `PriorityLevel`, `RequestedTaskIDs`, `GroupTag`, `AttributesJSON`

**Workers**: `WorkerID`, `WorkerName`, `Skills`, `AvailableSlots`, `MaxLoadPerPhase`, `WorkerGroup`, `QualificationLevel`

**Tasks**: `TaskID`, `TaskName`, `Category`, `Duration`, `RequiredSkills`, `PreferredPhases`, `MaxConcurrent`

##  Built With

- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Material-UI** - Professional UI components
- **Google Gemini AI** - Advanced AI capabilities
- **Papa Parse** - Robust CSV parsing
- **XLSX** - Excel file processing
- **React Toastify** - User notifications

##  Performance Features

- **Optimized Rendering**: Smart re-rendering with React optimization
- **Type Safety**: Comprehensive TypeScript coverage (0 any types!)
- **Error Boundaries**: Graceful error handling throughout
- **Memory Efficient**: Optimized data processing for large datasets
- **Responsive Design**: Mobile-friendly interface

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


---

